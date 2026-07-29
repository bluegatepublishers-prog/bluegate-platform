import {
  ContentEntitlementStatus,
  Prisma,
  ResourceAudience,
  ResourceType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const RESOURCE_LIBRARY_PAGE_SIZE = 20;
export const RESOURCE_LIBRARY_MAX_PAGE_SIZE = 50;

export const RESOURCE_LIBRARY_PRESETS = [
  "all",
  "documents",
  "teacher",
  "student",
  "published",
  "draft",
  "unattached",
  "recent",
  "archived",
] as const;

export type ResourceLibraryPreset = (typeof RESOURCE_LIBRARY_PRESETS)[number];
export type ResourceLibraryStatus = "published" | "draft" | "archived";
export type ResourceLibraryAttachment = "attached" | "unattached";
export type ResourceLibrarySort =
  | "updated_desc"
  | "updated_asc"
  | "title_asc"
  | "title_desc"
  | "created_desc";
export type ResourceLibraryView = "list" | "cards";

export type ResourceLibraryQueryInput = {
  query?: string;
  type?: string;
  audience?: string;
  status?: string;
  attachment?: string;
  sort?: string;
  preset?: string;
  view?: string;
  page?: string;
  pageSize?: string;
};

export type ResourceLibraryQuery = {
  query?: string;
  type?: ResourceType;
  audience?: ResourceAudience;
  status?: ResourceLibraryStatus;
  attachment?: ResourceLibraryAttachment;
  sort: ResourceLibrarySort;
  preset: ResourceLibraryPreset;
  view: ResourceLibraryView;
  page: number;
  pageSize: number;
};

const DOCUMENT_TYPES: ResourceType[] = [
  ResourceType.PDF,
  ResourceType.PPT,
  ResourceType.DOC,
  ResourceType.ZIP,
  ResourceType.WORKSHEET,
  ResourceType.ANSWER_KEY,
  ResourceType.TEACHER_GUIDE,
  ResourceType.QUESTION_BANK,
];

const LEGACY_CONTEXT_FIELDS = [
  "bookId",
  "editionId",
  "unitId",
  "chapterId",
  "moduleId",
  "topicId",
  "exerciseId",
] as const;

function oneOf<T extends string>(
  value: string | undefined,
  values: readonly T[],
): T | undefined {
  return values.includes(value as T) ? (value as T) : undefined;
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeResourceLibraryQuery(
  input: ResourceLibraryQueryInput,
): ResourceLibraryQuery {
  return {
    query: input.query?.trim().slice(0, 160) || undefined,
    type: oneOf(input.type, Object.values(ResourceType)),
    audience: oneOf(input.audience, Object.values(ResourceAudience)),
    status: oneOf(input.status, ["published", "draft", "archived"] as const),
    attachment: oneOf(input.attachment, ["attached", "unattached"] as const),
    sort:
      oneOf(input.sort, [
        "updated_desc",
        "updated_asc",
        "title_asc",
        "title_desc",
        "created_desc",
      ] as const) ?? "updated_desc",
    preset:
      oneOf(input.preset, RESOURCE_LIBRARY_PRESETS) ?? "all",
    view: oneOf(input.view, ["list", "cards"] as const) ?? "list",
    page: positiveInteger(input.page, 1),
    pageSize: Math.min(
      positiveInteger(input.pageSize, RESOURCE_LIBRARY_PAGE_SIZE),
      RESOURCE_LIBRARY_MAX_PAGE_SIZE,
    ),
  };
}

function hasLegacyContextCondition(): Prisma.ResourceWhereInput {
  return {
    OR: LEGACY_CONTEXT_FIELDS.map((field) => ({ [field]: { not: null } })),
  };
}

function hasNoLegacyContextCondition(): Prisma.ResourceWhereInput {
  return {
    AND: LEGACY_CONTEXT_FIELDS.map((field) => ({ [field]: null })),
  };
}

function attachmentCondition(
  value: ResourceLibraryAttachment,
): Prisma.ResourceWhereInput {
  return value === "attached"
    ? {
        OR: [
          { bookResourceLinks: { some: { active: true } } },
          hasLegacyContextCondition(),
        ],
      }
    : {
        AND: [
          { bookResourceLinks: { none: { active: true } } },
          hasNoLegacyContextCondition(),
        ],
      };
}

function presetConditions(
  preset: ResourceLibraryPreset,
): Prisma.ResourceWhereInput[] {
  if (preset === "documents") return [{ type: { in: DOCUMENT_TYPES } }];
  if (preset === "teacher") {
    return [{ audience: ResourceAudience.TEACHER_ONLY }];
  }
  if (preset === "student") {
    return [{ audience: { in: [ResourceAudience.STUDENT, ResourceAudience.BOTH] } }];
  }
  if (preset === "published") return [{ published: true, archived: false }];
  if (preset === "draft") return [{ published: false, archived: false }];
  if (preset === "unattached") return [attachmentCondition("unattached")];
  if (preset === "recent") {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    return [{ updatedAt: { gte: since } }];
  }
  if (preset === "archived") return [{ archived: true }];
  return [];
}

export function buildResourceLibraryWhere(
  publisherId: string,
  input: ResourceLibraryQuery,
): Prisma.ResourceWhereInput {
  const conditions: Prisma.ResourceWhereInput[] = [
    ...presetConditions(input.preset),
  ];

  if (input.preset !== "archived" && input.status !== "archived") {
    conditions.push({ archived: false });
  }
  if (input.status === "archived") conditions.push({ archived: true });
  if (input.status === "published") conditions.push({ published: true });
  if (input.status === "draft") conditions.push({ published: false });
  if (input.type) conditions.push({ type: input.type });
  if (input.audience) conditions.push({ audience: input.audience });
  if (input.attachment) conditions.push(attachmentCondition(input.attachment));

  if (input.query) {
    const exactType = oneOf(
      input.query.toUpperCase().replace(/\s+/g, "_"),
      Object.values(ResourceType),
    );
    conditions.push({
      OR: [
        { title: { contains: input.query, mode: "insensitive" } },
        { description: { contains: input.query, mode: "insensitive" } },
        { originalFileName: { contains: input.query, mode: "insensitive" } },
        { subject: { contains: input.query, mode: "insensitive" } },
        { classLevel: { contains: input.query, mode: "insensitive" } },
        { book: { is: { title: { contains: input.query, mode: "insensitive" } } } },
        {
          seriesRef: {
            is: { name: { contains: input.query, mode: "insensitive" } },
          },
        },
        ...(exactType ? [{ type: exactType }] : []),
      ],
    });
  }

  return {
    publisherId,
    AND: conditions,
  };
}

function resourceOrderBy(
  sort: ResourceLibrarySort,
): Prisma.ResourceOrderByWithRelationInput[] {
  if (sort === "updated_asc") return [{ updatedAt: "asc" }, { id: "asc" }];
  if (sort === "title_asc") return [{ title: "asc" }, { id: "asc" }];
  if (sort === "title_desc") return [{ title: "desc" }, { id: "asc" }];
  if (sort === "created_desc") return [{ createdAt: "desc" }, { id: "asc" }];
  return [{ updatedAt: "desc" }, { id: "asc" }];
}

export async function listPublisherResources(
  publisherId: string,
  query: ResourceLibraryQuery,
) {
  const where = buildResourceLibraryWhere(publisherId, query);
  const total = await prisma.resource.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(query.page, totalPages);

  const records = await prisma.resource.findMany({
    where,
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      audience: true,
      fileUrl: true,
      originalFileName: true,
      mimeType: true,
      fileSizeBytes: true,
      thumbnail: true,
      published: true,
      archived: true,
      createdAt: true,
      updatedAt: true,
      bookId: true,
      editionId: true,
      unitId: true,
      chapterId: true,
      moduleId: true,
      topicId: true,
      exerciseId: true,
      classRef: { select: { name: true } },
      subjectRef: { select: { name: true } },
      seriesRef: { select: { name: true } },
      book: { select: { id: true, title: true } },
      _count: {
        select: {
          bookResourceLinks: { where: { active: true } },
          schoolEntitlements: {
            where: { status: ContentEntitlementStatus.ACTIVE },
          },
        },
      },
    },
    orderBy: resourceOrderBy(query.sort),
    skip: (page - 1) * query.pageSize,
    take: query.pageSize,
  });

  return {
    items: records.map((resource) => {
      const legacyAttached = LEGACY_CONTEXT_FIELDS.some(
        (field) => resource[field] !== null,
      );
      return {
        id: resource.id,
        title: resource.title,
        description: resource.description,
        type: resource.type,
        audience: resource.audience,
        fileUrl: resource.fileUrl,
        originalFileName: resource.originalFileName,
        mimeType: resource.mimeType,
        fileSizeBytes: resource.fileSizeBytes?.toString() ?? null,
        thumbnail: resource.thumbnail,
        published: resource.published,
        archived: resource.archived,
        createdAt: resource.createdAt.toISOString(),
        updatedAt: resource.updatedAt.toISOString(),
        className: resource.classRef?.name ?? null,
        subjectName: resource.subjectRef?.name ?? null,
        seriesName: resource.seriesRef?.name ?? null,
        book: resource.book,
        contextualUsageCount:
          resource._count.bookResourceLinks + Number(legacyAttached),
        schoolUsageCount: resource._count.schoolEntitlements,
        legacyAttached,
      };
    }),
    pagination: {
      page,
      pageSize: query.pageSize,
      total,
      totalPages,
    },
  };
}

export async function findLikelyResourceDuplicates(
  publisherId: string,
  input: {
    originalFileName?: string | null;
    fileSizeBytes?: number | null;
    externalUrl?: string | null;
  },
) {
  const filename = input.originalFileName?.trim().slice(0, 255) || null;
  const externalUrl = input.externalUrl?.trim().slice(0, 2000) || null;
  if (!filename && !externalUrl) return [];

  return prisma.resource.findMany({
    where: {
      publisherId,
      archived: false,
      OR: [
        ...(externalUrl ? [{ fileUrl: externalUrl }] : []),
        ...(filename
          ? [
              {
                originalFileName: { equals: filename, mode: "insensitive" as const },
                ...(input.fileSizeBytes
                  ? { fileSizeBytes: BigInt(input.fileSizeBytes) }
                  : {}),
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      title: true,
      type: true,
      originalFileName: true,
      fileSizeBytes: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });
}

export function isSafeExternalResourceUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}
