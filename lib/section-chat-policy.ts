export type SectionChatActor = {
  schoolId: string;
  sectionId: string;
  active: boolean;
  schoolAccessActive: boolean;
  role: "STUDENT" | "TEACHER" | "SCHOOL";
  officiallyAssigned?: boolean;
};

export function canReadSectionChat(actor: SectionChatActor, room: { schoolId: string; sectionId: string }) {
  return actor.active && actor.schoolAccessActive && actor.schoolId === room.schoolId && actor.sectionId === room.sectionId && (actor.role === "STUDENT" || Boolean(actor.officiallyAssigned));
}

export const canPostSectionChat = canReadSectionChat;

export function canModerateSectionChat(actor: SectionChatActor, room: { schoolId: string; sectionId: string }) {
  return canReadSectionChat(actor, room) && actor.role !== "STUDENT" && Boolean(actor.officiallyAssigned);
}

export function canDeleteOwnSectionMessage(input: { actorUserId: string; senderUserId: string; createdAt: Date; now?: Date }) {
  return input.actorUserId === input.senderUserId && (input.now ?? new Date()).getTime() - input.createdAt.getTime() <= 15 * 60_000;
}
