import { prisma } from "@/lib/prisma";
import { getBookEntitlementForAuthenticatedUser } from "@/lib/entitlements/book";

export const adoptionInclude = { school: true, academicYear: true, schoolClass: true, section: true, sectionSubject: { include: { subject: true } }, book: { include: { class: true, subject: true, series: true } }, requestedBy: true, reviewedBy: true } as const;

export function normalizeAcademicName(value: string) { return value.trim().toLowerCase().replace(/\b(class|grade|standard|std)\b/g, "").replace(/[^a-z0-9]+/g, ""); }

export async function validateAdoptionScope(schoolId: string, academicYearId: string, sectionSubjectId: string, bookId: string) {
  const school=await prisma.school.findUnique({where:{id:schoolId},select:{publisherId:true}});
  const link = await prisma.sectionSubject.findFirst({ where: { id: sectionSubjectId, active: true, section: { active: true, schoolClass: { schoolId, academicYearId, active: true } } }, include: { subject: true, section: { include: { schoolClass: true } } } });
  const book = await prisma.book.findFirst({
    where: {
      id: bookId,
      published: true,
      archived: false,
      schoolEntitlements: {
        some: {
          schoolId,
          publisherId: school?.publisherId ?? "__none__",
          status: "ACTIVE",
        },
      },
    },
    include: { class: true },
  });
  if (!school?.publisherId || !link || !book || book.publisherId!==school.publisherId || book.subjectId !== link.subjectId || normalizeAcademicName(book.class.name) !== normalizeAcademicName(link.section.schoolClass.name)) return null;
  return { link, book, schoolClass: link.section.schoolClass, section: link.section };
}

export async function canAccessFullBook(user: { id?: string; role?: string }, bookId: string) {
  return (await getBookEntitlementForAuthenticatedUser(user, { bookId })).allowed;
}

export async function canTeacherAccessBook(teacherId:string,bookId:string){const teacher=await prisma.teacher.findUnique({where:{id:teacherId},select:{userId:true}});return Boolean(teacher&&(await getBookEntitlementForAuthenticatedUser({id:teacher.userId,role:"TEACHER"},{bookId})).allowed);}
