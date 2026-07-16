import { validateRevisionChecklist } from "@/lib/student-revision-policy";

export interface TrustedRevisionContext {
  studentId: string;
  academicYearId: string;
}

export async function saveRevisionChecklistWithDependencies<T>(
  input: { bookId: string; chapterId: string; checklist: unknown },
  dependencies: {
    getContext(): Promise<TrustedRevisionContext>;
    authorize(bookId: string, chapterId: string, context: TrustedRevisionContext): Promise<boolean>;
    upsert(data: TrustedRevisionContext & { chapterId: string; checklist: ReturnType<typeof validateRevisionChecklist> & {} }): Promise<T>;
  },
) {
  const checklist = validateRevisionChecklist(input.checklist);
  if (!checklist) return { ok: false as const, message: "We could not save your revision checklist." };
  const context = await dependencies.getContext();
  if (!(await dependencies.authorize(input.bookId, input.chapterId, context))) {
    return { ok: false as const, message: "This chapter is not available for your account." };
  }
  const value = await dependencies.upsert({ ...context, chapterId: input.chapterId, checklist });
  return { ok: true as const, value };
}
