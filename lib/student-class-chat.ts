import "server-only";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireStudentDashboardAccess } from "@/lib/student-dashboard";
import { canDeleteOwnSectionMessage } from "@/lib/section-chat-policy";

async function scope() {
  const [session, access] = await Promise.all([auth(), requireStudentDashboardAccess()]);
  if (!session?.user?.id || access.status !== "READY") throw new Error(access.status === "ACCESS_BLOCKED" ? access.message : "Class chat is unavailable.");
  return { userId: session.user.id, identity: access.identity };
}

async function room() {
  const current = await scope();
  const { school, enrollment } = current.identity;
  const value = await prisma.sectionChatRoom.upsert({
    where: { sectionId: enrollment.sectionId },
    update: {},
    create: { schoolId: school.id, academicYearId: enrollment.academicYearId, sectionId: enrollment.sectionId },
  });
  if (value.schoolId !== school.id || value.academicYearId !== enrollment.academicYearId) throw new Error("Class chat scope is invalid.");
  return { ...current, room: value };
}

export async function listStudentClassChat(cursor?: string | null, take = 30) {
  const current = await room();
  const readState = await prisma.sectionChatReadState.findUnique({ where: { roomId_userId: { roomId: current.room.id, userId: current.userId } } });
  const messages = await prisma.sectionChatMessage.findMany({
    where: { roomId: current.room.id, deletedAt: null },
    take: Math.min(Math.max(take, 1), 50) + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, text: true, kind: true, senderUserId: true, createdAt: true, pinnedAt: true, sender: { select: { name: true, role: true } }, replyTo: { select: { id: true, text: true, sender: { select: { name: true } } } } },
  });
  const hasMore = messages.length > Math.min(Math.max(take, 1), 50);
  if (hasMore) messages.pop();
  const unread = await prisma.sectionChatMessage.count({ where: { roomId: current.room.id, deletedAt: null, senderUserId: { not: current.userId }, createdAt: { gt: readState?.lastReadAt ?? new Date(0) } } });
  await prisma.sectionChatReadState.upsert({ where: { roomId_userId: { roomId: current.room.id, userId: current.userId } }, update: { lastReadAt: new Date() }, create: { roomId: current.room.id, userId: current.userId } });
  return { messages: messages.reverse(), unread, nextCursor: hasMore ? messages[0]?.id ?? null : null, currentUserId: current.userId };
}

export async function sendStudentClassMessage(input: { text: string; replyToId?: string | null }) {
  const current = await room();
  const text = input.text.trim();
  if (!text || text.length > 2000) throw new Error("Message must contain between 1 and 2,000 characters.");
  if (input.replyToId) {
    const reply = await prisma.sectionChatMessage.findFirst({ where: { id: input.replyToId, roomId: current.room.id, deletedAt: null }, select: { id: true } });
    if (!reply) throw new Error("The replied-to message is unavailable.");
  }
  return prisma.sectionChatMessage.create({ data: { roomId: current.room.id, senderUserId: current.userId, text, replyToId: input.replyToId || null }, select: { id: true, text: true, createdAt: true } });
}

export async function deleteStudentClassMessage(messageId: string) {
  const current = await room();
  const message = await prisma.sectionChatMessage.findFirst({ where: { id: messageId, roomId: current.room.id, deletedAt: null }, select: { id: true, senderUserId: true, createdAt: true } });
  if (!message || !canDeleteOwnSectionMessage({ actorUserId: current.userId, senderUserId: message.senderUserId, createdAt: message.createdAt })) throw new Error("This message cannot be deleted.");
  await prisma.sectionChatMessage.update({ where: { id: message.id }, data: { deletedAt: new Date(), text: "" } });
}
