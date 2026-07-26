"use server";

import {
  ClassMaterialKind,
  ClassMaterialSource,
  ClassMaterialStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireTeacherClass } from "@/lib/classroom";
import { prisma } from "@/lib/prisma";
import { normalizeAndValidateObjectKey } from "@/lib/storage/object-key";
import { keyBelongsToTenant } from "@/lib/storage/upload-service";
import { getStorageProvider } from "@/lib/storage/provider";

type ActionResult = { ok: true; message: string } | { ok: false; message: string };

const text = (form: FormData, key: string, max = 500) =>
  String(form.get(key) ?? "").trim().slice(0, max);

function refresh(sectionId: string) {
  revalidatePath(`/teacher-dashboard/classes/${sectionId}`);
  revalidatePath(`/teacher-dashboard/classes/${sectionId}/materials`);
  revalidatePath("/teacher-dashboard/classes");
}

function validHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

async function resolveDestination(sectionId: string, sectionSubjectId: string, chapterId: string | null) {
  const scope = await requireTeacherClass(sectionId);
  const sectionSubject = scope.sectionSubjects.find((item) => item.id === sectionSubjectId);
  if (!sectionSubject) return null;
  if (chapterId) {
    const validChapter = sectionSubject.bookAdoptions.some((adoption) =>
      adoption.book.chapters.some((chapter) => chapter.id === chapterId),
    );
    if (!validChapter) return null;
  }
  return { scope, sectionSubject };
}

