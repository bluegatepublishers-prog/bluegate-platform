export type SmartBookContentsKind =
  | "FRONT_MATTER"
  | "PART"
  | "UNIT"
  | "CHAPTER"
  | "MODULE"
  | "TOPIC"
  | "EXERCISE";

export type SmartBookContentsNode = {
  id: string;
  kind: SmartBookContentsKind;
  title: string;
  startPage: number | null;
  children: SmartBookContentsNode[];
};

type MappedItem = {
  id: string;
  title: string;
  startPage: number | null;
  displayOrder: number;

  /*
   * Kept for compatibility with existing callers/tests.
   *
   * IMPORTANT:
   * Smart Book structural visibility does NOT depend on this
   * legacy per-node flag.
   *
   * The published Book is the Teacher/Student deliverable.
   */
  published?: boolean;

  archived?: boolean;
};

type Part = MappedItem;

type Unit = MappedItem & {
  partId: string | null;
};

type Chapter = MappedItem & {
  partId: string | null;
  unitId: string | null;
  chapterNumber: number;
};

type Module = MappedItem & {
  chapterId: string;
};

type Topic = MappedItem & {
  chapterId: string;
  moduleId: string | null;
};

type Exercise = MappedItem & {
  chapterId: string;
  moduleId: string | null;
  topicId: string | null;

  type?:
    | "PRACTICE"
    | "WORKSHEET"
    | "HOMEWORK"
    | "REVISION"
    | "COMPETENCY"
    | "LAB"
    | "PROJECT"
    | "CASE_STUDY";
};

type FrontMatter = MappedItem;

export type SmartBookContentsInput = {
  parts: Part[];
  units: Unit[];
  chapters: Chapter[];
  modules: Module[];
  topics: Topic[];
  exercises: Exercise[];
  frontMatterItems?: FrontMatter[];
};

/*
 * Teacher/Student Contents follows the active structural hierarchy.
 *
 * The Book itself has already passed publication and entitlement checks.
 * Therefore legacy per-node `published` flags must not hide Terms, Units,
 * Chapters, Modules or Exercises.
 */
function visible<T extends MappedItem>(
  items: T[],
) {
  return items.filter(
    (item) => item.archived !== true,
  );
}

function sortItems<T extends MappedItem>(
  items: T[],
) {
  return [...items].sort(
    (left, right) =>
      left.displayOrder -
        right.displayOrder ||
      left.title.localeCompare(
        right.title,
      ) ||
      left.id.localeCompare(right.id),
  );
}

function node(
  item: MappedItem,
  kind: SmartBookContentsKind,
  children: SmartBookContentsNode[] = [],
): SmartBookContentsNode {
  return {
    id: item.id,
    kind,
    title: item.title,
    startPage: item.startPage,
    children,
  };
}

function exerciseNode(
  exercise: Exercise,
): SmartBookContentsNode {
  return node(
    exercise,
    "EXERCISE",
  );
}

export function buildSmartBookContents(
  input: SmartBookContentsInput,
): SmartBookContentsNode[] {
  const parts = visible(input.parts);
  const units = visible(input.units);

  const chapters = visible(
    input.chapters,
  );

  const modules = visible(
    input.modules,
  );

  const topics = visible(
    input.topics,
  );

  /*
   * Only structural Practice exercises belong in the
   * book Contents.
   *
   * Undefined remains accepted for compatibility with
   * older callers/tests.
   */
  const exercises = visible(
    input.exercises,
  ).filter(
    (exercise) =>
      exercise.type === undefined ||
      exercise.type === "PRACTICE",
  );

  const frontMatter = visible(
    input.frontMatterItems ?? [],
  );

  const topicNode = (
    topic: Topic,
  ): SmartBookContentsNode =>
    node(
      topic,
      "TOPIC",
      sortItems(
        exercises.filter(
          (exercise) =>
            exercise.topicId === topic.id,
        ),
      ).map(exerciseNode),
    );

  const moduleNode = (
    module: Module,
  ): SmartBookContentsNode =>
    node(
      module,
      "MODULE",
      [
        ...sortItems(
          topics.filter(
            (topic) =>
              topic.moduleId === module.id,
          ),
        ).map(topicNode),

        ...sortItems(
          exercises.filter(
            (exercise) =>
              exercise.moduleId ===
                module.id &&
              !exercise.topicId,
          ),
        ).map(exerciseNode),
      ],
    );

  const chapterNode = (
    chapter: Chapter,
  ): SmartBookContentsNode =>
    node(
      chapter,
      "CHAPTER",
      [
        ...sortItems(
          modules.filter(
            (module) =>
              module.chapterId ===
              chapter.id,
          ),
        ).map(moduleNode),

        ...sortItems(
          topics.filter(
            (topic) =>
              topic.chapterId ===
                chapter.id &&
              !topic.moduleId,
          ),
        ).map(topicNode),

        ...sortItems(
          exercises.filter(
            (exercise) =>
              exercise.chapterId ===
                chapter.id &&
              !exercise.moduleId &&
              !exercise.topicId,
          ),
        ).map(exerciseNode),
      ],
    );

  const unitNode = (
    unit: Unit,
  ): SmartBookContentsNode =>
    node(
      unit,
      "UNIT",
      sortItems(
        chapters.filter(
          (chapter) =>
            chapter.unitId === unit.id,
        ),
      ).map(chapterNode),
    );

  const partNode = (
    part: Part,
  ): SmartBookContentsNode =>
    node(
      part,
      "PART",
      [
        ...sortItems(
          units.filter(
            (unit) =>
              unit.partId === part.id,
          ),
        ).map(unitNode),

        ...sortItems(
          chapters.filter(
            (chapter) =>
              chapter.partId ===
                part.id &&
              !chapter.unitId,
          ),
        ).map(chapterNode),
      ],
    );

  const result: SmartBookContentsNode[] =
    [];

  if (frontMatter.length > 0) {
    const sortedFrontMatter =
      sortItems(frontMatter);

    result.push({
      id: "front-matter",
      kind: "FRONT_MATTER",
      title: "Front Matter",

      startPage:
        sortedFrontMatter[0]
          ?.startPage ?? null,

      children:
        sortedFrontMatter.map(
          (item) =>
            node(
              item,
              "FRONT_MATTER",
            ),
        ),
    });
  }

  /*
   * Part / Term based structure.
   */
  result.push(
    ...sortItems(parts).map(partNode),
  );

  /*
   * Books may have Units without Parts.
   */
  result.push(
    ...sortItems(
      units.filter(
        (unit) => !unit.partId,
      ),
    ).map(unitNode),
  );

  /*
   * Books may also have root Chapters.
   */
  result.push(
    ...sortItems(
      chapters.filter(
        (chapter) =>
          !chapter.partId &&
          !chapter.unitId,
      ),
    ).map(chapterNode),
  );

  return result;
}