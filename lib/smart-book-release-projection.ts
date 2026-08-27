import type { ContentRenderMode } from "@/lib/content-audience";
import type { ContentDocument } from "@/lib/content-document";
import type { ResolvedLinkedAsset } from "@/lib/content-linked-asset-types";
import type { ResolvedActivityBlock } from "@/lib/activity-studio-types";
import type { ResolvedWorksheetBlock } from "@/lib/worksheet-studio-types";
import type { ResolvedMediaBlock } from "@/lib/content-media-types";
import type { SmartBookReleaseManifestV2, SmartBookManifestResource } from "@/lib/smart-book-release-manifest";
import { hasCompleteSafeAssessmentExecution, toBookQuestionSource, type SmartBookProtectedQuestion, type SmartBookProtectedReleasePayload } from "@/lib/smart-book-release-protected";
import { isAvailableStudentWorksheetQuestion, type StudentWorksheetQuestionCandidate } from "@/lib/student-worksheet-policy";
import { isLinkedAssetBlock, isMediaBlock, type MediaKind } from "@/lib/content-document";
import { isValidAssessmentQuestion, type AssessmentQuestionSnapshot } from "@/lib/assessment-policy";

export function resolveManifestResourceUrls(
  manifest: SmartBookReleaseManifestV2,
  document: ContentDocument,
  mode: ContentRenderMode,
  releaseVersionId?: string,
) {
  const resources = new Map(manifest.assets.resources.map((resource) => [resource.sourceId, resource]));
  const ids = new Set<string>();
  const collectFrame = (frame: NonNullable<NonNullable<ContentDocument["pageLayout"]>["pages"]>[number]["frames"][number]) => {
    if (frame.resourceId) ids.add(frame.resourceId);
    if (frame.contentRef?.resourceId) ids.add(frame.contentRef.resourceId);
    frame.children?.forEach(collectFrame);
  };
  for (const page of document.pageLayout?.pages ?? []) {
    if (page.background?.resourceId) ids.add(page.background.resourceId);
    if (page.replica?.resourceId) ids.add(page.replica.resourceId);
    if (page.narration?.resourceId) ids.add(page.narration.resourceId);
    page.narration?.segments?.forEach((segment) => { if (segment.resourceId) ids.add(segment.resourceId); });
    page.frames.forEach(collectFrame);
  }
  return Object.fromEntries([...ids].flatMap((id) => resources.has(id) ? [[id, smartBookReleaseResourcePath(mode, id, releaseVersionId)]] : []));
}

export function smartBookReleaseResourcePath(mode: ContentRenderMode, resourceId: string, releaseVersionId?: string) {
  if (releaseVersionId) return `/api/smart-book/releases/${encodeURIComponent(releaseVersionId)}/assets/${encodeURIComponent(resourceId)}`;
  const prefix = mode === "STUDENT" ? "/api/student/resources" : "/api/resources";
  const suffix = mode === "STUDENT" ? "/open" : "/play";
  return `${prefix}/${encodeURIComponent(resourceId)}${suffix}`;
}

export function resolveManifestLinkedAssets(
  manifest: SmartBookReleaseManifestV2,
  document: ContentDocument,
  mode: ContentRenderMode,
  releaseVersionId?: string,
): Record<string, ResolvedLinkedAsset | null> {
  const resources = new Map(manifest.assets.resources.map((resource) => [resource.sourceId, resource]));
  const activities = new Map(manifest.assets.activities.map((activity) => [activity.sourceId, activity]));
  const worksheets = new Map(manifest.assets.worksheets.map((worksheet) => [worksheet.sourceId, worksheet]));
  const exercises = new Map(manifest.hierarchy.filter((item) => item.kind === "EXERCISE").map((item) => [item.sourceId, item]));
  const resolved: Record<string, ResolvedLinkedAsset | null> = {};
  for (const block of document.blocks) {
    if (!isLinkedAssetBlock(block)) continue;
    const target = block.targetId;
    const resource = resources.get(target);
    const activity = activities.get(target);
    const worksheet = worksheets.get(target);
    const exercise = exercises.get(target);
    const title = resource?.title ?? activity?.title ?? worksheet?.title ?? exercise?.title;
    if (!title) {
      resolved[block.id] = null;
      continue;
    }
    const teacherOnly = resource?.audience === "TEACHER_ONLY";
    const assetKind = block.assetKind;
    const route = resource
      ? { href: smartBookReleaseResourcePath(mode, target, releaseVersionId), openMode: "route" as const }
      : null;
    resolved[block.id] = {
      assetKind,
      targetType: block.targetType,
      targetId: target,
      title,
      label: block.label,
      sourceBadge: "Released Smart Book",
      sourceDetail: resource?.type ?? assetKind,
      scopeLabel: "Published release",
      teacherOnly,
      audienceOptions: teacherOnly ? ["TEACHER"] : ["TEACHER", "STUDENT"],
      openModes: route ? ["route"] : [],
      route,
      available: true,
    };
  }
  return resolved;
}

