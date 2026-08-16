import type { Weekday } from "@prisma/client";

export const APPLICATION_TIME_ZONE = "Asia/Kolkata" as const;

const WEEKDAY_BY_INTL_NAME: Record<string, Weekday> = {
  Monday: "MONDAY" as Weekday,
  Tuesday: "TUESDAY" as Weekday,
  Wednesday: "WEDNESDAY" as Weekday,
  Thursday: "THURSDAY" as Weekday,
  Friday: "FRIDAY" as Weekday,
  Saturday: "SATURDAY" as Weekday,
  Sunday: "SUNDAY" as Weekday,
};

export function getWeekdayForTimeZone(date: Date, timeZone = APPLICATION_TIME_ZONE): Weekday {
  if (Number.isNaN(date.getTime())) throw new RangeError("Invalid date.");
  const weekdayName = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone }).format(date);
  const weekday = WEEKDAY_BY_INTL_NAME[weekdayName];
  if (!weekday) throw new RangeError("Unsupported weekday returned for timezone " + timeZone + ".");
  return weekday;
}
