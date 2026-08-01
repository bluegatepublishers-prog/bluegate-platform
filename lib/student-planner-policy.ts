export type CarryForwardItem = { fixedDate: boolean; status: string; originalDate: Date; currentDate: Date };

export function canCarryForward(item: CarryForwardItem) {
  return !item.fixedDate && ["PLANNED", "SCHEDULED", "IN_PROGRESS", "NOT_COMPLETED", "RESCHEDULED"].includes(item.status);
}

export function carryForward(item: CarryForwardItem, nextWorkingDay: Date) {
  if (!canCarryForward(item)) return { item, history: null };
  return {
    item: { ...item, status: "RESCHEDULED", currentDate: nextWorkingDay },
    history: { fromDate: item.currentDate, toDate: nextWorkingDay },
  };
}
