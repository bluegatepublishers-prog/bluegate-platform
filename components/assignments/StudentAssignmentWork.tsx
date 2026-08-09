"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { AssignmentCompletionSummary } from "@/lib/assignments/assignment-completion";

type ItemState = "CURRENT" | "SOURCE_CHANGED" | "MISSING_TARGET";
type WorkState = "IDLE" | "SAVING" | "SAVED" | "NOT_SAVED" | "CONFLICT";

export type AssignmentDeliveryItem = {
  id: string;
  type: "PUBLISHER_PAGE" | "PUBLISHER_QUESTION" | "INSTRUCTION" | "TEACHER_QUESTION";
  sequence: number;
  state: ItemState;
  label: string | null;
  sourceHash: string | null;
  target: { moduleId?: string; pageId?: string; frameId?: string; childFrameId?: string; questionId?: string };
  payload?: { text: string };
  page?: { moduleId: string; chapterId: string; pageId: string; pageNumber: number; title: string };
  question?: { id: string; type: string; prompt: string; instructions?: string; options?: Array<{ id: string; text: string }> };
  currentTargetSourceHash?: string | null;
};

export type AssignmentWorkSnapshot = {
  id: string;
  assignmentItemId: string | null;
  payload: unknown;
  revision: number;
  targetSourceHash: string | null;
  createdAt: string;
  updatedAt: string;
};

type AssignmentWorkContextValue = {
  getWork: (assignmentItemId: string) => AssignmentWorkSnapshot | undefined;
  getState: (assignmentItemId: string) => WorkState;
  getMessage: (assignmentItemId: string) => string | null;
  save: (assignmentItemId: string, payload: unknown) => Promise<void>;
  reload: () => Promise<void>;
  editable: boolean;
};

const AssignmentWorkContext = createContext<AssignmentWorkContextValue | null>(null);

function answerText(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "";
  const record = payload as Record<string, unknown>;
  return typeof record.value === "string" ? record.value : typeof record.text === "string" ? record.text : "";
}

function answerOptionIds(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const optionIds = (payload as Record<string, unknown>).optionIds;
  return Array.isArray(optionIds) ? optionIds.filter((value): value is string => typeof value === "string") : [];
}

export default function StudentAssignmentWork({
  assignmentId,
  bookId,
  sectionSubjectId,
  items,
  initialWork,
  completion,
  editable,
}: {
  assignmentId: string;
  bookId: string | null;
  sectionSubjectId: string | null;
  items: AssignmentDeliveryItem[];
  initialWork: AssignmentWorkSnapshot[];
  completion: AssignmentCompletionSummary;
  editable: boolean;
}) {
  if (!items.length) {
    return <section aria-labelledby="assignment-work-heading" className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 id="assignment-work-heading" className="text-xl font-bold">Assignment Work</h2>
    <CompletionSummary completion={completion} />
      <p className="mt-2 text-sm text-slate-600">No additional assignment work.</p>
    </section>;
  }
  const answerable = items.some((item) => item.type === "PUBLISHER_QUESTION" || item.type === "TEACHER_QUESTION");
  return answerable && bookId
    ? <AssignmentWorkProvider assignmentId={assignmentId} bookId={bookId} initialWork={initialWork} editable={editable}><AssignmentWorkListWithContext assignmentId={assignmentId} sectionSubjectId={sectionSubjectId} items={items} completion={completion} /></AssignmentWorkProvider>
    : <AssignmentWorkList assignmentId={assignmentId} sectionSubjectId={sectionSubjectId} items={items} completion={completion} />;
}

