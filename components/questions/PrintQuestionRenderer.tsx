import NextImage from "next/image";
import { Fragment } from "react";

import { createQuestionDeliveryContext, type QuestionDeliveryAudience, type QuestionDeliveryMode } from "@/lib/question-delivery-mode";
import type { NormalizedQuestion } from "@/lib/normalized-question";

export function PrintQuestionRenderer({ question, mode = "PRINT", audience = "STUDENT" }: { question: NormalizedQuestion; mode?: Extract<QuestionDeliveryMode, "PRINT" | "ANSWER_KEY">; audience?: QuestionDeliveryAudience }) {
  const context = createQuestionDeliveryContext({ mode, audience });
  const answerKey = context.answerVisibility === "VISIBLE";
  const imageId = question.resourceIds[0];
  const answer = answerText(question);
  return <article className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-900"><p className="whitespace-pre-wrap font-semibold">{question.content.plainText}</p>{imageId ? <NextImage unoptimized width={640} height={360} src={`/api/resources/${imageId}/play`} alt="Question resource" className="max-h-64 rounded object-contain" /> : null}{question.questionType === "MCQ" || question.questionType === "MULTIPLE_SELECT" ? <ol className="list-[upper-alpha] space-y-1 pl-6">{question.options.map((option) => <li key={option.id}>{option.text}</li>)}</ol> : null}{question.questionType === "TRUE_FALSE" ? <p>True / False</p> : null}{question.questionType === "FILL_BLANK" ? <p className="border-b border-slate-500 pb-1">&nbsp;</p> : null}{question.questionType === "MATCH" ? <div className="grid gap-2 sm:grid-cols-2">{question.answer.matches?.map((pair) => <Fragment key={pair.left}><span className="rounded bg-slate-50 p-2">{pair.left}</span><span className="border-b border-slate-400 p-2">&nbsp;</span></Fragment>)}</div> : null}{question.questionType === "ORDERING" ? <ol className="space-y-2">{question.options.map((option) => <li key={option.id} className="border-b border-slate-300 pb-1">____ {option.text}</li>)}</ol> : null}{["SHORT_ANSWER", "LONG_ANSWER", "CASE_BASED", "COMPETENCY", "HOTS", "ASSERTION_REASON", "PRACTICAL", "PROJECT", "CUSTOM", "PICTURE_BASED"].includes(question.questionType) ? <div className="space-y-3">{Array.from({ length: question.questionType === "SHORT_ANSWER" ? 3 : 7 }, (_, index) => <div key={index} className="border-b border-slate-300" />)}</div> : null}{answerKey && answer ? <p className="rounded bg-emerald-50 p-3 font-bold text-emerald-900">Correct answer: {answer}</p> : null}</article>;
}

function answerText(question: NormalizedQuestion) {
  if (question.questionType === "TRUE_FALSE") return question.answer.correctBoolean === undefined ? "" : question.answer.correctBoolean ? "True" : "False";
  if (question.questionType === "MATCH") return question.answer.matches?.map((pair) => `${pair.left}: ${pair.right}`).join("; ") ?? "";
  if (question.questionType === "ORDERING") return question.answer.orderedOptionIds?.map((id) => question.options.find((option) => option.id === id)?.text ?? id).join(" -> ") ?? "";
  if (question.answer.correctOptionIds?.length) return question.answer.correctOptionIds.map((id) => question.options.find((option) => option.id === id)?.text ?? id).join(", ");
  return question.answer.acceptedAnswers?.join(" / ") ?? "";
}