function manifestMediaKind(mediaType: string, targetType: "RESOURCE" | "VIDEO_LESSON"): MediaKind {
  if (targetType === "VIDEO_LESSON") return "video";
  const normalized = mediaType.trim().toUpperCase();
  if (normalized === "AUDIO") return "audio";
  if (normalized === "INTERACTIVE" || normalized === "SIMULATION") return "simulation";
  if (normalized === "HTML" || normalized === "HTML5") return "html5";
  if (normalized === "ANIMATION" || normalized === "GIF" || normalized === "SVG") return "animation";
  return "video";
}

export function resolveManifestQuestions(
  manifest: SmartBookReleaseManifestV2,
  mode: ContentRenderMode,
  releaseVersionId?: string,
) {
  const resources = new Map(manifest.assets.resources.map((resource) => [resource.sourceId, resource]));
  return Object.fromEntries(manifest.assets.questions
    .filter((question) => mode === "TEACHER" || !question.imageResourceId || resources.has(question.imageResourceId))
    .sort((left, right) => left.displayOrder - right.displayOrder || left.sourceId.localeCompare(right.sourceId))
    .map((question) => [question.sourceId, {
      id: question.sourceId,
      questionType: question.questionType,
      questionText: question.questionText,
      options: question.options,
      marks: question.marks,
      displayOrder: question.displayOrder,
      imageResourceId: question.imageResourceId,
      imageRoute: question.imageResourceId && resources.has(question.imageResourceId)
         ? smartBookReleaseResourcePath(mode, question.imageResourceId, releaseVersionId)
        : null,
    }]));
}
export function resolveManifestActivities(
  manifest: SmartBookReleaseManifestV2,
  mode: ContentRenderMode,
  releaseVersionId?: string,
): Record<string, Exclude<ResolvedActivityBlock, null>> {
  const resources = new Map(manifest.assets.resources.map((resource) => [resource.sourceId, resource]));
  return Object.fromEntries(manifest.assets.activities.map((activity) => [activity.sourceId, {
    activity: {
      id: activity.sourceId,
      chapterId: "",
      moduleId: null,
      topicId: null,
      title: activity.title,
      activityType: activity.activityType as never,
      shortDescription: activity.shortDescription,
      objective: activity.objective,
      materials: activity.materials,
      durationMinutes: activity.durationMinutes,
      groupType: activity.groupType,
      preparation: activity.preparation,
      instructions: activity.instructions,
      steps: activity.steps,
      observationPrompts: activity.observationPrompts,
      reflectionPrompts: activity.reflectionPrompts,
      expectedLearning: activity.expectedLearning,
      assessment: activity.assessment,
      safetyNotes: activity.safetyNotes,
      teacherGuidance: null,
      studentInstructions: activity.studentInstructions,
      attachmentResourceIds: activity.attachmentResourceIds,
      imageResourceId: activity.imageResourceId ?? null,
      videoResourceId: activity.videoResourceId ?? null,
      diagramResourceId: activity.diagramResourceId ?? null,
      audience: activity.audience as never,
      difficulty: activity.difficulty as never,
      active: true,
      published: true,
      archived: false,
      sortOrder: 0,
      updatedAt: "",
    },
    attachments: [...new Set([
      ...activity.attachmentResourceIds,
      activity.imageResourceId ?? "",
      activity.videoResourceId ?? "",
      activity.diagramResourceId ?? "",
    ].filter(Boolean))].flatMap((id) => {
      const resource = resources.get(id);
      if (!resource || (mode === "STUDENT" && resource.audience === "TEACHER_ONLY")) return [];
      return [{
        id,
        title: resource.title,
        type: resource.type,
         route: { href: smartBookReleaseResourcePath(mode, id, releaseVersionId), openMode: "route" as const },
        teacherOnly: resource.audience === "TEACHER_ONLY",
        published: true,
      }];
    }),
  }]));
}

