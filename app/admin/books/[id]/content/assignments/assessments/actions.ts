"use server";

import { PublisherAssessmentDeliveryMode, PublisherAssessmentKind } from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  addPublisherAssessmentQuestions,
  archivePublisherAssessment,
  createPublisherAssessment,
  movePublisherAssessmentItem,
  publishPublisherAssessment,
  PublisherAssessmentError,
  removePublisherAssessmentItem,
  replacePublisherAssessmentSectionInstructions,
  restorePublisherAssessment,
  updatePublisherAssessment,
} from "@/lib/publisher-assessment";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { requirePublisherAdminBookOwnership } from "@/lib/publisher-admin-data";

export type PublisherAssessmentDraftInput = {
  assessmentId?: string;
  kind: string;
  deliveryMode: string;
  chapterId?: string | null;
  unitId?: string | null;
  chapterIds?: string[];
  instructions?: string | null;
  durationMinutes?: number | null;
  sectionInstructions?: Array<{ questionType: string; instruction: string }>;
};

type ActionResult = { ok: true; assessmentId?: string } | { ok: false; message: string };

function parseDraft(input: PublisherAssessmentDraftInput) {
  if (!Object.values(PublisherAssessmentKind).includes(input.kind as PublisherAssessmentKind)) throw new PublisherAssessmentError("Choose a supported assessment kind.");
  if (!Object.values(PublisherAssessmentDeliveryMode).includes(input.deliveryMode as PublisherAssessmentDeliveryMode)) throw new PublisherAssessmentError("Choose a supported assessment mode.");
  return {
    kind: input.kind as PublisherAssessmentKind,
    deliveryMode: input.deliveryMode as PublisherAssessmentDeliveryMode,
    chapterId: input.chapterId ?? null,
    moduleId: null,
    unitId: input.unitId ?? null,
    partId: null,
    chapterIds: Array.isArray(input.chapterIds) ? input.chapterIds : [],
    instructions: input.instructions ?? null,
    durationMinutes: input.durationMinutes ?? null,
  };
}

function failure(error: unknown): ActionResult {
  return { ok: false, message: error instanceof Error ? error.message : "Unable to update assessment." };
}

function paths(bookId: string, assessmentId?: string) {
  const base = `/admin/books/${bookId}/content/assignments/assessments`;
  return { base, editor: assessmentId ? `${base}/${assessmentId}` : base };
}

export async function savePublisherAssessmentAction(bookId: string, input: PublisherAssessmentDraftInput): Promise<ActionResult> {
  try {
    const [actor] = await Promise.all([requireLivePublisherAdmin(), requirePublisherAdminBookOwnership(bookId)]);
    const draft = parseDraft(input);
    const assessment = input.assessmentId
      ? await updatePublisherAssessment({ publisherId: actor.publisherId, bookId, assessmentId: input.assessmentId, ...draft })
      : await createPublisherAssessment({ publisherId: actor.publisherId, bookId, ...draft });
    if (input.sectionInstructions !== undefined) await replacePublisherAssessmentSectionInstructions({ publisherId: actor.publisherId, bookId, assessmentId: assessment.id, instructions: input.sectionInstructions });
    const target = paths(bookId, assessment.id);
    revalidatePath(target.base);
    revalidatePath(target.editor);
    return { ok: true, assessmentId: assessment.id };
  } catch (error) {
    return failure(error);
  }
}

export async function publishPublisherAssessmentAction(bookId: string, assessmentId: string): Promise<ActionResult> {
  try {
    const actor = await requireLivePublisherAdmin();
    await requirePublisherAdminBookOwnership(bookId);
    await publishPublisherAssessment({ publisherId: actor.publisherId, bookId, assessmentId });
    const target = paths(bookId, assessmentId);
    revalidatePath(target.base);
    revalidatePath(target.editor);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function archivePublisherAssessmentAction(bookId: string, assessmentId: string): Promise<ActionResult> {
  try {
    const actor = await requireLivePublisherAdmin();
    await requirePublisherAdminBookOwnership(bookId);
    await archivePublisherAssessment({ publisherId: actor.publisherId, bookId, assessmentId });
    const target = paths(bookId, assessmentId);
    revalidatePath(target.base);
    revalidatePath(target.editor);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function restorePublisherAssessmentAction(bookId: string, assessmentId: string): Promise<ActionResult> {
  try {
    const actor = await requireLivePublisherAdmin();
    await requirePublisherAdminBookOwnership(bookId);
    await restorePublisherAssessment({ publisherId: actor.publisherId, bookId, assessmentId });
    const target = paths(bookId, assessmentId);
    revalidatePath(target.base);
    revalidatePath(target.editor);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function addPublisherAssessmentQuestionsAction(bookId: string, assessmentId: string, questionIds: string[]): Promise<ActionResult> {
  try {
    const actor = await requireLivePublisherAdmin();
    await requirePublisherAdminBookOwnership(bookId);
    await addPublisherAssessmentQuestions({ publisherId: actor.publisherId, bookId, assessmentId, questionIds });
    revalidatePath(paths(bookId, assessmentId).editor);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function removePublisherAssessmentItemAction(bookId: string, assessmentId: string, itemId: string): Promise<ActionResult> {
  try {
    const actor = await requireLivePublisherAdmin();
    await requirePublisherAdminBookOwnership(bookId);
    await removePublisherAssessmentItem({ publisherId: actor.publisherId, bookId, assessmentId, itemId });
    revalidatePath(paths(bookId, assessmentId).editor);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function movePublisherAssessmentItemAction(bookId: string, assessmentId: string, itemId: string, direction: -1 | 1): Promise<ActionResult> {
  try {
    const actor = await requireLivePublisherAdmin();
    await requirePublisherAdminBookOwnership(bookId);
    await movePublisherAssessmentItem({ publisherId: actor.publisherId, bookId, assessmentId, itemId, direction });
    revalidatePath(paths(bookId, assessmentId).editor);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