export async function createClassMaterial(sectionId: string, form: FormData): Promise<ActionResult> {
  const title = text(form, "title", 160);
  const description = text(form, "description", 1000) || null;
  const sectionSubjectId = text(form, "sectionSubjectId", 80);
  const chapterId = text(form, "chapterId", 80) || null;
  const sourceValue = text(form, "source", 40) as ClassMaterialSource;
  const kindValue = text(form, "kind", 40) as ClassMaterialKind;
  if (
    !title ||
    !Object.values(ClassMaterialSource).includes(sourceValue) ||
    !Object.values(ClassMaterialKind).includes(kindValue)
  ) return { ok: false, message: "Complete the material title, type, and source." };

  const destination = await resolveDestination(sectionId, sectionSubjectId, chapterId);
  if (!destination) return { ok: false, message: "This class, subject, or chapter is not in your assignment." };
  const { scope, sectionSubject } = destination;

  const data: {
    source: ClassMaterialSource;
    kind: ClassMaterialKind;
    resourceId?: string;
    aiGenerationId?: string;
    sourceMaterialId?: string;
    fileUrl?: string;
    originalFileName?: string;
    mimeType?: string;
    fileSizeBytes?: bigint;
    externalUrl?: string;
  } = { source: sourceValue, kind: kindValue };

  if (sourceValue === ClassMaterialSource.UPLOAD) {
    const fileUrl = text(form, "fileUrl", 1000);
    const originalFileName = text(form, "originalFileName", 255);
    const mimeType = text(form, "mimeType", 150).toLowerCase();
    const fileSize = Number(text(form, "fileSizeBytes", 30));
    let key: string;
    try {
      key = normalizeAndValidateObjectKey(fileUrl);
    } catch {
      return { ok: false, message: "Upload the file again before saving." };
    }
    if (
      !originalFileName ||
      !mimeType ||
      !Number.isSafeInteger(fileSize) ||
      fileSize <= 0 ||
      !keyBelongsToTenant(key, scope.publisherId, "class-material")
    ) return { ok: false, message: "The uploaded file details are invalid." };
    const metadata = await getStorageProvider().headObject({ key });
    if (
      !metadata ||
      metadata.contentLength !== fileSize ||
      metadata.contentType?.toLowerCase() !== mimeType ||
      metadata.customMetadata?.["upload-scope"] !== "class-material" ||
      metadata.customMetadata?.["uploader-user-id"] !== scope.teacher.userId ||
      metadata.customMetadata?.["target-id"] !== sectionId
    ) return { ok: false, message: "The uploaded file could not be verified." };
    data.fileUrl = key;
    data.originalFileName = originalFileName;
    data.mimeType = mimeType;
    data.fileSizeBytes = BigInt(fileSize);
  } else if (sourceValue === ClassMaterialSource.EXTERNAL_LINK) {
    const externalUrl = text(form, "externalUrl", 1000);
    if (!validHttpsUrl(externalUrl)) return { ok: false, message: "Enter a secure https link." };
    data.externalUrl = externalUrl;
  } else if (sourceValue === ClassMaterialSource.AI_GENERATION) {
    const aiGenerationId = text(form, "aiGenerationId", 80);
    const generation = await prisma.aiGeneration.findFirst({
      where: { id: aiGenerationId, teacherId: scope.teacher.id, status: "COMPLETED", quotaConsumed: true, output: { not: null } },
      select: { id: true },
    });
    if (!generation) return { ok: false, message: "That AI material is not available." };
    data.aiGenerationId = generation.id;
    data.kind = ClassMaterialKind.AI_GENERATED;
  } else if (sourceValue === ClassMaterialSource.PUBLISHER_RESOURCE) {
    const resourceId = text(form, "resourceId", 80);
    const resource = sectionSubject.resources.find((item) => item.id === resourceId);
    if (!resource) return { ok: false, message: "That publisher resource is not assigned to this subject." };
    data.resourceId = resource.id;
  }

  const statusValue = text(form, "status", 40) as ClassMaterialStatus;
  const status = Object.values(ClassMaterialStatus).includes(statusValue)
    ? statusValue
    : ClassMaterialStatus.DRAFT;
  const scheduledAtValue = text(form, "scheduledAt", 80);
  const scheduledAt = status === ClassMaterialStatus.SCHEDULED && scheduledAtValue
    ? new Date(scheduledAtValue)
    : null;
  if (status === ClassMaterialStatus.SCHEDULED && (!scheduledAt || Number.isNaN(+scheduledAt) || scheduledAt <= new Date())) {
    return { ok: false, message: "Choose a future date and time for scheduled sharing." };
  }

  await prisma.classMaterial.create({
    data: {
      publisherId: scope.publisherId,
      schoolId: scope.schoolId,
      academicYearId: scope.academicYear.id,
      schoolClassId: scope.schoolClass.id,
      sectionId,
      sectionSubjectId,
      subjectId: sectionSubject.subjectId,
      teacherId: scope.teacher.id,
      chapterId,
      title,
      description,
      status,
      scheduledAt,
      sharedAt: status === ClassMaterialStatus.SHARED ? new Date() : null,
      ...data,
    },
  });
  refresh(sectionId);
  return { ok: true, message: status === ClassMaterialStatus.SHARED ? "Material shared with the class." : "Material saved." };
}

export async function updateClassMaterial(sectionId: string, form: FormData): Promise<ActionResult> {
  const id = text(form, "id", 80);
  const title = text(form, "title", 160);
  const description = text(form, "description", 1000) || null;
  const chapterId = text(form, "chapterId", 80) || null;
  const scope = await requireTeacherClass(sectionId);
  const material = await prisma.classMaterial.findFirst({
    where: {
      id,
      teacherId: scope.teacher.id,
      publisherId: scope.publisherId,
      schoolId: scope.schoolId,
      sectionId,
      archivedAt: null,
    },
  });
  if (!material || !title) return { ok: false, message: "Material not found." };
  const destination = await resolveDestination(sectionId, material.sectionSubjectId, chapterId);
  if (!destination) return { ok: false, message: "That chapter is not available for this subject." };
  await prisma.classMaterial.updateMany({
    where: { id: material.id, teacherId: scope.teacher.id, archivedAt: null },
    data: { title, description, chapterId },
  });
  refresh(sectionId);
  return { ok: true, message: "Material updated." };
}