function AssignmentWorkProvider({
  assignmentId,
  bookId,
  initialWork,
  editable,
  children,
}: {
  assignmentId: string;
  bookId: string;
  initialWork: AssignmentWorkSnapshot[];
  editable: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [work, setWork] = useState(initialWork);
  const [drafts, setDrafts] = useState<Record<string, AssignmentWorkSnapshot>>({});
  const [states, setStates] = useState<Record<string, WorkState>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});

  const getWork = useCallback((assignmentItemId: string) => drafts[assignmentItemId] ?? work.find((item) => item.assignmentItemId === assignmentItemId), [drafts, work]);
  const getState = useCallback((assignmentItemId: string) => states[assignmentItemId] ?? "IDLE", [states]);
  const getMessage = useCallback((assignmentItemId: string) => messages[assignmentItemId] ?? null, [messages]);

  const reload = useCallback(async () => {
    try {
      const response = await fetch(`/api/student/books/${encodeURIComponent(bookId)}/work?assignmentId=${encodeURIComponent(assignmentId)}`, { cache: "no-store" });
      const body = await response.json().catch(() => null) as { work?: AssignmentWorkSnapshot[] } | null;
      if (!response.ok || !body || !Array.isArray(body.work)) throw new Error("reload");
      setWork(body.work);
      setDrafts({});
      setStates({});
      setMessages({});
    } catch {
      setMessages((previous) => ({ ...previous, reload: "The saved answer could not be reloaded. Try again." }));
    }
  }, [assignmentId, bookId]);

  const save = useCallback(async (assignmentItemId: string, payload: unknown) => {
    const current = getWork(assignmentItemId);
    const optimistic: AssignmentWorkSnapshot = {
      id: current?.id ?? `local-${assignmentItemId}`,
      assignmentItemId,
      payload,
      revision: current?.revision ?? 0,
      targetSourceHash: current?.targetSourceHash ?? null,
      createdAt: current?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDrafts((previous) => ({ ...previous, [assignmentItemId]: optimistic }));
    setStates((previous) => ({ ...previous, [assignmentItemId]: "SAVING" }));
    setMessages((previous) => { const next = { ...previous }; delete next[assignmentItemId]; return next; });
    try {
      const response = await fetch(`/api/student/books/${encodeURIComponent(bookId)}/work`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "ANSWER",
          target: {},
          payload,
          assignmentItemId,
          ...(current ? { expectedRevision: current.revision } : {}),
        }),
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; status?: string; message?: string; item?: AssignmentWorkSnapshot & { assignmentItemId?: string | null }; conflict?: { revision: number | null } } | null;
      if (result?.ok && result.item) {
        const saved = { ...result.item, assignmentItemId: result.item.assignmentItemId ?? assignmentItemId };
        setWork((previous) => [...previous.filter((item) => item.assignmentItemId !== assignmentItemId), saved]);
        setDrafts((previous) => { const next = { ...previous }; delete next[assignmentItemId]; return next; });
        setStates((previous) => ({ ...previous, [assignmentItemId]: "SAVED" }));
        router.refresh();
        return;
      }
      if (result?.status === "CONFLICT") {
        setStates((previous) => ({ ...previous, [assignmentItemId]: "CONFLICT" }));
        setMessages((previous) => ({ ...previous, [assignmentItemId]: "This answer changed elsewhere. Reload before saving again." }));
        return;
      }
      throw new Error(result?.message || "save");
    } catch (error) {
      setStates((previous) => ({ ...previous, [assignmentItemId]: "NOT_SAVED" }));
      setMessages((previous) => ({ ...previous, [assignmentItemId]: error instanceof Error && error.message ? error.message : "Your answer could not be saved. Try again." }));
    }
  }, [bookId, getWork, router]);

  const value = useMemo(() => ({ getWork, getState, getMessage, save, reload, editable }), [editable, getMessage, getState, getWork, reload, save]);
  return <AssignmentWorkContext.Provider value={value}>{children}</AssignmentWorkContext.Provider>;
}

function useAssignmentWork() {
  const value = useContext(AssignmentWorkContext);
  if (!value) throw new Error("Assignment response controls require Assignment Work context.");
  return value;
}

function AssignmentWorkListWithContext(props: { assignmentId: string; sectionSubjectId: string | null; items: AssignmentDeliveryItem[]; completion: AssignmentCompletionSummary }) {
  const { getWork } = useAssignmentWork();
  return <AssignmentWorkList {...props} questionKey={(itemId) => {
    const current = getWork(itemId);
    return `${current?.id ?? "empty"}:${current?.revision ?? 0}`;
  }} />;
}

