export type ContentNodeType =
  | "BOOK"
  | "PART"
  | "UNIT"
  | "CHAPTER"
  | "MODULE"
  | "EXERCISE"
  | "TOPIC"
  | "FOLDER"
  | "COVER"
  | "FRONT_MATTER"
  | "FRONT_MATTER_ITEM";

export type VirtualFolderKind =
  | "outcomes"
  | "activities"
  | "worksheets"
  | "exercises"
  | "questions"
  | "assessments"
  | "resources"
  | "media";

export type FolderScopeType = "CHAPTER" | "MODULE" | "TOPIC";

export type ContentTreeNode = {
  key: string;
  id: string;
  type: ContentNodeType;
  title: string;
  archived?: boolean;
  folderKind?: VirtualFolderKind;
  scopeType?: FolderScopeType;
  chapterId?: string;
  moduleId?: string;
  topicId?: string;
  exerciseId?: string;
  frontMatterType?: string;
  startPage?: number | null;
  endPage?: number | null;
  count?: number;
  children: ContentTreeNode[];
};

type Item = {
  id: string;
  title: string;
  archived?: boolean;
  startPage?: number | null;
  endPage?: number | null;
};

type Chapter = Item & {
  partId: string | null;
  unitId: string | null;
  sortOrder: number;
  counts: Record<VirtualFolderKind, number>;
};

type Module = Item & {
  chapterId: string;
  displayOrder: number;
  counts?: Partial<Record<VirtualFolderKind, number>>;
};

type Exercise = Item & {
  chapterId: string;
  moduleId: string | null;
  topicId: string | null;
  type:
    | "PRACTICE"
    | "WORKSHEET"
    | "HOMEWORK"
    | "REVISION"
    | "COMPETENCY"
    | "LAB"
    | "PROJECT"
    | "CASE_STUDY";
  displayOrder: number;
};

/**
 * Legacy Topic rows may still exist in the database.
 * They remain in the input contract for compatibility,
 * but they are not rendered in the structural hierarchy.
 */
type Topic = Item & {
  chapterId: string;
  moduleId: string | null;
  displayOrder: number;
  counts?: Partial<Record<VirtualFolderKind, number>>;
};

export type ContentTreeInput = {
  book: { id: string; title: string };
  parts: Array<Item & { displayOrder: number }>;
  units: Array<Item & { partId: string | null; displayOrder: number }>;
  chapters: Chapter[];
  modules: Module[];
  topics: Topic[];
  exercises?: Exercise[];
  coverImage?: string | null;
  frontMatterItems?: Array<
    Item & {
      type: string;
      displayOrder: number;
      startPage: number | null;
      endPage: number | null;
    }
  >;
};

const byOrder = <
  T extends Item & {
    displayOrder?: number;
    sortOrder?: number;
  },
>(
  items: T[],
) =>
  [...items].sort(
    (a, b) =>
      (a.displayOrder ?? a.sortOrder ?? 0) -
        (b.displayOrder ?? b.sortOrder ?? 0) ||
      a.title.localeCompare(b.title),
  );

function isChapterExercise(exercise: Exercise) {
  return (
    exercise.type === "PRACTICE" &&
    exercise.moduleId === null &&
    exercise.topicId === null &&
    !exercise.archived
  );
}

