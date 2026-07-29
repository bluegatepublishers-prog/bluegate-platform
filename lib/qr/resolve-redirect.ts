import {
  BookContentTargetType,
  QrAccessAudience,
  QrDestinationType,
  QrStatus,
  ResourceAudience,
  UserRole,
} from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  normalizeApprovedExternalUrl,
  normalizeInternalRoute,
  QrDestinationPolicyError,
  safeResourceDestination,
} from "@/lib/qr/destination-policy";
import { normalizeQrPublicCode } from "@/lib/qr/public-code";

type RedirectFailure = {
  status: number;
  message: string;
  retryAfter?: string;
};

const qrResolutionSelect = {
  id: true,
  publisherId: true,
  bookId: true,
  targetType: true,
  status: true,
  audience: true,
  qrEligible: true,
  activatesAt: true,
  expiresAt: true,
  publisher: {
    select: {
      active: true,
    },
  },
  book: {
    select: {
      publisherId: true,
      archived: true,
    },
  },
  part: { select: { bookId: true, archived: true } },
  unit: { select: { bookId: true, archived: true } },
  chapter: { select: { bookId: true, archived: true } },
  module: { select: { bookId: true, archived: true } },
  topic: { select: { bookId: true, archived: true } },
  currentDestination: {
    select: {
      id: true,
      qrCodeId: true,
      type: true,
      active: true,
      audience: true,
      validatedExternalUrl: true,
      internalRoute: true,
      resource: {
        select: {
          publisherId: true,
          audience: true,
          fileUrl: true,
          published: true,
          archived: true,
        },
      },
      bookResourceLink: {
        select: {
          publisherId: true,
          bookId: true,
          active: true,
          qrEligible: true,
          audienceOverride: true,
          resource: {
            select: {
              publisherId: true,
              audience: true,
              fileUrl: true,
              published: true,
              archived: true,
            },
          },
        },
      },
    },
  },
} as const;

function failureResponse(failure: RedirectFailure) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "text/plain; charset=utf-8",
    "X-Robots-Tag": "noindex, nofollow",
  });
  if (failure.retryAfter) headers.set("Retry-After", failure.retryAfter);
  return new Response(failure.message, {
    status: failure.status,
    headers,
  });
}

function audienceAllows(
  audience: QrAccessAudience,
  role: UserRole | undefined,
) {
  if (audience === QrAccessAudience.PUBLIC) return true;
  if (!role) return false;
  if (role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN) return true;
  if (audience === QrAccessAudience.AUTHENTICATED) return true;
  if (audience === QrAccessAudience.SCHOOL_MEMBER) {
    return (
      role === UserRole.SCHOOL ||
      role === UserRole.TEACHER ||
      role === UserRole.STUDENT
    );
  }
  if (audience === QrAccessAudience.TEACHER_ONLY) {
    return role === UserRole.TEACHER;
  }
  if (audience === QrAccessAudience.STUDENT_ONLY) {
    return role === UserRole.STUDENT;
  }
  return role === UserRole.TEACHER || role === UserRole.STUDENT;
}

function resourceAudienceAllows(
  audience: ResourceAudience,
  role: UserRole | undefined,
) {
  if (role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN) return true;
  if (audience === ResourceAudience.TEACHER_ONLY) {
    return role === UserRole.TEACHER;
  }
  if (audience === ResourceAudience.STUDENT) {
    return role === UserRole.STUDENT;
  }
  return role === UserRole.TEACHER || role === UserRole.STUDENT;
}

function hierarchyIsAvailable(
  qr: Awaited<ReturnType<typeof loadQr>>,
) {
  if (!qr) return false;
  const expectedBookId = qr.bookId;
  switch (qr.targetType) {
    case BookContentTargetType.BOOK:
      return true;
    case BookContentTargetType.PART:
      return qr.part?.bookId === expectedBookId && !qr.part.archived;
    case BookContentTargetType.UNIT:
      return qr.unit?.bookId === expectedBookId && !qr.unit.archived;
    case BookContentTargetType.CHAPTER:
      return qr.chapter?.bookId === expectedBookId && !qr.chapter.archived;
    case BookContentTargetType.MODULE:
      return qr.module?.bookId === expectedBookId && !qr.module.archived;
    case BookContentTargetType.TOPIC:
      return qr.topic?.bookId === expectedBookId && !qr.topic.archived;
  }
}

function loadQr(publicCode: string) {
  return prisma.dynamicQrCode.findUnique({
    where: { publicCode },
    select: qrResolutionSelect,
  });
}

