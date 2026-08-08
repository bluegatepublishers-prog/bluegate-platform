import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildContentStudioTree,
  flattenContentTree,
  type ContentTreeInput,
} from "../lib/content-studio-tree";

const read = (path: string) => readFileSync(path, "utf8");

const page = read("app/admin/books/[id]/content/page.tsx");
const actions = read("app/admin/books/[id]/content/actions.ts");
const service = read("lib/book-structure-management.ts");
const treeClient = read(
  "components/admin/books/ContentStudioTree.tsx",
);
const editorForm = read(
  "components/admin/books/ContentEditorForm.tsx",
);
const resourceService = read("lib/book-resource-links.ts");
const schema = read("prisma/schema.prisma");

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
    assert.match(page, /ContentStudioShell/);
  },
);

test("another publisher Book is rejected", () => {
  assert.match(
    service,
    /publisherId: actor\.publisherId/,
  );
});

test("chapter-only Book tree renders", () => {
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

  assert.equal(
    buildContentStudioTree(data).children[0]?.type,
    "CHAPTER",
  );
});

test("Part Unit Chapter nesting renders", () => {
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

  const root = buildContentStudioTree(data);

  assert.equal(
    root.children[0]?.children[0]?.children[0]?.id,
    "c",
  );
});

test("Module and Topic nesting renders", () => {
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

  assert.equal(
    buildContentStudioTree(data).children[0]?.children[0]
      ?.children[0]?.id,
    "t",
  );
});

test(
  "virtual Chapter tools are not rendered as tree nodes",
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

    const keys = flattenContentTree(
      buildContentStudioTree(data),
    )
      .filter((node) => node.type === "FOLDER")
      .map((node) => node.key);
    assert.equal(keys.length, 7);

    assert.ok(
      keys.every((key) =>
        key.startsWith("FOLDER:c:"),
      ),
    );

    assert.match(
      treeClient,
      /child\.type !== "FOLDER"/,
    );

    assert.doesNotMatch(
      schema,
      /model ContentNode|model ContentFolder/,
    );
  },
);

test(
  "Chapter tools are exposed as tabs and omit delivery Assessments",
  () => {
    const shell = read(
      "components/admin/books/ContentStudioShell.tsx",
    );

    for (const label of [
      "Overview",
      "Outcomes",
      "Activities",
      "Exercises",
      "Questions",
      "Resources",
    ]) {
      assert.match(shell, new RegExp(label));
    }

    assert.doesNotMatch(
      shell,
      /label: "Assessments"/,
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
      /saveBookStructureNode\(bookId/,
    );
  },
);

test("invalid child type is rejected", () => {
  assert.match(
    actions,
    /This child type is not valid for the selected parent/,
  );
});

test("cross-publisher node mutation fails", () => {
  assert.match(service, /actorAndBook\(bookId\)/);
});

test("cross-book conflicting move fails", () => {
  assert.match(
    service,
    /where: \{ id: input\.parentId, bookId, archived: false \}/,
  );
});

test("sibling reorder is transactional", () => {
  assert.match(
    service,
    /reorderBookStructureNodes/,
  );
  assert.match(
    service,
    /TransactionIsolationLevel\.Serializable/,
  );
});

test("selected editor loads on demand", () => {
  assert.match(page, /const record=await loadNode/);
  assert.match(
    page,
    /if\(selected\.type==="FOLDER"\)/,
  );
});

test("Learning Outcomes are Chapter scoped", () => {
  assert.match(
    page,
    /chapterLearningOutcome\.findMany\(\{where:\{chapterId\}/,
  );
});

test("Activities are Chapter scoped", () => {
  assert.match(
    page,
    /chapterActivity\.findMany\(\{where:\{chapterId\}/,
  );
});

test(
  "Exercises enforce Book and Chapter ownership",
  () => {
    assert.match(
      actions,
      /ownedChapter\(bookId,chapterId\)/,
    );
    assert.match(
      actions,
      /where:\{id,bookId,chapterId\}/,
    );
  },
);

test("Questions are filtered and paginated", () => {
  assert.match(page, /BookQuestionWhereInput/);
  assert.match(
    page,
    /skip:\(page-1\)\*take,take/,
  );
});

test("Resources use BookResourceLink", () => {
  assert.match(page, /BookStudioResourcePanel/);
  assert.match(
    resourceService,
    /bookResourceLink/,
  );
});

test("Resource detach does not delete Resource", () => {
  assert.doesNotMatch(
    resourceService,
    /resource\.delete/,
  );
});

test(
  "archived records retain lifecycle visibility",
  () => {
    assert.match(treeClient, /node\.archived/);
    assert.match(
      actions,
      /archiveContentNodeAction/,
    );
  },
);

test("unsaved changes protection triggers", () => {
  assert.match(editorForm, /beforeunload/);
  assert.match(
    treeClient,
    /Discard unsaved changes/,
  );
});

test("legacy Structure route redirects", () => {
  assert.match(
    read(
      "app/admin/books/[id]/structure/page.tsx",
    ),
    /redirect\(`\/admin\/books\/\$\{id\}\/content`\)/,
  );
});

test(
  "LegacyBooksExplorer is no longer rendered",
  () => {
    assert.doesNotMatch(
      read("app/admin/books/page.tsx"),
      /LegacyBooksExplorer|BookStudioWorkspace/,
    );
  },
);

test("Book without normalized Board loads", () => {
  assert.match(
    page,
    /boardId:\s*book\.boardId\?\?""/,
  );
  assert.match(page, /Legacy Board/);
});

test(
  "Content Studio queries remain publisher scoped",
  () => {
    assert.match(
      page,
      /publisherId:actor\.publisherId/,
    );
    assert.match(
      resourceService,
      /publisherId/,
    );
  },
);