function AssignmentWorkList({
  assignmentId,
  sectionSubjectId,
  items,
  completion,
  questionKey,
}: {
  assignmentId: string;
  sectionSubjectId: string | null;
  items: AssignmentDeliveryItem[];
  completion: AssignmentCompletionSummary;
  questionKey?: (itemId: string) => string;
}) {
  return <section aria-labelledby="assignment-work-heading" className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
    <h2 id="assignment-work-heading" className="text-xl font-bold">Assignment Work</h2>
    <CompletionSummary completion={completion} />
    <ol className="mt-4 space-y-4">
      {items.map((item) => <AssignmentWorkCard key={item.id} assignmentId={assignmentId} sectionSubjectId={sectionSubjectId} questionKey={questionKey?.(item.id)} item={item} />)}
    </ol>
  </section>;
}

function AssignmentWorkCard({
  assignmentId,
  sectionSubjectId,
  questionKey,
  item,
}: {
  assignmentId: string;
  sectionSubjectId: string | null;
  questionKey?: string;
  item: AssignmentDeliveryItem;
}) {
  const type = item.type === "PUBLISHER_PAGE"
    ? "Read"
    : item.type === "PUBLISHER_QUESTION"
      ? "Book Question"
      : item.type === "INSTRUCTION"
        ? "Instruction"
        : "Teacher Question";
  const missing = item.state === "MISSING_TARGET";
  const sourceChanged = item.state === "SOURCE_CHANGED";
  const pageTitle = item.page?.title ?? item.label ?? "Book page";
  const pageHref = item.page && sectionSubjectId
    ? `/student-dashboard/subjects/${encodeURIComponent(sectionSubjectId)}/chapters/${encodeURIComponent(item.page.chapterId)}?moduleId=${encodeURIComponent(item.page.moduleId)}&pageId=${encodeURIComponent(item.page.pageId)}&returnTo=${encodeURIComponent(`/student-dashboard/assignments/${assignmentId}`)}`
    : null;
  return <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">{item.sequence}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-blue-700">{type}</p>
        {item.type === "PUBLISHER_PAGE" ? <h3 className="mt-1 break-words text-lg font-bold">Page {item.page?.pageNumber ?? "—"} — {pageTitle}</h3> : item.question ? <h3 className="mt-1 break-words text-lg font-bold">{item.question.prompt}</h3> : <h3 className="mt-1 break-words text-lg font-bold">{item.label ?? type}</h3>}
        {item.question?.instructions ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{item.question.instructions}</p> : null}
        {item.type === "INSTRUCTION" && item.payload?.text ? <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{item.payload.text}</p> : null}
        {sourceChanged ? <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900">Book content has been updated since this work was assigned.</p> : null}
        {missing ? <p className="mt-2 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-900">This book content is no longer available.</p> : null}
        {item.type === "PUBLISHER_PAGE" ? <div className="mt-3">{pageHref && !missing ? <a href={pageHref} className="inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-4 py-2 font-bold text-white">Open Page</a> : <button type="button" disabled className="min-h-11 rounded-xl border px-4 py-2 font-bold text-slate-400">Open Page unavailable</button>}</div> : null}
        {item.question && !missing ? <AssignmentQuestionResponse key={`${item.id}:${questionKey ?? item.question.id}`} item={item} /> : null}
      </div>
    </div>
  </li>;
}

function AssignmentQuestionResponse({ item }: { item: AssignmentDeliveryItem }) {
  const { getWork, getState, getMessage, save, reload, editable } = useAssignmentWork();
  const current = getWork(item.id);
  const [value, setValue] = useState(() => answerText(current?.payload));
  const [selectedOption, setSelectedOption] = useState(() => answerOptionIds(current?.payload)[0] ?? "");
  const normalizedType = item.question?.type.toUpperCase().replaceAll("-", "_").replaceAll(" ", "_") ?? "SHORT_TEXT";
  const isChoice = normalizedType === "MCQ" || normalizedType === "TRUE_FALSE" || normalizedType === "TRUEFALSE";
  const isLong = normalizedType === "LONG_TEXT" || normalizedType === "LONG";
  const options = item.question?.options?.length
    ? item.question.options
    : normalizedType === "TRUE_FALSE" || normalizedType === "TRUEFALSE"
      ? [{ id: "true", text: "True" }, { id: "false", text: "False" }]
      : [];
  const state = getState(item.id);
  const message = getMessage(item.id);
  const saveText = () => {
    if (!value.trim()) return;
    void save(item.id, { value: value.trim(), status: "DRAFT" });
  };
  const saveOption = (optionId: string) => {
    setSelectedOption(optionId);
    void save(item.id, { optionIds: [optionId], status: "DRAFT" });
  };
  const retry = () => {
    if (isChoice && selectedOption) void saveOption(selectedOption);
    else if (!isChoice && value.trim()) void saveText();
  };
  if (!isChoice && !["SHORT_TEXT", "LONG_TEXT", "SHORT", "LONG", "FILL", "ONE_WORD", "VERY_SHORT"].includes(normalizedType)) {
    return <p className="mt-3 rounded-xl border bg-white p-3 text-sm text-slate-600">This response type is not available here.</p>;
  }
  if (!editable) return <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-sm font-semibold text-slate-700">Saved answer</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">{isChoice ? (options.find((option) => option.id === selectedOption)?.text ?? "No answer saved.") : (value || "No answer saved.")}</p></div>;
  return <div className="mt-3 rounded-xl border border-blue-100 bg-white p-3">
    <label className="text-xs font-bold uppercase tracking-wide text-blue-700" htmlFor={`assignment-answer-${item.id}`}>Your answer</label>
    {isChoice ? <fieldset className="mt-2 space-y-2" aria-label={item.question?.prompt}>
      <legend className="sr-only">{item.question?.prompt}</legend>
      {options.map((option) => <label key={option.id} className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm text-slate-800">
        <input type="radio" name={`assignment-answer-${item.id}`} value={option.id} checked={selectedOption === option.id} onChange={() => saveOption(option.id)} className="h-4 w-4" />
        <span>{option.text}</span>
      </label>)}
    </fieldset> : <textarea id={`assignment-answer-${item.id}`} aria-label={`Your answer to ${item.question?.prompt}`} value={value} onChange={(event) => setValue(event.target.value)} rows={isLong ? 5 : 2} maxLength={20_000} className="mt-2 min-h-11 w-full resize-y rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300" placeholder="Type your answer" />}
    {message ? <p aria-live="polite" className={`mt-2 text-sm font-semibold ${state === "CONFLICT" || state === "NOT_SAVED" ? "text-rose-700" : "text-slate-600"}`}>{message}</p> : state === "SAVING" ? <p aria-live="polite" className="mt-2 text-sm text-slate-500">Saving…</p> : state === "SAVED" ? <p aria-live="polite" className="mt-2 text-sm text-emerald-700">Saved</p> : null}
    {state === "CONFLICT" ? <button type="button" onClick={() => void reload()} className="mt-2 min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold text-rose-700">Reload saved version</button> : null}
    {state === "NOT_SAVED" ? <button type="button" onClick={retry} className="mt-2 min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold text-rose-700">Retry save</button> : null}
    {!isChoice ? <button type="button" onClick={saveText} className="mt-3 min-h-11 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Save answer</button> : null}
  </div>;
}

function CompletionSummary({ completion }: { completion: AssignmentCompletionSummary }) {
  if (completion.totalAnswerable === 0) return <p className="mt-2 text-sm text-slate-600">No answerable questions are required in Assignment Work.</p>;
  if (completion.canSubmit) return <p className="mt-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">All {completion.totalAnswerable} question{completion.totalAnswerable === 1 ? " is" : "s are"} answered and saved.</p>;
  return <div className="mt-2 space-y-2"><p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">{completion.remainingAnswerable} question{completion.remainingAnswerable === 1 ? " remains" : "s remain"} before Homework can be submitted.</p>{completion.staleAnswerable > 0 ? <p className="text-sm text-amber-900">{completion.staleAnswerable} saved answer{completion.staleAnswerable === 1 ? " needs" : "s need"} review because the book content changed.</p> : null}{completion.unavailableAnswerable > 0 ? <p className="text-sm text-slate-600">{completion.unavailableAnswerable} unavailable book question{completion.unavailableAnswerable === 1 ? " is" : "s are"} not required for submission.</p> : null}</div>;
}