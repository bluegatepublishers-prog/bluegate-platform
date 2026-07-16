import type {
  StudentAccessGrantSourceValue,
  StudentAccessPlanValue,
} from "./types";

export interface StudentPlanGrantCandidate {
  academicYearId: string;
  plan: StudentAccessPlanValue;
  source: Exclude<StudentAccessGrantSourceValue, "DEFAULT_SCHOOL_BASIC">;
  active: boolean;
  startsAt: Date;
  endsAt: Date | null;
}

export interface EffectiveStudentPlan {
  plan: StudentAccessPlanValue;
  source: StudentAccessGrantSourceValue;
  academicYearId: string;
  startsAt: Date | null;
  endsAt: Date | null;
}

const PLAN_STRENGTH: Record<StudentAccessPlanValue, number> = {
  SCHOOL_BASIC: 0,
  SCHOOL_PREMIUM: 1,
  INDIVIDUAL_PREMIUM: 2,
  INDIVIDUAL_PREMIUM_MENTOR: 3,
};

const SOURCE_STRENGTH: Record<
  Exclude<StudentAccessGrantSourceValue, "DEFAULT_SCHOOL_BASIC">,
  number
> = {
  SCHOOL: 0,
  MANUAL_TEST: 1,
  PUBLISHER_ADMIN: 2,
  INDIVIDUAL: 3,
};

export function isStudentPlanGrantActive(
  grant: StudentPlanGrantCandidate,
  academicYearId: string,
  now: Date,
) {
  return (
    grant.active &&
    grant.academicYearId === academicYearId &&
    grant.startsAt <= now &&
    (!grant.endsAt || grant.endsAt >= now)
  );
}

export function resolveEffectiveStudentPlan(
  academicYearId: string,
  grants: readonly StudentPlanGrantCandidate[],
  now: Date = new Date(),
): EffectiveStudentPlan {
  const active = grants
    .filter((grant) => isStudentPlanGrantActive(grant, academicYearId, now))
    .sort(
      (left, right) =>
        PLAN_STRENGTH[right.plan] - PLAN_STRENGTH[left.plan] ||
        SOURCE_STRENGTH[right.source] - SOURCE_STRENGTH[left.source] ||
        right.startsAt.getTime() - left.startsAt.getTime(),
    );
  const strongest = active[0];
  return strongest
    ? {
        plan: strongest.plan,
        source: strongest.source,
        academicYearId,
        startsAt: strongest.startsAt,
        endsAt: strongest.endsAt,
      }
    : {
        plan: "SCHOOL_BASIC",
        source: "DEFAULT_SCHOOL_BASIC",
        academicYearId,
        startsAt: null,
        endsAt: null,
      };
}
