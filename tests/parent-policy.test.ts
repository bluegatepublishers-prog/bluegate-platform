import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  canParentViewChild,
  friendlyPlan,
  parentGapMessage,
} from "../lib/parent-policy";

const read = (path: string) => readFileSync(path, "utf8");

const allowed = {
  parentActive: true,
  studentActive: true,
  relationshipStatus: "APPROVED",
  canViewLearning: true,
  schoolApproved: true,
  schoolAccessActive: true,
  publisherActive: true,
  featureEnabled: true,
  relationshipStudentId: "s1",
  requestedStudentId: "s1",
};

test("approved relationship allows exact child", () => {
  assert.equal(canParentViewChild(allowed), true);
});

for (const [name, change] of [
  ["pending", { relationshipStatus: "PENDING" }],
  ["rejected", { relationshipStatus: "REJECTED" }],
  ["revoked", { relationshipStatus: "REVOKED" }],
  ["inactive parent", { parentActive: false }],
  ["inactive student", { studentActive: false }],
  ["feature disabled", { featureEnabled: false }],
  ["wrong child", { requestedStudentId: "s2" }],
  ["school unavailable", { schoolApproved: false }],
  ["school access inactive", { schoolAccessActive: false }],
  ["publisher unavailable", { publisherActive: false }],
  ["learning permission denied", { canViewLearning: false }],
] as const) {
  test(`${name} is denied`, () => {
    assert.equal(
      canParentViewChild({
        ...allowed,
        ...change,
      }),
      false,
    );
  });
}

test("gap wording contains no internal score or threshold", () => {
  const value = parentGapMessage({
    chapter: "Fractions",
  });

  assert.equal(
    value,
    "Needs more practice with Fractions.",
  );

  assert.doesNotMatch(
    value,
    /score|threshold|severity|policy/i,
  );
});

test("plans use friendly labels", () => {
  assert.equal(
    friendlyPlan("INDIVIDUAL_PREMIUM_MENTOR"),
    "Individual Premium with Mentor",
  );
});

test(
  "parent role has isolated login, callback home and proxy protection",
  () => {
    const auth = read("auth.ts");
    const policy = read("lib/auth-policy.ts");
    const proxy = read("proxy.ts");

    assert.match(auth, /user\.role === "PARENT"/);
    assert.match(
      policy,
      /PARENT: "\/parent-dashboard"/,
    );
    assert.match(policy, /"\/parent-login"/);
    assert.match(proxy, /parent-dashboard/);
  },
);

test("inactive parent login is denied", () => {
  assert.match(
    read("auth.ts"),
    /user\.role === "PARENT" && !user\.parent\?\.active/,
  );
});

