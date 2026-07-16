import type { GapSeverity, RemedialRecommendationType } from "@prisma/client";

export type ApprovedRemedialReference = {
  type: RemedialRecommendationType;
  labelSnapshot: string;
  required: boolean;
  bookId?: string;
  chapterId?: string;
  resourceId?: string;
  assessmentId?: string;
  pageStart?: number;
  pageEnd?: number;
};

export type RemedialPolicyInput = {
  severity: GapSeverity;
  references: ApprovedRemedialReference[];
  now?: Date;
};

export type RemedialDraft = {
  policyVersion: string;
  priority: number;
  dueAt: Date;
  recommendations: ApprovedRemedialReference[];
};
