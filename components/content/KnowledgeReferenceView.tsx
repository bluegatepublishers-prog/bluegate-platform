import type { ReactNode } from "react";

import type {
  KnowledgeDefinitionSummary,
  KnowledgeReference,
} from "@/lib/content-knowledge-types";
import { knowledgeReferenceTypeLabel } from "@/lib/content-knowledge-types";

type KnowledgeReferenceViewProps = {
  reference: KnowledgeReference;
  definition: KnowledgeDefinitionSummary | null;
  text: ReactNode;
};

export default function KnowledgeReferenceView({
  reference,
  definition,
  text,
}: KnowledgeReferenceViewProps) {
  const color =
    reference.type === "VOCABULARY"
      ? "decoration-emerald-500 bg-emerald-50 text-emerald-900"
      : "decoration-indigo-500 bg-indigo-50 text-indigo-900";

  return (
    <span className="relative inline-block">
      <details className="inline">
        <summary
          className={`inline cursor-pointer rounded px-1 font-semibold underline decoration-2 underline-offset-4 ${color}`}
        >
          {text}
        </summary>

        <span className="absolute left-0 top-full z-20 mt-2 block w-80 rounded-2xl bg-white p-4 text-left text-sm not-italic leading-6 text-slate-700 shadow-xl ring-1 ring-slate-200">
          <span className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            {knowledgeReferenceTypeLabel(reference.type)}
          </span>

          <span className="mt-1 block text-base font-bold text-slate-950">
            {definition?.label ?? reference.label}
          </span>

          {definition ? (
            <>
              <span className="mt-2 block">
                {definition.primaryText}
              </span>

              {definition.secondaryText ? (
                <span className="mt-2 block text-slate-500">
                  {definition.secondaryText}
                </span>
              ) : null}

              {definition.pronunciation ? (
                <span className="mt-2 block font-semibold text-slate-500">
                  {definition.pronunciation}
                </span>
              ) : null}

              {definition.example ? (
                <span className="mt-2 block text-slate-500">
                  Example: {definition.example}
                </span>
              ) : null}

              {definition.tags.length ? (
                <span className="mt-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {definition.tags.join(", ")}
                </span>
              ) : null}
            </>
          ) : (
            <span className="mt-2 block text-rose-700">
              Definition is unavailable.
            </span>
          )}
        </span>
      </details>
    </span>
  );
}