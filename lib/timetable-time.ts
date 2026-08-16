export function parseTimeMinutes(value: string) {
  const raw = value.trim();
  const match = /^(\d{2}):(\d{2})$/.exec(raw);
  if (!match) throw new Error("Enter a valid time.");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new Error("Enter a valid time.");
  return hour * 60 + minute;
}
