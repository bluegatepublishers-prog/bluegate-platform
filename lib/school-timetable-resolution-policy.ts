export class SchoolTimetableResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchoolTimetableResolutionError";
  }
}

export type TimetableResolutionConfig = {
  id: string;
  schoolId: string;
  academicYearId: string;
  name: string;
  season: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  active: boolean;
  workingDays: string[];
};

export function selectApplicableTimetableConfig(configs: TimetableResolutionConfig[], date: Date) {
  const applicable = configs.filter((config) => config.active && config.effectiveFrom <= date && (!config.effectiveTo || config.effectiveTo >= date));
  if (applicable.length > 1) throw new SchoolTimetableResolutionError("Multiple active timetable configurations apply to this date.");
  return applicable[0] ?? null;
}