export function buildContentStudioTree(
  input: ContentTreeInput,
): ContentTreeNode {
  const moduleNode = (
    module: Module,
  ): ContentTreeNode => ({
    key: `MODULE:${module.id}`,
    id: module.id,
    type: "MODULE",
    title: module.title,
    archived: module.archived,
    chapterId: module.chapterId,
    moduleId: module.id,
    startPage: module.startPage,
    endPage: module.endPage,
    children: [],
  });

  const exerciseNode = (
    exercise: Exercise,
  ): ContentTreeNode => ({
    key: `EXERCISE:${exercise.id}`,
    id: exercise.id,
    type: "EXERCISE",
    title: "Exercise",
    archived: exercise.archived,
    chapterId: exercise.chapterId,
    exerciseId: exercise.id,
    startPage: exercise.startPage,
    endPage: exercise.endPage,
    children: [],
  });

  const chapterNode = (
    chapter: Chapter,
  ): ContentTreeNode => {
    const modules = byOrder(
      input.modules.filter(
        (module) =>
          module.chapterId === chapter.id &&
          !module.archived,
      ),
    ).map(moduleNode);

    const chapterExercises = byOrder(
      (input.exercises ?? []).filter(
        (exercise) =>
          exercise.chapterId === chapter.id &&
          isChapterExercise(exercise),
      ),
    );

    const exercises = chapterExercises.map(
      (exercise, index) => {
        const node = exerciseNode(exercise);

        return chapterExercises.length > 1
          ? {
              ...node,
              title: `Exercise ${index + 1}`,
            }
          : node;
      },
    );

    return {
      key: `CHAPTER:${chapter.id}`,
      id: chapter.id,
      type: "CHAPTER",
      title: chapter.title,
      archived: chapter.archived,
      startPage: chapter.startPage,
      endPage: chapter.endPage,
      children: [
        ...modules,
        ...exercises,
      ],
    };
  };

  const unitNode = (
    unit: ContentTreeInput["units"][number],
  ): ContentTreeNode => ({
    key: `UNIT:${unit.id}`,
    id: unit.id,
    type: "UNIT",
    title: unit.title,
    archived: unit.archived,
    startPage: unit.startPage,
    endPage: unit.endPage,
    children: byOrder(
      input.chapters.filter(
        (chapter) =>
          chapter.unitId === unit.id &&
          !chapter.archived,
      ),
    ).map(chapterNode),
  });

  const partNode = (
    part: ContentTreeInput["parts"][number],
  ): ContentTreeNode => ({
    key: `PART:${part.id}`,
    id: part.id,
    type: "PART",
    title: part.title,
    archived: part.archived,
    startPage: part.startPage,
    endPage: part.endPage,
    children: [
      ...byOrder(
        input.units.filter(
          (unit) =>
            unit.partId === part.id &&
            !unit.archived,
        ),
      ).map(unitNode),

      ...byOrder(
        input.chapters.filter(
          (chapter) =>
            chapter.partId === part.id &&
            !chapter.unitId &&
            !chapter.archived,
        ),
      ).map(chapterNode),
    ],
  });

  return {
    key: `BOOK:${input.book.id}`,
    id: input.book.id,
    type: "BOOK",
    title: input.book.title,
    children: [
      ...(input.coverImage
        ? [
            {
              key: `COVER:${input.book.id}`,
              id: input.book.id,
              type: "COVER" as const,
              title: "Cover",
              children: [],
            },
          ]
        : []),

      {
        key: `FRONT_MATTER:${input.book.id}`,
        id: input.book.id,
        type: "FRONT_MATTER" as const,
        title: "Front Matter",
        children: (input.frontMatterItems ?? [])
          .slice()
          .sort(
            (a, b) =>
              a.displayOrder - b.displayOrder ||
              a.id.localeCompare(b.id),
          )
          .map((item) => ({
            key: `FRONT_MATTER_ITEM:${item.id}`,
            id: item.id,
            type: "FRONT_MATTER_ITEM" as const,
            title: item.title,
            frontMatterType: item.type,
            startPage: item.startPage,
            endPage: item.endPage,
            children: [],
          })),
      },

      ...byOrder(
        input.parts.filter(
          (part) => !part.archived,
        ),
      ).map(partNode),

      ...byOrder(
        input.units.filter(
          (unit) =>
            !unit.partId &&
            !unit.archived,
        ),
      ).map(unitNode),

      ...byOrder(
        input.chapters.filter(
          (chapter) =>
            !chapter.partId &&
            !chapter.unitId &&
            !chapter.archived,
        ),
      ).map(chapterNode),
    ],
  };
}

export function flattenContentTree(
  root: ContentTreeNode,
) {
  const result: ContentTreeNode[] = [];

  const visit = (node: ContentTreeNode) => {
    result.push(node);
    node.children.forEach(visit);
  };

  visit(root);

  return result;
}

export type ContentHierarchyContext = {
  chapterId: string | null;
  moduleId: string | null;
  exerciseId: string | null;
};

export function resolveContentHierarchyContext(
  node: Pick<
    ContentTreeNode,
    | "type"
    | "id"
    | "chapterId"
    | "moduleId"
    | "exerciseId"
  >,
): ContentHierarchyContext {
  if (node.type === "CHAPTER") {
    return {
      chapterId: node.id,
      moduleId: null,
      exerciseId: null,
    };
  }

  if (node.type === "MODULE") {
    return {
      chapterId: node.chapterId ?? null,
      moduleId: node.id,
      exerciseId: null,
    };
  }

  if (node.type === "EXERCISE") {
    return {
      chapterId: node.chapterId ?? null,
      moduleId: null,
      exerciseId: node.exerciseId ?? node.id,
    };
  }

  return {
    chapterId: node.chapterId ?? null,
    moduleId: node.moduleId ?? null,
    exerciseId: null,
  };
}