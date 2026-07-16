export type DatedActivity = { occurredAt: Date };

export function percent(part: number, whole: number) {
  if (whole <= 0) return 0;
  return Math.round(Math.min(100, Math.max(0, (part / whole) * 100)) * 100) / 100;
}

export function average(values: Array<number | null | undefined>) {
  const usable = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!usable.length) return null;
  return Math.round((usable.reduce((sum, value) => sum + value, 0) / usable.length) * 100) / 100;
}

export function calculateStreaks(activities: DatedActivity[], now = new Date()) {
  const day = (value: Date) => Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()) / 86_400_000;
  const days = [...new Set(activities.map((activity) => day(activity.occurredAt)))].sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  let previous: number | undefined;
  for (const current of days) {
    run = previous !== undefined && current === previous + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = current;
  }
  const today = day(now);
  const last = days.at(-1);
  let current = 0;
  if (last === today || last === today - 1) {
    current = 1;
    for (let index = days.length - 2; index >= 0 && days[index] === days[index + 1] - 1; index -= 1) current += 1;
  }
  return { current, longest };
}

export function weightedCompletion(values: Array<number | null | undefined>) {
  return average(values) ?? 0;
}
