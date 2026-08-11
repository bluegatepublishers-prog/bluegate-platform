export const QUESTION_DELIVERY_MODES = ["PRINT", "INTERACTIVE", "ANSWER_KEY"] as const;

export type QuestionDeliveryMode = (typeof QUESTION_DELIVERY_MODES)[number];
export type QuestionDeliveryAudience = "STUDENT" | "TEACHER" | "PUBLISHER";

export type QuestionDeliveryContext = {
  mode: QuestionDeliveryMode;
  audience: QuestionDeliveryAudience;
  answerVisibility: "HIDDEN" | "VISIBLE";
};

export function createQuestionDeliveryContext(input: {
  mode: QuestionDeliveryMode;
  audience: QuestionDeliveryAudience;
}): QuestionDeliveryContext {
  if (input.mode === "ANSWER_KEY" && input.audience === "STUDENT") {
    throw new Error("Answer-key rendering is restricted to teachers and publishers.");
  }
  return { ...input, answerVisibility: input.mode === "ANSWER_KEY" ? "VISIBLE" : "HIDDEN" };
}
