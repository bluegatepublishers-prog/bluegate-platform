"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { BookOpen, Brain, ClipboardList, Eye, FileSearch, Lightbulb, MessageCircle, Pencil, Play, Puzzle, Sparkles, Target, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import type { ContentBlock } from "@/lib/content-document";
import type { LayoutV2Frame } from "@/lib/content-layout-v2";
import { isEducationalObjectType, type EducationalObjectType } from "@/lib/educational-object-registry";
import V2EducationalOverlay from "@/components/content/v2/V2EducationalOverlay";

export const V2_EDUCATIONAL_BUTTON_TYPES = ["LEARNING_OBJECTIVE", "TEACHER_NOTE", "HOTS", "DID_YOU_KNOW", "VOCABULARY", "EXAMPLE", "OBSERVATION", "CASE_STUDY", "REMEMBER", "TIP", "THINK_AND_DISCUSS", "THINK_AND_ANSWER", "THINK_AND_WRITE", "KEY_POINT", "FACT_BOX", "COMPETENCY_QUESTION", "LIFE_SKILL", "ACTIVITY", "VIDEO", "EXERCISE", "WORKSHEET", "CALLOUT", "RESOURCE"] as const;
export type V2EducationalButtonType = (typeof V2_EDUCATIONAL_BUTTON_TYPES)[number];

type ButtonDefinition = { label: string; Icon: LucideIcon; accent: string; tint: string; border: string };

const BUTTON_DEFINITIONS: Record<V2EducationalButtonType, ButtonDefinition> = {
  LEARNING_OBJECTIVE: { label: "Learning Objective", Icon: Target, accent: "#4338ca", tint: "#eef2ff", border: "#c7d2fe" },
  TEACHER_NOTE: { label: "Teacher's Note", Icon: UserRound, accent: "#475569", tint: "#f8fafc", border: "#cbd5e1" },
  HOTS: { label: "HOTS", Icon: Brain, accent: "#9d174d", tint: "#fdf2f8", border: "#f9a8d4" },
  DID_YOU_KNOW: { label: "Did You Know?", Icon: Lightbulb, accent: "#0e7490", tint: "#ecfeff", border: "#67e8f9" },
  VOCABULARY: { label: "Vocabulary", Icon: BookOpen, accent: "#0f766e", tint: "#f0fdfa", border: "#99f6e4" },
  EXAMPLE: { label: "Example", Icon: Sparkles, accent: "#15803d", tint: "#f0fdf4", border: "#86efac" },
  OBSERVATION: { label: "Observation", Icon: Eye, accent: "#0369a1", tint: "#eff6ff", border: "#93c5fd" },
  CASE_STUDY: { label: "Case Study", Icon: FileSearch, accent: "#155e75", tint: "#ecfeff", border: "#a5f3fc" },
  ACTIVITY: { label: "Activity", Icon: Puzzle, accent: "#7c3aed", tint: "#f5f3ff", border: "#ddd6fe" },
  REMEMBER: { label: "Remember", Icon: Lightbulb, accent: "#b45309", tint: "#fffbeb", border: "#fcd34d" },
  TIP: { label: "Tip", Icon: Lightbulb, accent: "#0f766e", tint: "#f0fdfa", border: "#99f6e4" },
  THINK_AND_DISCUSS: { label: "Think and Discuss", Icon: MessageCircle, accent: "#7c3aed", tint: "#f5f3ff", border: "#ddd6fe" },
  THINK_AND_ANSWER: { label: "Think and Answer", Icon: MessageCircle, accent: "#4338ca", tint: "#eef2ff", border: "#c7d2fe" },
  THINK_AND_WRITE: { label: "Think and Write", Icon: Pencil, accent: "#0369a1", tint: "#eff6ff", border: "#93c5fd" },
  KEY_POINT: { label: "Key Point", Icon: Target, accent: "#be123c", tint: "#fff1f2", border: "#fda4af" },
  FACT_BOX: { label: "Fact Box", Icon: BookOpen, accent: "#0e7490", tint: "#ecfeff", border: "#67e8f9" },
  COMPETENCY_QUESTION: { label: "Competency Question", Icon: Target, accent: "#6d28d9", tint: "#f5f3ff", border: "#c4b5fd" },
  LIFE_SKILL: { label: "Life Skill", Icon: Sparkles, accent: "#15803d", tint: "#f0fdf4", border: "#86efac" },
  VIDEO: { label: "Watch Video", Icon: Play, accent: "#4f46e5", tint: "#eef2ff", border: "#c7d2fe" },
  EXERCISE: { label: "Exercise", Icon: Pencil, accent: "#b45309", tint: "#fffbeb", border: "#fcd34d" },
  WORKSHEET: { label: "Worksheet", Icon: ClipboardList, accent: "#0369a1", tint: "#f0f9ff", border: "#7dd3fc" },
  CALLOUT: { label: "Callout", Icon: MessageCircle, accent: "#6d28d9", tint: "#f5f3ff", border: "#c4b5fd" },
  RESOURCE: { label: "Resource", Icon: BookOpen, accent: "#475569", tint: "#f8fafc", border: "#cbd5e1" },
};