export async function resolveQrRedirect(
  rawPublicCode: string,
  request: Request,
) {
  const publicCode = normalizeQrPublicCode(rawPublicCode);
  if (!publicCode) {
    return failureResponse({ status: 404, message: "QR code not found." });
  }

  const qr = await loadQr(publicCode);
  if (!qr) {
    return failureResponse({ status: 404, message: "QR code not found." });
  }

  if (!qr.publisher.active || qr.book.publisherId !== qr.publisherId) {
    return failureResponse({ status: 404, message: "QR code not found." });
  }
  if (qr.book.archived || !hierarchyIsAvailable(qr)) {
    return failureResponse({
      status: 410,
      message: "This QR destination is no longer available.",
    });
  }

  if (qr.status === QrStatus.ARCHIVED || qr.status === QrStatus.EXPIRED) {
    return failureResponse({
      status: 410,
      message: "This QR code has expired or been archived.",
    });
  }
  if (qr.status === QrStatus.SUSPENDED) {
    return failureResponse({
      status: 403,
      message: "This QR code has been suspended.",
    });
  }
  if (qr.status === QrStatus.PAUSED) {
    return failureResponse({
      status: 503,
      message: "This QR code is temporarily unavailable.",
      retryAfter: "3600",
    });
  }
  if (qr.status !== QrStatus.ACTIVE) {
    return failureResponse({ status: 404, message: "QR code not found." });
  }

  const now = new Date();
  if (qr.activatesAt && qr.activatesAt > now) {
    return failureResponse({ status: 404, message: "QR code not found." });
  }
  if (qr.expiresAt && qr.expiresAt <= now) {
    return failureResponse({
      status: 410,
      message: "This QR code has expired.",
    });
  }
  if (!qr.qrEligible) {
    return failureResponse({
      status: 503,
      message: "This QR code is unavailable.",
    });
  }

  const destination = qr.currentDestination;
  if (
    !destination ||
    !destination.active ||
    destination.qrCodeId !== qr.id
  ) {
    return failureResponse({
      status: 503,
      message: "This QR code has no active destination.",
    });
  }

  const session = await auth();
  const role = session?.user?.role as UserRole | undefined;
  if (
    !audienceAllows(qr.audience, role) ||
    !audienceAllows(destination.audience, role)
  ) {
    return failureResponse({
      status: role ? 403 : 401,
      message: role
        ? "You do not have access to this QR destination."
        : "Sign in to access this QR destination.",
    });
  }

  let destinationUrl: string;
  try {
    if (destination.type === QrDestinationType.RESOURCE) {
      const resource = destination.resource;
      if (
        !resource ||
        resource.publisherId !== qr.publisherId ||
        !resource.published ||
        resource.archived
      ) {
        return failureResponse({
          status: 503,
          message: "The Resource is unavailable.",
        });
      }
      if (!resourceAudienceAllows(resource.audience, role)) {
        return failureResponse({
          status: role ? 403 : 401,
          message: "You do not have access to this Resource.",
        });
      }
      destinationUrl = safeResourceDestination(resource.fileUrl, request.url);
    } else if (
      destination.type === QrDestinationType.BOOK_RESOURCE_LINK
    ) {
      const link = destination.bookResourceLink;
      if (
        !link ||
        link.publisherId !== qr.publisherId ||
        link.bookId !== qr.bookId ||
        !link.active ||
        !link.qrEligible ||
        link.resource.publisherId !== qr.publisherId ||
        !link.resource.published ||
        link.resource.archived
      ) {
        return failureResponse({
          status: 503,
          message: "The linked Resource is unavailable.",
        });
      }
      if (
        !resourceAudienceAllows(
          link.audienceOverride ?? link.resource.audience,
          role,
        )
      ) {
        return failureResponse({
          status: role ? 403 : 401,
          message: "You do not have access to this Resource.",
        });
      }
      destinationUrl = safeResourceDestination(
        link.resource.fileUrl,
        request.url,
      );
    } else if (destination.type === QrDestinationType.EXTERNAL_URL) {
      destinationUrl = normalizeApprovedExternalUrl(
        destination.validatedExternalUrl,
      ).url;
    } else {
      const route = normalizeInternalRoute(destination.internalRoute);
      destinationUrl = new URL(route, request.url).toString();
    }
  } catch (error) {
    if (error instanceof QrDestinationPolicyError) {
      return failureResponse({
        status: 502,
        message: "The QR destination failed a security check.",
      });
    }
    throw error;
  }

  const response = Response.redirect(destinationUrl, 307);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  if (qr.audience !== QrAccessAudience.PUBLIC) {
    response.headers.set("Vary", "Cookie");
  }
  return response;
}
