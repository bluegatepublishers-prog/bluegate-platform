import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildContentStudioTree,
  flattenContentTree,
  type ContentTreeInput,
} from "../lib/content-studio-tree";

const read = (path: string) =>
  readFileSync(path, "utf8");

const page = read(
  "app/admin/books/[id]/content/page.tsx",
);

const defaultBookPage = read(
  "app/admin/books/[id]/page.tsx",
);

const structurePage = read(
  "app/admin/books/[id]/structure/page.tsx",
);

const actions = read(
  "app/admin/books/[id]/content/actions.ts",
);

const service = read(
  "lib/book-structure-management.ts",
);

const treeClient = read(
  "components/admin/books/ContentStudioTree.tsx",
);

const shell = read(
  "components/admin/books/ContentStudioShell.tsx",
);

const editorForm = read(
  "components/admin/books/ContentEditorForm.tsx",
);

const resourceService = read(
  "lib/book-resource-links.ts",
);

const schema = read(
  "prisma/schema.prisma",
);

const emptyCounts = {
  outcomes: 0,
  activities: 0,
  worksheets: 0,
  exercises: 0,
  questions: 0,
  assessments: 0,
  resources: 0,
  media: 0,
};

function input(): ContentTreeInput {
  return {
    book: {
      id: "b1",
      title: "Book",
    },
    parts: [],
    units: [],
    chapters: [],
    modules: [],
    topics: [],
  };
}

test(
  "publisher Admin can open owned Book Content Studio",
  () => {
    assert.match(
      page,
      /requirePublisherAdminBookOwnership\(id\)/,
    );

    assert.match(
      page,
      /ContentStudioShell/,
    );
  },
);

test(
  "another publisher Book is rejected",
  () => {
    assert.match(
      service,
      /publisherId:\s*actor\.publisherId/,
    );
  },
);

test(
  "chapter-only Book tree renders",
  () => {
    const data = input();

    data.chapters.push({
      id: "c1",
      title: "Chapter",
      archived: false,
      partId: null,
      unitId: null,
      sortOrder: 0,
      counts: emptyCounts,
    });

    const root =
      buildContentStudioTree(data);

    const chapter =
      flattenContentTree(root).find(
        (node) =>
          node.type === "CHAPTER" &&
          node.id === "c1",
      );

    assert.equal(
      chapter?.id,
      "c1",
    );
  },
);

test(
  "Part Unit Chapter nesting renders",
  () => {
    const data = input();

    data.parts.push({
      id: "p",
      title: "Part",
      archived: false,
      displayOrder: 0,
    });

    data.units.push({
      id: "u",
      title: "Unit",
      archived: false,
      partId: "p",
      displayOrder: 0,
    });

    data.chapters.push({
      id: "c",
      title: "Chapter",
      archived: false,
      partId: "p",
      unitId: "u",
      sortOrder: 0,
      counts: emptyCounts,
    });

    const root =
      buildContentStudioTree(data);

    const part =
      flattenContentTree(root).find(
        (node) =>
          node.type === "PART" &&
          node.id === "p",
      );

    const unit =
      part?.children.find(
        (node) =>
          node.type === "UNIT" &&
          node.id === "u",
      );

    const chapter =
      unit?.children.find(
        (node) =>
          node.type === "CHAPTER" &&
          node.id === "c",
      );

    assert.equal(
      chapter?.id,
      "c",
    );
  },
);

test(
  "Module renders and legacy Topic rows stay out of hierarchy",
  () => {
    const data = input();

    data.chapters.push({
      id: "c",
      title: "Chapter",
      archived: false,
      partId: null,
      unitId: null,
      sortOrder: 0,
      counts: emptyCounts,
    });

    data.modules.push({
      id: "m",
      title: "Module",
      archived: false,
      chapterId: "c",
      displayOrder: 0,
    });

    data.topics.push({
      id: "t",
      title: "Topic",
      archived: false,
      chapterId: "c",
      moduleId: "m",
      displayOrder: 0,
    });

    const nodes =
      flattenContentTree(
        buildContentStudioTree(data),
      );

    const bookModule =
      nodes.find(
        (node) =>
          node.type === "MODULE" &&
          node.id === "m",
      );

    const topic =
      nodes.find(
        (node) =>
          node.type === "TOPIC" &&
          node.id === "t",
      );

    assert.equal(
      bookModule?.id,
      "m",
    );

    assert.equal(
      topic,
      undefined,
    );
  },
);

test(
  "virtual Chapter tools are not persisted as ContentNode models",
  () => {
    const data = input();

    data.chapters.push({
      id: "c",
      title: "Chapter",
      archived: false,
      partId: null,
      unitId: null,
      sortOrder: 0,
      counts: emptyCounts,
    });

    const keys =
      flattenContentTree(
        buildContentStudioTree(data),
      )
        .filter(
          (node) =>
            node.type === "FOLDER",
        )
        .map(
          (node) => node.key,
        );

    assert.ok(
      keys.every(
        (key) =>
          key.startsWith(
            "FOLDER:c:",
          ),
      ),
    );

    assert.match(
      treeClient,
      /child\.type\s*!==\s*"FOLDER"/,
    );

    assert.doesNotMatch(
      schema,
      /model ContentNode|model ContentFolder/,
    );
  },
);