const EDUCATIONAL_OBJECT_BUTTON_TYPES: Partial<Record<EducationalObjectType, V2EducationalButtonType>> = {
  learningOutcome: "LEARNING_OBJECTIVE", learningObjective: "LEARNING_OBJECTIVE", teacherNote: "TEACHER_NOTE", hots: "HOTS", didYouKnow: "DID_YOU_KNOW", vocabulary: "VOCABULARY", example: "EXAMPLE", caseStudy: "CASE_STUDY", thinkAndDiscuss: "THINK_AND_DISCUSS", thinkAndAnswer: "THINK_AND_ANSWER", thinkAndWrite: "THINK_AND_WRITE", remember: "REMEMBER", keyPoint: "KEY_POINT", factBox: "FACT_BOX", competencyQuestion: "COMPETENCY_QUESTION", lifeSkill: "LIFE_SKILL",
};

const INFO_BOX_BUTTON_TYPES: Record<string, V2EducationalButtonType> = { example: "EXAMPLE", didYouKnow: "DID_YOU_KNOW", caseStudy: "CASE_STUDY", teacherTip: "TEACHER_NOTE", observationPrompt: "OBSERVATION", tip: "TIP", remember: "REMEMBER", keyPoint: "KEY_POINT", factBox: "FACT_BOX", thinkAndDiscuss: "THINK_AND_DISCUSS", thinkAndAnswer: "THINK_AND_ANSWER", thinkAndWrite: "THINK_AND_WRITE", competencyQuestion: "COMPETENCY_QUESTION", lifeSkill: "LIFE_SKILL" };

export function getV2EducationalButtonType(frame: LayoutV2Frame, block?: ContentBlock): V2EducationalButtonType | null {
  if (block?.type === "activity" || frame.type === "ACTIVITY") return "ACTIVITY";
  if (block?.type === "worksheet" || frame.type === "WORKSHEET") return "WORKSHEET";
  if (block?.type === "exercise" || frame.type === "EXERCISE") return "EXERCISE";
  if (block?.type === "linkedAsset") {
    if (block.assetKind === "video") return "VIDEO";
    if (block.assetKind === "worksheet") return "WORKSHEET";
    if (block.assetKind === "activity") return "ACTIVITY";
    if (block.assetKind === "exercise") return "EXERCISE";
    if (block.assetKind === "learningOutcome") return "LEARNING_OBJECTIVE";
    return "RESOURCE";
  }
  if (block?.type === "educationalObject") return EDUCATIONAL_OBJECT_BUTTON_TYPES[block.objectType] ?? "DID_YOU_KNOW";
  if (block?.type === "infoBox") return INFO_BOX_BUTTON_TYPES[block.variant] ?? "DID_YOU_KNOW";
  if (block?.type === "observationBox") return "OBSERVATION";
  if (block?.type === "callout") return "CALLOUT";
  if (frame.type === "EDUCATIONAL") {
    const payload = asRecord(frame.payload);
    return isEducationalObjectType(payload.educationalObjectType) ? EDUCATIONAL_OBJECT_BUTTON_TYPES[payload.educationalObjectType] ?? "DID_YOU_KNOW" : "DID_YOU_KNOW";
  }
  return null;
}

export function isV2EducationalButtonBlock(block: ContentBlock): boolean {
  return ["activity", "worksheet", "exercise", "educationalObject", "infoBox", "observationBox", "callout", "linkedAsset"].includes(block.type);
}

