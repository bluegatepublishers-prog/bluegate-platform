"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { StudentWorkTargetInput, StudentWorkTypeName } from "@/lib/student-work-policy";
import {

  studentWorkTargetIdentity,
  studentWorkTargetMatches,
  type StudentWorkClientItem,
  type StudentWorkClientState,
} from "@/lib/student-work-client";

type StudentWorkMutationResult =
  | { ok: true; status: "SAVED"; item: StudentWorkClientItem; attemptNumber?: number }
  | { ok: false; status: "CONFLICT"; conflict: { revision: number | null; item: StudentWorkClientItem | null } };

type StudentWorkContextValue = {
  items: StudentWorkClientItem[];
  loading: boolean;
  loadError: string | null;
  reload: () => Promise<void>;
  getWork: (type: StudentWorkTypeName, target: StudentWorkTargetInput) => StudentWorkClientItem | undefined;
  getState: (type: StudentWorkTypeName, target: StudentWorkTargetInput) => StudentWorkClientState;
  save: (input: { type: StudentWorkTypeName; target: StudentWorkTargetInput; payload: unknown; recordAttempt?: boolean }) => Promise<StudentWorkMutationResult | null>;
  remove: (item: StudentWorkClientItem) => Promise<boolean>;
};

const StudentWorkContext = createContext<StudentWorkContextValue | null>(null);

export default function StudentWorkProvider({ bookId, children }: { bookId: string; children: ReactNode }) {
  const [items, setItems] = useState<StudentWorkClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [states, setStates] = useState<Record<string, StudentWorkClientState>>({});
  const [drafts, setDrafts] = useState<Record<string, StudentWorkClientItem>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`/api/student/books/${encodeURIComponent(bookId)}/work`, { cache: "no-store" });
      const body = await response.json().catch(() => null) as { items?: StudentWorkClientItem[] } | null;
      if (!response.ok || !body || !Array.isArray(body.items)) throw new Error("Student Work is unavailable.");
      setItems(body.items);
      setDrafts({});
      setStates({});
    } catch {
      setLoadError("Your personal work could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  const getWork = useCallback((type: StudentWorkTypeName, target: StudentWorkTargetInput) => {
    const identity = studentWorkTargetIdentity(type, target);
    const draft = drafts[identity];
    if (draft) return draft;
    return items.find((item) => item.type === type && studentWorkTargetMatches(item.target, target));
  }, [drafts, items]);

  const getState = useCallback((type: StudentWorkTypeName, target: StudentWorkTargetInput) => states[studentWorkTargetIdentity(type, target)] ?? "IDLE", [states]);

  const save = useCallback(async (input: { type: StudentWorkTypeName; target: StudentWorkTargetInput; payload: unknown; recordAttempt?: boolean }) => {
    const identity = studentWorkTargetIdentity(input.type, input.target);
    const current = getWork(input.type, input.target);
    const optimistic: StudentWorkClientItem = current
      ? { ...current, payload: input.payload }
      : { id: `local-${identity}`, type: input.type, targetKey: identity, target: input.target, payload: input.payload, revision: 0, status: "CURRENT", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setDrafts((previous) => ({ ...previous, [identity]: optimistic }));
    setStates((previous) => ({ ...previous, [identity]: "SAVING" }));
    try {
      const response = await fetch(`/api/student/books/${encodeURIComponent(bookId)}/work`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: input.type, target: input.target, payload: input.payload, ...(current ? { expectedRevision: current.revision } : {}), ...(input.recordAttempt ? { recordAttempt: true } : {}) }),
      });
      const result = await response.json().catch(() => null) as StudentWorkMutationResult | { message?: string } | null;
      if (result && "ok" in result && result.ok === true) {
        setItems((previous) => [...previous.filter((item) => item.id !== result.item.id && !studentWorkTargetMatches(item.target, input.target)), result.item]);
        setDrafts((previous) => { const next = { ...previous }; delete next[identity]; return next; });
        setStates((previous) => ({ ...previous, [identity]: "SAVED" }));
        return result;
      }
      if (result && "ok" in result && result.ok === false && result.status === "CONFLICT") {
        if (input.type === "READING_POSITION") {
          setItems((previous) => result.conflict.item ? [...previous.filter((item) => item.type !== "READING_POSITION"), result.conflict.item as StudentWorkClientItem] : previous.filter((item) => item.type !== "READING_POSITION"));
          setDrafts((previous) => { const next = { ...previous }; delete next[identity]; return next; });
          setStates((previous) => ({ ...previous, [identity]: "SAVED" }));
        } else {
          setStates((previous) => ({ ...previous, [identity]: "CONFLICT" }));
        }
        return result;
      }
      throw new Error("Student Work was not saved.");
    } catch {
      setStates((previous) => ({ ...previous, [identity]: "NOT_SAVED" }));
      return null;
    }
  }, [bookId, getWork]);

  const remove = useCallback(async (item: StudentWorkClientItem) => {
    const identity = studentWorkTargetIdentity(item.type, item.target);
    setStates((previous) => ({ ...previous, [identity]: "SAVING" }));
    try {
      const response = await fetch(`/api/student/books/${encodeURIComponent(bookId)}/work`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ workItemId: item.id, expectedRevision: item.revision }) });
      const result = await response.json().catch(() => null) as { ok?: boolean } | null;
      if (!response.ok || !result?.ok) throw new Error("Student Work was not deleted.");
      setItems((previous) => previous.filter((entry) => entry.id !== item.id));
      setDrafts((previous) => { const next = { ...previous }; delete next[identity]; return next; });
      setStates((previous) => ({ ...previous, [identity]: "SAVED" }));
      return true;
    } catch {
      setStates((previous) => ({ ...previous, [identity]: "NOT_SAVED" }));
      return false;
    }
  }, [bookId]);

  const visibleItems = useMemo(() => {
    const merged = new Map<string, StudentWorkClientItem>();
    for (const item of items) merged.set(studentWorkTargetIdentity(item.type, item.target), item);
    for (const item of Object.values(drafts)) merged.set(studentWorkTargetIdentity(item.type, item.target), item);
    return [...merged.values()];
  }, [drafts, items]);
  const value = useMemo(() => ({ items: visibleItems, loading, loadError, reload: load, getWork, getState, save, remove }), [getState, getWork, load, loadError, loading, remove, save, visibleItems]);
  return <StudentWorkContext.Provider value={value}>{children}</StudentWorkContext.Provider>;
}

export function useStudentWork() {
  const value = useContext(StudentWorkContext);
  if (!value) throw new Error("useStudentWork must be used inside StudentWorkProvider.");
  return value;
}