export function resolveManifestWorksheets(
  manifest: SmartBookReleaseManifestV2,
  mode: ContentRenderMode,
  releaseVersionId?: string,
): Record<string, Exclude<ResolvedWorksheetBlock, null>> {
  const resources = new Map(manifest.assets.resources.map((resource) => [resource.sourceId, resource]));
  const resourceSummary = (resource: SmartBookManifestResource) => ({
    id: resource.sourceId,
    title: resource.title,
    type: resource.type,
    route: { href: smartBookReleaseResourcePath(mode, resource.sourceId, releaseVersionId), openMode: "route" as const },
    published: true,
    teacherOnly: resource.audience === "TEACHER_ONLY",
  });
  return Object.fromEntries(manifest.assets.worksheets.map((worksheet) => [worksheet.sourceId, {
    worksheet: {
      id: worksheet.sourceId,
      publisherId: manifest.identity.publisherId,
      bookId: manifest.identity.bookId,
      chapterId: "",
      moduleId: null,
      topicId: null,
      exerciseId: worksheet.runtimeExerciseId,
      printableResourceId: worksheet.printableResourceId,
      answerKeyResourceId: null,
      supportingResourceIds: worksheet.supportingResourceIds,
      title: worksheet.title,
      slug: worksheet.sourceId,
      type: worksheet.type as never,
      instructions: worksheet.instructions,
      estimatedMinutes: worksheet.estimatedMinutes,
      difficulty: worksheet.difficulty as never,
      audience: worksheet.audience as never,
      totalMarks: worksheet.totalMarks,
      allowOnlineAttempt: worksheet.allowOnlineAttempt,
      allowPrint: worksheet.allowPrint,
      showAnswersAfterSubmit: false,
      active: true,
      published: true,
      sortOrder: 0,
      archived: false,
      updatedAt: "",
    },
    exercise: worksheet.runtimeExerciseId ? { id: worksheet.runtimeExerciseId, title: "Practice", marks: worksheet.totalMarks, published: true, questionCount: worksheet.questionIds.length, route: null } : null,
    printableResource: worksheet.printableResourceId && resources.has(worksheet.printableResourceId) && worksheet.allowPrint ? resourceSummary(resources.get(worksheet.printableResourceId)!) : null,
    answerKeyResource: null,
    supportingResources: worksheet.supportingResourceIds.flatMap((id) => {
      const resource = resources.get(id);
      return resource && (mode !== "STUDENT" || resource.audience !== "TEACHER_ONLY") ? [resourceSummary(resource)] : [];
    }),
  }]));
}

export function resolveManifestMedia(
  manifest: SmartBookReleaseManifestV2,
  document: ContentDocument,
  mode: ContentRenderMode,
  releaseVersionId?: string,
): Record<string, ResolvedMediaBlock | null> {
  const media = new Map(manifest.assets.media.map((item) => [`${item.targetType}:${item.sourceId}`, item]));
  const resolved: Record<string, ResolvedMediaBlock | null> = {};
  for (const block of document.blocks) {
    if (!isMediaBlock(block)) continue;
    const item = media.get(`${block.targetType}:${block.targetId}`);
    if (!item) {
      resolved[block.id] = null;
      continue;
    }
    const mediaKind = manifestMediaKind(item.mediaType, item.targetType);
    const route = item.targetType === "RESOURCE"
      ? { href: smartBookReleaseResourcePath(mode, item.sourceId, releaseVersionId), openMode: "route" as const }
      : item.immutableReference?.kind === "EXTERNAL_REFERENCE" ? { href: item.immutableReference.value, openMode: "route" as const } : null;
    const posterResource = item.posterResourceId ? manifest.assets.resources.find((resource) => resource.sourceId === item.posterResourceId) : null;
    const posterRoute = posterResource && (mode !== "STUDENT" || posterResource.audience !== "TEACHER_ONLY")
      ? { href: smartBookReleaseResourcePath(mode, posterResource.sourceId, releaseVersionId), openMode: "route" as const }
      : null;
    resolved[block.id] = {
      mediaKind,
      targetType: item.targetType,
      targetId: item.sourceId,
      title: item.title,
      label: item.label,
      caption: item.caption,
      sourceBadge: "Released Smart Book",
      sourceDetail: item.provider ?? item.mediaType,
      scopeLabel: "Published release",
      route,
      posterRoute,
      displayMode: item.displayMode as never,
      autoplay: false,
      controls: true,
      required: false,
      audienceOptions: ["TEACHER", "STUDENT"],
      durationSeconds: null,
      published: true,
      teacherOnly: false,
      available: Boolean(route),
      offline: { contentVersion: 2, mediaKind, targetType: item.targetType, targetId: item.sourceId, posterResourceId: item.posterResourceId },
    };
  }
  return resolved;
}