export function getV2EducationalButtonPresentation(frame: LayoutV2Frame, block?: ContentBlock) {
  const type = getV2EducationalButtonType(frame, block) ?? "RESOURCE";
  const definition = BUTTON_DEFINITIONS[type];
  const payload = asRecord(frame.payload);
  const subtitle = compactText(block?.type === "linkedAsset" || block?.type === "media" ? block.label : block?.title ?? (block?.type === "educationalObject" || block?.type === "infoBox" || block?.type === "observationBox" || block?.type === "callout" ? block.text : undefined) ?? (typeof payload.title === "string" ? payload.title : undefined) ?? (typeof frame.narrationLabel === "string" ? frame.narrationLabel : undefined));
  const disabled = Boolean(frame.contentRef?.blockId) && !block;
  return { type, label: definition.label, Icon: definition.Icon, accent: definition.accent, tint: definition.tint, border: definition.border, subtitle, disabled };
}

export default function V2EducationalButtonVisual({ frame, block, type, label, icon: Icon, subtitle, disabled, openable = false, overlayContent }: { frame: LayoutV2Frame; block?: ContentBlock; type?: V2EducationalButtonType; label?: string; icon?: LucideIcon; subtitle?: string; disabled?: boolean; openable?: boolean; overlayContent?: ReactNode }) {
  const mapped = getV2EducationalButtonPresentation(frame, block);
  const ButtonIcon = Icon ?? mapped.Icon;
  const resolvedType = type ?? mapped.type;
  const resolvedLabel = label ?? mapped.label;
  const resolvedSubtitle = subtitle ?? mapped.subtitle;
  const isDisabled = disabled ?? mapped.disabled;
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => { if (wasOpen.current && !open) triggerRef.current?.focus(); wasOpen.current = open; }, [open]);
  const payload = asRecord(frame.payload);
  const radius = typeof payload.radius === "number" ? Math.max(0, Math.min(32, payload.radius)) : 10;
  const style = { background: `linear-gradient(135deg, ${mapped.tint}, #ffffff)`, border: `1px solid ${mapped.border}`, borderRadius: radius, color: frame.textColor ?? "#0f172a", opacity: isDisabled ? 0.58 : 1, fontFamily: frame.fontFamily };
  const content = <><span aria-hidden="true" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/85 shadow-sm" style={{ color: mapped.accent }}><ButtonIcon size={20} strokeWidth={2.25} /></span><span className="min-w-0"><span className="block truncate text-sm font-bold">{resolvedLabel}</span>{resolvedSubtitle ? <span className="block truncate text-xs font-medium text-slate-600">{resolvedSubtitle}</span> : null}</span></>;
  return <>
    {openable ? <button ref={triggerRef} type="button" data-v2-educational-button data-v2-educational-button-type={resolvedType} data-v2-educational-button-disabled={isDisabled ? "true" : "false"} aria-label={resolvedSubtitle ? `${resolvedLabel}: ${resolvedSubtitle}` : resolvedLabel} aria-disabled={isDisabled} aria-haspopup="dialog" onClick={(event) => { event.stopPropagation(); setOpen(true); }} className="flex h-full w-full items-center gap-3 overflow-hidden px-4 text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" style={style}>{content}</button> : <div data-v2-educational-button data-v2-educational-button-type={resolvedType} data-v2-educational-button-disabled={isDisabled ? "true" : "false"} aria-label={resolvedSubtitle ? `${resolvedLabel}: ${resolvedSubtitle}` : resolvedLabel} aria-disabled={isDisabled} className="flex h-full w-full items-center gap-3 overflow-hidden px-4 text-left shadow-sm" style={style}>{content}</div>}
    {open ? <V2EducationalOverlay title={resolvedLabel} onClose={close}>{overlayContent}</V2EducationalOverlay> : null}
  </>;
}

export function V2EducationalPreviewAction({ frame, block, content }: { frame: LayoutV2Frame; block?: ContentBlock; content?: ReactNode }) {
  const presentation = getV2EducationalButtonPresentation(frame, block);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => { if (wasOpen.current && !open) triggerRef.current?.focus(); wasOpen.current = open; }, [open]);
  return <><button ref={triggerRef} type="button" data-v2-educational-preview aria-haspopup="dialog" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setOpen(true); }} className="rounded-md bg-indigo-600 px-2 py-1 text-[10px] font-bold text-white shadow hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Preview</button>{open ? <V2EducationalOverlay title={presentation.label} onClose={close}>{content}</V2EducationalOverlay> : null}</>;
}

function asRecord(value: unknown): Record<string, unknown> { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
function compactText(value: string | undefined) { if (!value?.trim()) return undefined; const normalized = value.replace(/\s+/g, " ").trim(); return normalized.length > 90 ? `${normalized.slice(0, 87)}…` : normalized; }
