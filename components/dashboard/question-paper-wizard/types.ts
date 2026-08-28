export type WizardChapter = {
  id: string;
  chapterNumber: number;
  title: string;

  /**
   * Compatibility name retained through B-1.
   * For Question Paper Wizard data this now means that the chapter
   * exists in the exact published immutable Smart Book V2 release.
   */
  aiReady: boolean;

  releaseReady: boolean;
  startPage: number | null;
  endPage: number | null;

  /**
   * Legacy counters retained until the B-2 UI replacement.
   * B-1 deliberately does not calculate these from mutable
   * authoring tables.
   */
  learningOutcomesCount: number;
  questionBankCount: number;
};

export type WizardTeachingContext = {
  id: string;
  sectionId: string;
  sectionSubjectId: string;
  academicYearId: string;

  classId: string;
  className: string;
  sectionName: string;

  subjectId: string;
  subjectName: string;

  bookId: string;
  bookTitle: string;

  /**
   * Server-resolved provenance only.
   * B-2 must not trust a browser-submitted release version as
   * authorization. Generation will resolve and verify the release
   * again on the server.
   */
  releaseVersionId: string;
  releaseVersionNumber: number;
};

export type WizardBook = {
  id: string;
  title: string;

  /**
   * Compatibility fields retained for the existing B-1 wizard.
   * B-2 will select an exact WizardTeachingContext instead.
   */
  classId: string;
  subjectId: string;
  className: string;
  subjectName: string;

  series: string | null;
  publisher: string | null;
  coverImage: string | null;
  summary: string | null;

  releaseVersionId: string;
  releaseVersionNumber: number;

  contexts: WizardTeachingContext[];
  chapters: WizardChapter[];
};

export type WizardOptions = {
  classes: {
    id: string;
    name: string;
  }[];

  subjects: {
    id: string;
    name: string;
  }[];

  books: WizardBook[];

  /**
   * Exact authenticated Teacher assignment contexts available to
   * the Question Paper Wizard.
   */
  contexts: WizardTeachingContext[];

  entitlement: {
    plan: string;
    remaining: number;
    limit: number;
    canGenerate: boolean;
  };
};

export type ExamType =
  | "Class Test"
  | "Unit Test"
  | "Periodic Test"
  | "Half Yearly"
  | "Annual Examination"
  | "Practice Paper"
  | "Competency Assessment"
  | "Olympiad"
  | "Custom";

export type PaperSettingsValue = {
  title: string;
  examType: ExamType;
  pattern:
    | "CBSE Pattern"
    | "School Pattern"
    | "Bluegate Pattern"
    | "Custom";
  totalMarks: number;
  durationMode: "auto" | "manual";
  duration: number;
  difficulty: "Easy" | "Balanced" | "Advanced";
  autoDistribution: boolean;
  questionTypes: string[];
  questionCounts: Record<string, number>;
  advanced: {
    bloomDistribution: boolean;
    internalChoices: boolean;
    caseBasedQuestions: boolean;
    competencyPercent: number;
    creativeQuestions: boolean;
    applicationQuestions: boolean;
  };
};