export type ReleasedSmartBookWorksheetExecution = {
  worksheet: {
    id: string;
    title: string;
    instructions: string | null;
    showAnswersAfterSubmit: boolean;
    book: { id: string; title: string };
    chapter: { id: string; title: string; chapterNumber: number | null };
  };
  questions: Array<{ position: number; question: StudentWorksheetQuestionCandidate }>;
};

export type ReleasedSmartBookAssessmentExecution = {
  assessment: {
    sourceId: string;
    title: string;
    kind: string;
    deliveryMode: string;
    instructions: string | null;
    durationMinutes: number | null;
    totalMarks: number;
    allowOnlineAttempt: boolean;
    chapterId: string | null;
    chapterIds: string[];
  };
  questions: Array<{
    sourceQuestionId: string;
    bookId: string;
    chapterId: string;
    sequence: number;
    questionType: string;
    questionText: string;
    options: unknown;
    correctAnswer: string | null;
    explanation: string | null;
    marks: number;
  }>;
};

export function resolveManifestAssessmentExecution(input: {
  manifest: SmartBookReleaseManifestV2;
  protectedPayload: SmartBookProtectedReleasePayload;
  publisherAssessmentId: string;
  publisherId: string;
  bookId: string;
}): ReleasedSmartBookAssessmentExecution | null {
  if (input.manifest.identity.publisherId !== input.publisherId || input.manifest.identity.bookId !== input.bookId || input.manifest.identity.targetId !== input.bookId) return null;
  const safe = input.manifest.assets.assessments.find((item) => item.sourceId === input.publisherAssessmentId);
  const protectedAssessment = input.protectedPayload.assessments.find((item) => item.sourceId === input.publisherAssessmentId);
  if (!safe || !hasCompleteSafeAssessmentExecution(safe) || !protectedAssessment || !safe.allowOnlineAttempt || !["INTERACTIVE", "BOTH"].includes(safe.deliveryMode)) return null;
  if (
    protectedAssessment.publisherId !== input.publisherId ||
    protectedAssessment.bookId !== input.bookId ||
    protectedAssessment.kind !== safe.kind ||
    protectedAssessment.deliveryMode !== safe.deliveryMode ||
    protectedAssessment.instructions !== safe.instructions ||
    protectedAssessment.durationMinutes !== safe.durationMinutes ||
    protectedAssessment.totalMarks !== safe.totalMarks ||
    protectedAssessment.allowOnlineAttempt !== safe.allowOnlineAttempt ||
    protectedAssessment.allowPrint !== safe.allowPrint ||
    protectedAssessment.chapterId !== safe.chapterId ||
    protectedAssessment.moduleId !== safe.moduleId ||
    protectedAssessment.unitId !== safe.unitId ||
    protectedAssessment.partId !== safe.partId ||
    protectedAssessment.sourceUpdatedAt !== safe.sourceUpdatedAt ||
    !sameIds(protectedAssessment.chapterIds, safe.chapterIds) ||
    !sameIds(protectedAssessment.items.map((item) => item.sourceId), safe.itemSourceIds) ||
    !sameIds(protectedAssessment.items.map((item) => item.questionId), safe.questionIds) ||
    JSON.stringify(protectedAssessment.sectionInstructions) !== JSON.stringify(safe.sectionInstructions)
  ) return null;
  if (!protectedAssessment.items.length) return null;

  const chapterIds = new Set(input.manifest.hierarchy.filter((item) => item.kind === "CHAPTER").map((item) => item.sourceId));
  const protectedQuestions = new Map(input.protectedPayload.questions.map((question) => [question.sourceId, question]));
  const safeQuestions = new Map(input.manifest.assets.questions.map((question) => [question.sourceId, question]));
  const questions = protectedAssessment.items.map((item, index) => {
    const question = item.question;
    const protectedQuestion = protectedQuestions.get(item.questionId);
    const safeQuestion = safeQuestions.get(item.questionId);
    const snapshot: AssessmentQuestionSnapshot = {
      id: question.sourceId,
      questionType: question.questionType,
      questionText: question.questionText,
      options: question.options,
      correctAnswer: question.correctAnswer,
      marks: question.marks,
    };
    if (
      item.questionId !== question.sourceId ||
      !protectedQuestion ||
      JSON.stringify(protectedQuestion) !== JSON.stringify(question) ||
      !safeQuestion ||
      safeQuestion.questionType !== question.questionType ||
      safeQuestion.questionText !== question.questionText ||
      JSON.stringify(safeQuestion.options) !== JSON.stringify(question.options) ||
      safeQuestion.marks !== question.marks ||
      question.bookId !== input.bookId ||
      !chapterIds.has(question.chapterId) ||
      !isValidAssessmentQuestion(snapshot)
    ) return null;
    return {
      sourceQuestionId: question.sourceId,
      bookId: question.bookId,
      chapterId: question.chapterId,
      sequence: index + 1,
      questionType: question.questionType,
      questionText: question.questionText,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      marks: question.marks,
    };
  });
  if (questions.some((question) => question === null)) return null;
  const complete = questions as ReleasedSmartBookAssessmentExecution["questions"];
  const totalMarks = complete.reduce((sum, question) => sum + question.marks, 0);
  if (safe.totalMarks !== null && safe.totalMarks !== totalMarks) return null;

  return {
    assessment: {
      sourceId: safe.sourceId,
      title: safe.displayLabel,
      kind: safe.kind,
      deliveryMode: safe.deliveryMode,
      instructions: safe.instructions,
      durationMinutes: safe.durationMinutes,
      totalMarks,
      allowOnlineAttempt: safe.allowOnlineAttempt,
      chapterId: safe.chapterId,
      chapterIds: [...safe.chapterIds],
    },
    questions: complete,
  };
}