test(
  "parent activation is invitation-only, hashed, expiring and single-use",
  () => {
    const source = read("lib/parent-onboarding.ts");

    const activation = source.slice(
      source.indexOf(
        "export async function activateParentInvitation",
      ),
    );

    assert.match(activation, /parent-invitation:/);
    assert.match(
      activation,
      /usedAt|revokedAt|expiresAt/,
    );
    assert.match(
      activation,
      /pg_advisory_xact_lock/,
    );
    assert.doesNotMatch(
      activation,
      /studentId = cleanText\(input\.studentId/,
    );
  },
);

test(
  "duplicate email is handled without creating a duplicate user",
  () => {
    const source = read("lib/parent-onboarding.ts");

    assert.match(source, /user\.findUnique/);
    assert.match(
      source,
      /An account already uses this email/,
    );
  },
);

test(
  "activation creates pending non-viewable relationship for separate school verification",
  () => {
    const source = read("lib/parent-onboarding.ts");

    assert.match(
      source,
      /status: ParentRelationshipStatus\.PENDING/,
    );
    assert.match(
      source,
      /canViewLearning: false/,
    );
  },
);

test(
  "school relationship mutations derive scope and reviewer server-side",
  () => {
    const source = read("lib/parent-onboarding.ts");

    assert.match(source, /requireSchool\(\)/);
    assert.match(
      source,
      /student: \{ schoolId: school\.id \}/,
    );
    assert.match(
      source,
      /approvedById: school\.userId/,
    );
    assert.match(
      source,
      /revokedById: school\.userId/,
    );
  },
);

test(
  "relationship rejection and revocation preserve history",
  () => {
    const source = read("lib/parent-onboarding.ts");

    assert.match(source, /activeKey: null/);
    assert.doesNotMatch(
      source,
      /parentStudentRelationship\.delete/,
    );
  },
);

test(
  "child helper requires approved exact relationship, enrollment and feature",
  () => {
    const source = read("lib/parent-dashboard.ts");

    assert.match(
      source,
      /parentId: parent\.id, studentId, status: "APPROVED"/,
    );
    assert.match(source, /PARENT_PORTAL/);
    assert.match(
      source,
      /academicYear: \{ active: true, current: true \}/,
    );
  },
);

test(
  "assessment summaries enforce release timing and showScore",
  () => {
    const source = read("lib/parent-dashboard.ts");

    assert.match(
      source,
      /canReleaseAssessmentResult/,
    );
    assert.match(
      source,
      /settings\?\.showScore/,
    );
    assert.doesNotMatch(
      source,
      /AssessmentResponse|correctAnswer|explanation/,
    );
  },
);

test(
  "gaps omit internal evidence and only include open states",
  () => {
    const source = read("lib/parent-dashboard.ts");

    assert.match(
      source,
      /\["OPEN", "ACKNOWLEDGED"\]/,
    );
    assert.doesNotMatch(
      source,
      /thresholdValue|policyVersion|evidenceCount/,
    );
  },
);

test(
  "remedials are read-only parent summaries",
  () => {
    const source = read("lib/parent-dashboard.ts");

    assert.match(
      source,
      /\["ACTIVE", "COMPLETED"\]/,
    );
    assert.doesNotMatch(
      source,
      /remedialStep\.update|remedialPlan\.update/,
    );
  },
);

test(
  "mentor summary exposes primary assignment but no notes",
  () => {
    const source = read("lib/parent-dashboard.ts");

    assert.match(source, /role: "PRIMARY"/);
    assert.doesNotMatch(
      source,
      /mentorNote|body:/,
    );
  },
);

test("AI summary is aggregate-only", () => {
  const source = read("lib/parent-dashboard.ts");

  assert.match(source, /aiRequests/);
  assert.match(source, /aiSessions/);
  assert.doesNotMatch(
    source,
    /studentAiConversation|StudentAiMessage|provider|model|quota|tokenCount/,
  );
});

test(
  "reports contain no rankings or predictive claims",
  () => {
    const source = read(
      "app/parent-dashboard/children/[studentId]/reports/page.tsx",
    );

    assert.match(
      source,
      /No rankings or predictions/,
    );

    assert.doesNotMatch(
      source,
      /publisherAnalytics|schoolAnalytics|teacherAnalytics/,
    );
  },
);

test(
  "parent home is child-scoped and omits messaging",
  () => {
    const source =
      read("app/parent-dashboard/page.tsx") +
      read("lib/parent-dashboard.ts");

    assert.match(
      source,
      /getParentChildPortalData/,
    );

    assert.match(
      source,
      /No attendance source is configured/,
    );

    assert.doesNotMatch(
      source,
      /Class Chat|parent-to-teacher|Messages/,
    );
  },
);

test(
  "parent shell exposes only approved navigation",
  () => {
    const source = read(
      "components/parent/ParentPortalShell.tsx",
    );

    assert.match(source, /Home/);
    assert.match(source, /My Children/);
    assert.match(source, /Notices/);
    assert.match(source, /Planner/);
    assert.match(source, /My Profile/);
    assert.match(source, /Settings/);
    assert.match(source, /Help/);
    assert.match(source, /Logout/);

    assert.doesNotMatch(
      source,
      /Messages|Class Chat/,
    );
  },
);