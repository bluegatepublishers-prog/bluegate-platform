export type ContentNodeType =
  | "BOOK"
  | "PART"
  | "UNIT"
  | "CHAPTER"
  | "MODULE"
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
  | "media"

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

/**
 * Legacy Topic rows may still exist in the database.
 * They are intentionally retained in the input contract for compatibility,
 * but they are no longer rendered as hierarchy nodes.
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
  coverImage?: string | null;
  frontMatterItems?: Array<Item & {
    type: string;
    displayOrder: number;
    startPage: number | null;
    endPage: number | null;
  }>;
};

const chapterFolders: Array<[VirtualFolderKind, string]> = [
  ["outcomes", "Chapter-Level Outcomes"],
  ["activities", "Chapter-Level Activities"],
  ["worksheets", "Chapter-Level Worksheets"],
  ["exercises", "Chapter-End Exercise"],
  ["questions", "Chapter-Level Questions"],
  ["resources", "Chapter Resources"],
  ["media", "Chapter Media"],
];

const moduleFolders: Array<[VirtualFolderKind, string]> = [
  ["outcomes", "Learning Outcomes"],
  ["activities", "Activities"],
  ["worksheets", "Worksheets"],
  ["exercises", "Exercises"],
  ["questions", "Questions"],
  ["resources", "Resources"],
  ["media", "Media"],
];

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

function makeFolderNode(input: {
  scopeType: "CHAPTER" | "MODULE";
  chapterId: string;
  moduleId?: string;
  folderKind: VirtualFolderKind;
  title: string;
  count?: number;
}): ContentTreeNode {
  if (input.scopeType === "CHAPTER") {
    return {
      key: `FOLDER:${input.chapterId}:${input.folderKind}`,
      id: `${input.chapterId}:${input.folderKind}`,
      type: "FOLDER",
      title: input.title,
      folderKind: input.folderKind,
      scopeType: "CHAPTER",
      chapterId: input.chapterId,
      count: input.count,
      children: [],
    };
  }

  return {
    key: `FOLDER:MODULE:${input.moduleId}:${input.folderKind}`,
    id: `${input.moduleId}:${input.folderKind}`,
    type: "FOLDER",
    title: input.title,
    folderKind: input.folderKind,
    scopeType: "MODULE",
    chapterId: input.chapterId,
    moduleId: input.moduleId,
    count: input.count,
    children: [],
  };
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
    startPage: module.startPage,
    endPage: module.endPage,
    children: moduleFolders.map(
      ([folderKind, title]) =>
        makeFolderNode({
          scopeType: "MODULE",
          chapterId: module.chapterId,
          moduleId: module.id,
          folderKind,
          title,
          count:
            module.counts?.[folderKind] ??
            0,
        }),
    ),
  });

  const chapterNode = (
    chapter: Chapter,
  ): ContentTreeNode => ({
    key: `CHAPTER:${chapter.id}`,
    id: chapter.id,
    type: "CHAPTER",
    title: chapter.title,
    archived: chapter.archived,
    startPage: chapter.startPage,
    endPage: chapter.endPage,
    children: [
      ...byOrder(
        input.modules.filter(
          (module) =>
            module.chapterId === chapter.id,
        ),
      ).map(moduleNode),

      ...chapterFolders.map(
        ([folderKind, title]) =>
          makeFolderNode({
            scopeType: "CHAPTER",
            chapterId: chapter.id,
            folderKind,
            title,
            count:
              chapter.counts[folderKind],
          }),
      ),
    ],
  });

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
          chapter.unitId === unit.id,
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
            unit.partId === part.id,
        ),
      ).map(unitNode),

      // Legacy direct Part -> Chapter records remain visible.
      ...byOrder(
        input.chapters.filter(
          (chapter) =>
            chapter.partId === part.id &&
            !chapter.unitId,
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
      ...(input.coverImage ? [{
        key: "COVER:" + input.book.id,
        id: input.book.id,
        type: "COVER" as const,
        title: "Cover",
        children: [],
      }] : []),
      {
        key: "FRONT_MATTER:" + input.book.id,
        id: input.book.id,
        type: "FRONT_MATTER" as const,
        title: "Front Matter",
        children: (input.frontMatterItems ?? []).slice().sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id)).map((item) => ({
          key: "FRONT_MATTER_ITEM:" + item.id,
          id: item.id,
          type: "FRONT_MATTER_ITEM" as const,
          title: item.title,
          frontMatterType: item.type,
          startPage: item.startPage,
          endPage: item.endPage,
          children: [],
        })),
      },
      ...byOrder(input.parts).map(partNode),

      // Legacy root Units/Chapters remain visible so existing data is not lost.
      ...byOrder(
        input.units.filter(
          (unit) => !unit.partId,
        ),
      ).map(unitNode),

      ...byOrder(
        input.chapters.filter(
          (chapter) =>
            !chapter.partId &&
            !chapter.unitId,
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