export function resolveManifestWorksheetExecution(input: {
  manifest: SmartBookReleaseManifestV2;
  protectedPayload: SmartBookProtectedReleasePayload;
  worksheetId: string;
  publisherId: string;
  bookId: string;
}): ReleasedSmartBookWorksheetExecution | null {
  if (input.manifest.identity.publisherId !== input.publisherId || input.manifest.identity.bookId !== input.bookId || input.manifest.identity.targetId !== input.bookId) return null;
  const safe = input.manifest.assets.worksheets.find((item) => item.sourceId === input.worksheetId);
  const protectedWorksheet = input.protectedPayload.worksheets.find((item) => item.sourceId === input.worksheetId);
  if (!safe || !protectedWorksheet || !safe.allowOnlineAttempt || !["STUDENT", "BOTH"].includes(safe.audience)) return null;
  if (
    protectedWorksheet.publisherId !== input.manifest.identity.publisherId ||
    protectedWorksheet.bookId !== input.manifest.identity.bookId ||
    protectedWorksheet.title !== safe.title ||
    protectedWorksheet.instructions !== safe.instructions ||
    protectedWorksheet.totalMarks !== safe.totalMarks ||
    protectedWorksheet.allowOnlineAttempt !== safe.allowOnlineAttempt ||
    protectedWorksheet.allowPrint !== safe.allowPrint ||
    !sameIds(safe.questionIds, protectedWorksheet.questionIds)
  ) return null;

  const chapter = input.manifest.hierarchy.find((item) => item.kind === "CHAPTER" && item.sourceId === protectedWorksheet.chapterId);
  if (!chapter) return null;
  const questionById = new Map(input.protectedPayload.questions.map((question) => [question.sourceId, question]));
  const questions = safe.questionIds.map((questionId, index) => {
    const question = questionById.get(questionId);
    if (!question || question.bookId !== input.manifest.identity.bookId) return null;
    const candidate = protectedQuestionCandidate(question);
    return isAvailableStudentWorksheetQuestion(candidate) ? { position: index + 1, question: candidate } : null;
  });
  if (questions.some((question) => question === null)) return null;

  return {
    worksheet: {
      id: safe.sourceId,
      title: safe.title,
      instructions: safe.instructions,
      showAnswersAfterSubmit: protectedWorksheet.showAnswersAfterSubmit,
      book: { id: input.manifest.identity.bookId, title: input.manifest.book.title },
      chapter: { id: chapter.sourceId, title: chapter.title, chapterNumber: chapter.number },
    },
    questions: questions as Array<{ position: number; question: StudentWorksheetQuestionCandidate }>,
  };
}

function protectedQuestionCandidate(question: SmartBookProtectedQuestion): StudentWorksheetQuestionCandidate {
  return {
    ...toBookQuestionSource(question),
    options: question.options ?? null,
    correctAnswer: question.correctAnswer ?? null,
    explanation: question.explanation ?? null,
    moduleId: question.moduleId ?? null,
    imageResourceId: question.imageResourceId ?? null,
    questionText: question.questionText,
    marks: question.marks,
    approved: true,
    archived: false,
    createdAt: new Date(question.sourceUpdatedAt),
  };
}

function sameIds(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]) && new Set(left).size === left.length;
}
