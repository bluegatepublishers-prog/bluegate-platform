import assert from "node:assert/strict";
import test from "node:test";
import { ResourceAudience } from "@prisma/client";
import { canStudentUseResource } from "../lib/resource-audience-ui";
import {
  buildAssignableBookWhere,
  buildAssignableResourcesWhere,
  buildSectionSubjectContentScopeWhere,
  buildSectionSubjectContentUpdate,
  isSectionSubjectContentSelectionValid,
} from "../lib/section-subject-content-policy";

const base = {
  publisherId: "publisher-a",
  className: "Class 6",
  subjectId: "subject-science",
  subjectName: "Science",
  requestedBookId: "book-a" as string | null,
  requestedResourceIds: ["resource-a"],
  book: {
    publisherId: "publisher-a" as string | null,
    subjectId: "subject-science",
    class: { name: "Grade 6" },
  },
  resources: [
    {
      id: "resource-a",
      publisherId: "publisher-a" as string | null,
      classLevel: "Standard 6",
      subject: "Science",
    },
  ],
};

test("valid same-publisher book and resource assignment succeeds", () => {
  assert.equal(isSectionSubjectContentSelectionValid(base), true);
});

test("cross-publisher resource assignment fails", () => {
  assert.equal(
    isSectionSubjectContentSelectionValid({
      ...base,
      resources: [{ ...base.resources[0], publisherId: "publisher-b" }],
    }),
    false,
  );
});

test("cross-publisher book assignment fails", () => {
  assert.equal(
    isSectionSubjectContentSelectionValid({
      ...base,
      book: { ...base.book, publisherId: "publisher-b" },
    }),
    false,
  );
});

test("wrong school section is rejected by the assignment lookup", () => {
  assert.deepEqual(
    buildSectionSubjectContentScopeWhere(
      "school-a",
      "class-a",
      "section-subject-a",
    ),
    {
      id: "section-subject-a",
      active: true,
      section: { schoolClass: { id: "class-a", schoolId: "school-a" } },
    },
  );
});

test("wrong subject book and resource selections fail", () => {
  assert.equal(
    isSectionSubjectContentSelectionValid({
      ...base,
      book: { ...base.book, subjectId: "subject-math" },
    }),
    false,
  );
  assert.equal(
    isSectionSubjectContentSelectionValid({
      ...base,
      resources: [{ ...base.resources[0], subject: "Mathematics" }],
    }),
    false,
  );
});

test("assignment lookup builders retain publisher ownership", () => {
  assert.deepEqual(
    buildAssignableBookWhere(
      "publisher-a",
      "school-a",
      "year-a",
      "section-subject-a",
      "book-a",
      "subject-science",
    ),
    {
      id: "book-a",
      publisherId: "publisher-a",
      published: true,
      archived: false,
      subjectId: "subject-science",
      schoolEntitlements: {
        some: {
          publisherId: "publisher-a",
          schoolId: "school-a",
          status: "ACTIVE",
        },
      },
    },
  );
  assert.deepEqual(
    buildAssignableResourcesWhere("publisher-a", "school-a", ["resource-a"]),
    {
      id: { in: ["resource-a"] },
      publisherId: "publisher-a",
      published: true,
      archived: false,
      schoolEntitlements: {
        some: {
          publisherId: "publisher-a",
          schoolId: "school-a",
          status: "ACTIVE",
        },
      },
      AND: [
        {
          OR: [
            { bookId: null },
            {
              book: {
                schoolEntitlements: {
                  some: {
                    publisherId: "publisher-a",
                    schoolId: "school-a",
                    status: "ACTIVE",
                  },
                },
              },
            },
          ],
        },
      ],
    },
  );
});

test("assignment update changes only book and resource relations, never audience", () => {
  const update = buildSectionSubjectContentUpdate("book-a", ["resource-a"]);
  assert.deepEqual(update, {
    bookId: "book-a",
    resources: { set: [{ id: "resource-a" }] },
  });
  assert.equal("audience" in update, false);
});

test("assignment leaves future student eligibility entirely audience-driven", () => {
  assert.equal(canStudentUseResource(ResourceAudience.TEACHER_ONLY), false);
  assert.equal(canStudentUseResource(ResourceAudience.STUDENT), true);
  assert.equal(canStudentUseResource(ResourceAudience.BOTH), true);
});