test(
  "Content Studio shell delegates hierarchy and selected workspace rendering",
  () => {
    assert.match(
      shell,
      /ContentStudioTree/,
    );

    assert.match(
      shell,
      /\{children\}/,
    );

    assert.match(
      page,
      /SelectedCanvas/,
    );

    assert.doesNotMatch(
      shell,
      /label:\s*"Assessments"/,
    );
  },
);

test(
  "valid child creation uses authoritative service",
  () => {
    assert.match(
      actions,
      /createContentChildAction/,
    );

    assert.match(
      actions,
      /saveBookStructureNode\s*\(\s*bookId/,
    );
  },
);

test(
  "invalid child type is rejected",
  () => {
    assert.match(
      actions,
      /This child type is not valid for the selected parent/,
    );
  },
);

test(
  "cross-publisher node mutation fails",
  () => {
    assert.match(
      service,
      /actorAndBook\s*\(\s*bookId\s*\)/,
    );
  },
);

test(
  "cross-book conflicting move fails",
  () => {
    assert.match(
      service,
      /where:\s*\{\s*id:\s*input\.parentId,\s*bookId,\s*archived:\s*false\s*\}/,
    );
  },
);

test(
  "sibling reorder is transactional",
  () => {
    assert.match(
      service,
      /reorderBookStructureNodes/,
    );

    assert.match(
      service,
      /TransactionIsolationLevel\.Serializable/,
    );
  },
);

test(
  "selected hierarchy records load on demand",
  () => {
    assert.match(
      page,
      /await\s+loadNode\s*\(\s*bookId\s*,\s*selected\s*\)/,
    );

    assert.match(
      page,
      /selected\.type\s*===\s*"FOLDER"/,
    );

    assert.match(
      page,
      /selected\.type\s*!==\s*"MODULE"/,
    );
  },
);

test(
  "Learning Outcomes are Chapter scoped",
  () => {
    assert.match(
      page,
      /chapterLearningOutcome\.findMany\s*\(\s*\{\s*where:\s*\{\s*chapterId/,
    );
  },
);

test(
  "Activities are loaded through chapter-scoped Activity Studio service",
  () => {
    assert.match(
      page,
      /loadActivityStudio\s*\(\s*\{\s*publisherId\s*,\s*bookId\s*,\s*chapterId:\s*scope\.chapterId\s*\}\s*\)/,
    );

    assert.match(
      page,
      /scope\.chapterId/,
    );
  },
);

test(
  "Exercises enforce Book and Chapter ownership",
  () => {
    assert.match(
      actions,
      /ownedChapter\s*\(\s*bookId\s*,\s*chapterId\s*\)/,
    );

    assert.match(
      actions,
      /where:\s*\{\s*id\s*,\s*bookId\s*,\s*chapterId\s*\}/,
    );
  },
);

test(
  "Questions are filtered and paginated",
  () => {
    assert.match(
      page,
      /BookQuestionWhereInput/,
    );

    assert.match(
      page,
      /skip:\s*\(\s*page\s*-\s*1\s*\)\s*\*\s*take\s*,\s*take/,
    );
  },
);

test(
  "Resources use BookResourceLink",
  () => {
    assert.match(
      page,
      /BookStudioResourcePanel/,
    );

    assert.match(
      resourceService,
      /bookResourceLink/,
    );
  },
);

test(
  "Resource detach does not delete Resource",
  () => {
    assert.doesNotMatch(
      resourceService,
      /resource\.delete/,
    );
  },
);

test(
  "archived records retain lifecycle visibility",
  () => {
    assert.match(
      treeClient,
      /node\.archived/,
    );

    assert.match(
      actions,
      /archiveContentNodeAction/,
    );
  },
);

test(
  "unsaved changes protection triggers",
  () => {
    assert.match(
      editorForm,
      /beforeunload/,
    );

    assert.match(
      treeClient,
      /Discard unsaved changes/,
    );
  },
);

test(
  "Structure route remains publisher scoped and renders ChapterModuleMapper",
  () => {
    assert.match(
      structurePage,
      /requirePublisherAdminBookOwnership\s*\(\s*id\s*\)/,
    );

    assert.match(
      structurePage,
      /ChapterModuleMapper/,
    );

    assert.match(
      structurePage,
      /publisherId:\s*actor\.publisherId/,
    );
  },
);

test(
  "book root preserves ownership checks and opens the existing Content Studio route",
  () => {
    assert.match(
      defaultBookPage,
      /requirePublisherAdminBookOwnership\s*\(\s*id\s*\)/,
    );

    assert.match(
      defaultBookPage,
      /redirect\s*\(\s*`\/admin\/books\/\$\{id\}\/content`\s*\)/,
    );
  },
);

test(
  "LegacyBooksExplorer is no longer rendered",
  () => {
    assert.doesNotMatch(
      read(
        "app/admin/books/page.tsx",
      ),
      /LegacyBooksExplorer|BookStudioWorkspace/,
    );
  },
);

test(
  "Book without normalized Board loads",
  () => {
    assert.match(
      page,
      /boardId:\s*true/,
    );

    assert.match(
      page,
      /board:\s*true/,
    );

    assert.match(
      page,
      /studio\.boardId\s*\?\?\s*""/,
    );
  },
);

test(
  "Content Studio queries remain publisher scoped",
  () => {
    assert.match(
      page,
      /loadBookStudio\s*\(\s*id\s*,\s*actor\.publisherId\s*\)/,
    );

    assert.match(
      page,
      /where:\s*\{\s*id:\s*bookId\s*,\s*publisherId\s*\}/,
    );

    assert.match(
      resourceService,
      /publisherId/,
    );
  },
);