import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStudentAskMyBookHref,
  resolveStudentAskMyBookChapter,
} from "../lib/student-smart-book-assistant";

import type {
  SmartBookContentsNode,
} from "../lib/smart-book-contents";

const contents: SmartBookContentsNode[] = [
  {
    id: "front-matter",
    kind: "MODULE",
    title: "Introduction",
    startPage: 1,
    children: [],
  },
  {
    id: "chapter-1",
    kind: "CHAPTER",
    title: "Living Things",
    startPage: 5,
    children: [
      {
        id: "module-1",
        kind: "MODULE",
        title: "Plants",
        startPage: 7,
        children: [],
      },
    ],
  },
  {
    id: "chapter-2",
    kind: "CHAPTER",
    title: "Our Environment",
    startPage: 15,
    children: [],
  },
  {
    id: "chapter-3",
    kind: "CHAPTER",
    title: "Water",
    startPage: 28,
    children: [],
  },
];

test(
  "pages before the first released chapter have no Ask My Book context",
  () => {
    assert.equal(
      resolveStudentAskMyBookChapter(
        contents,
        1,
      ),
      null,
    );

    assert.equal(
      resolveStudentAskMyBookChapter(
        contents,
        4,
      ),
      null,
    );
  },
);

test(
  "chapter start page resolves to that exact released chapter",
  () => {
    assert.deepEqual(
      resolveStudentAskMyBookChapter(
        contents,
        5,
      ),
      {
        chapterId: "chapter-1",
        title: "Living Things",
        startPage: 5,
      },
    );
  },
);

test(
  "module pages remain owned by their released parent chapter",
  () => {
    assert.deepEqual(
      resolveStudentAskMyBookChapter(
        contents,
        9,
      ),
      {
        chapterId: "chapter-1",
        title: "Living Things",
        startPage: 5,
      },
    );
  },
);

test(
  "page immediately before the next chapter remains in the current chapter",
  () => {
    assert.equal(
      resolveStudentAskMyBookChapter(
        contents,
        14,
      )?.chapterId,
      "chapter-1",
    );
  },
);

test(
  "crossing a released chapter start switches Ask My Book context",
  () => {
    assert.equal(
      resolveStudentAskMyBookChapter(
        contents,
        15,
      )?.chapterId,
      "chapter-2",
    );

    assert.equal(
      resolveStudentAskMyBookChapter(
        contents,
        28,
      )?.chapterId,
      "chapter-3",
    );
  },
);

test(
  "invalid pages fail closed",
  () => {
    assert.equal(
      resolveStudentAskMyBookChapter(
        contents,
        0,
      ),
      null,
    );

    assert.equal(
      resolveStudentAskMyBookChapter(
        contents,
        -1,
      ),
      null,
    );

    assert.equal(
      resolveStudentAskMyBookChapter(
        contents,
        1.5,
      ),
      null,
    );
  },
);

test(
  "only CHAPTER nodes establish Ask My Book ownership",
  () => {
    const noChapters: SmartBookContentsNode[] =
      [
        {
          id: "module-only",
          kind: "MODULE",
          title: "Module",
          startPage: 1,
          children: [],
        },
      ];

    assert.equal(
      resolveStudentAskMyBookChapter(
        noChapters,
        20,
      ),
      null,
    );
  },
);

test(
  "Ask My Book route safely encodes server-derived book and chapter identifiers",
  () => {
    assert.equal(
      buildStudentAskMyBookHref(
        "book one",
        "chapter/1",
      ),
      "/student-dashboard/books/book%20one/chapters/chapter%2F1/assistant",
    );

    assert.equal(
      buildStudentAskMyBookHref(
        "",
        "chapter-1",
      ),
      null,
    );

    assert.equal(
      buildStudentAskMyBookHref(
        "book-1",
        " ",
      ),
      null,
    );
  },
);