export async function setClassMaterialVisibility(
  sectionId: string,
  materialId: string,
  nextStatus: "SHARED" | "UNSHARED",
): Promise<ActionResult> {
  const scope = await requireTeacherClass(sectionId);
  const result = await prisma.classMaterial.updateMany({
    where: {
      id: materialId,
      teacherId: scope.teacher.id,
      publisherId: scope.publisherId,
      schoolId: scope.schoolId,
      sectionId,
      archivedAt: null,
    },
    data: nextStatus === "SHARED"
      ? { status: "SHARED", sharedAt: new Date(), scheduledAt: null, unsharedAt: null }
      : { status: "UNSHARED", unsharedAt: new Date(), scheduledAt: null },
  });
  if (!result.count) return { ok: false, message: "Material not found." };
  refresh(sectionId);
  return { ok: true, message: nextStatus === "SHARED" ? "Material shared." : "Material unshared." };
}

export async function scheduleClassMaterial(sectionId: string, materialId: string, value: string): Promise<ActionResult> {
  const scope = await requireTeacherClass(sectionId);
  const scheduledAt = new Date(value);
  if (Number.isNaN(+scheduledAt) || scheduledAt <= new Date()) {
    return { ok: false, message: "Choose a future date and time." };
  }
  const result = await prisma.classMaterial.updateMany({
    where: {
      id: materialId,
      teacherId: scope.teacher.id,
      publisherId: scope.publisherId,
      schoolId: scope.schoolId,
      sectionId,
      archivedAt: null,
    },
    data: { status: "SCHEDULED", scheduledAt, sharedAt: null, unsharedAt: null },
  });
  if (!result.count) return { ok: false, message: "Material not found." };
  refresh(sectionId);
  return { ok: true, message: "Material scheduled." };
}

export async function reuseClassMaterial(
  sectionId: string,
  sourceMaterialId: string,
  sectionSubjectId: string,
  chapterId: string | null,
): Promise<ActionResult> {
  const destination = await resolveDestination(sectionId, sectionSubjectId, chapterId);
  if (!destination) return { ok: false, message: "The destination is not in your assignment." };
  const { scope, sectionSubject } = destination;
  const source = await prisma.classMaterial.findFirst({
    where: {
      id: sourceMaterialId,
      teacherId: scope.teacher.id,
      publisherId: scope.publisherId,
      schoolId: scope.schoolId,
      archivedAt: null,
    },
  });
  if (!source) return { ok: false, message: "Source material not found." };
  await prisma.classMaterial.create({
    data: {
      publisherId: scope.publisherId,
      schoolId: scope.schoolId,
      academicYearId: scope.academicYear.id,
      schoolClassId: scope.schoolClass.id,
      sectionId,
      sectionSubjectId,
      subjectId: sectionSubject.subjectId,
      teacherId: scope.teacher.id,
      chapterId,
      resourceId: source.resourceId,
      aiGenerationId: source.aiGenerationId,
      sourceMaterialId: source.id,
      title: source.title,
      description: source.description,
      kind: source.kind,
      source: source.source,
      fileUrl: source.fileUrl,
      originalFileName: source.originalFileName,
      mimeType: source.mimeType,
      fileSizeBytes: source.fileSizeBytes,
      externalUrl: source.externalUrl,
      status: "DRAFT",
    },
  });
  refresh(sectionId);
  return { ok: true, message: "A reusable draft was added to this class." };
}

export async function archiveClassMaterial(sectionId: string, materialId: string): Promise<ActionResult> {
  const scope = await requireTeacherClass(sectionId);
  const result = await prisma.classMaterial.updateMany({
    where: {
      id: materialId,
      teacherId: scope.teacher.id,
      publisherId: scope.publisherId,
      schoolId: scope.schoolId,
      sectionId,
      archivedAt: null,
    },
    data: { archivedAt: new Date(), status: "UNSHARED", unsharedAt: new Date(), scheduledAt: null },
  });
  if (!result.count) return { ok: false, message: "Material not found." };
  refresh(sectionId);
  return { ok: true, message: "Material removed from this class." };
}
