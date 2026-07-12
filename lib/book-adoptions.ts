import { BookAdoptionStatus, EnrollmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolvePublisherForUser } from "@/lib/publisher-context";

export const adoptionInclude = { school: true, academicYear: true, schoolClass: true, section: true, sectionSubject: { include: { subject: true } }, book: { include: { class: true, subject: true, series: true } }, requestedBy: true, reviewedBy: true } as const;

export function normalizeAcademicName(value: string) { return value.trim().toLowerCase().replace(/\b(class|grade|standard|std)\b/g, "").replace(/[^a-z0-9]+/g, ""); }

export async function validateAdoptionScope(schoolId: string, academicYearId: string, sectionSubjectId: string, bookId: string) {
  const school=await prisma.school.findUnique({where:{id:schoolId},select:{publisherId:true}});
  const link = await prisma.sectionSubject.findFirst({ where: { id: sectionSubjectId, active: true, section: { active: true, schoolClass: { schoolId, academicYearId, active: true } } }, include: { subject: true, section: { include: { schoolClass: true } } } });
  const book = await prisma.book.findFirst({ where: { id: bookId, published: true }, include: { class: true } });
  if (!school?.publisherId || !link || !book || book.publisherId!==school.publisherId || book.subjectId !== link.subjectId || normalizeAcademicName(book.class.name) !== normalizeAcademicName(link.section.schoolClass.name)) return null;
  return { link, book, schoolClass: link.section.schoolClass, section: link.section };
}

export async function canAccessFullBook(user: { id?: string; role?: string }, bookId: string) {
  if (!user.id) return false;
  if (user.role === "ADMIN") {const publisher=await resolvePublisherForUser(user.id);return Boolean(publisher&&await prisma.book.findFirst({where:{id:bookId,publisherId:publisher.id},select:{id:true}}));}
  if (user.role === "SCHOOL") return Boolean(await prisma.schoolBookAdoption.findFirst({ where: { bookId, status: BookAdoptionStatus.APPROVED, active: true, academicYear: { current: true, active: true }, school: { userId: user.id } }, select: { id: true } }));
  if (user.role === "TEACHER") { const teacher=await prisma.teacher.findUnique({where:{userId:user.id},select:{id:true}}); return teacher?canTeacherAccessBook(teacher.id,bookId):false; }
  if (user.role === "STUDENT") return Boolean(await prisma.schoolBookAdoption.findFirst({ where: { bookId, status: BookAdoptionStatus.APPROVED, active: true, academicYear: { current: true, active: true }, section: { enrollments: { some: { status: EnrollmentStatus.ACTIVE, student: { userId: user.id, active: true } } } } }, select: { id: true } }));
  return false;
}

export async function canTeacherAccessBook(teacherId:string,bookId:string){const assignments=await prisma.teacherAssignment.findMany({where:{teacherId,active:true,academicYear:{current:true,active:true}},select:{academicYearId:true,sectionId:true,subjectId:true,type:true}});const scopes=assignments.map(a=>({academicYearId:a.academicYearId,sectionId:a.sectionId,...(a.type==="SUBJECT_TEACHER"?{sectionSubject:{subjectId:a.subjectId??""}}:{})}));if(!scopes.length)return false;return Boolean(await prisma.schoolBookAdoption.findFirst({where:{bookId,status:BookAdoptionStatus.APPROVED,active:true,OR:scopes},select:{id:true}}));}
