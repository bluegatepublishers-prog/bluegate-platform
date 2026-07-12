import { notFound } from "next/navigation";
import type { Prisma, ResourceType } from "@prisma/client";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function requireSchool() {
  const user = await requireUser(["SCHOOL"]);
  const school = await prisma.school.findUnique({ where: { userId: user.id }, include: { user: true } });
  if (!school) notFound();
  return school;
}

export async function getSchoolDashboard() {
  const school = await requireSchool();
  const currentYear=await prisma.academicYear.findFirst({where:{schoolId:school.id,current:true},select:{id:true,name:true}});
  const scope=currentYear?{schoolId:school.id,academicYearId:currentYear.id,active:true}:{schoolId:school.id,academicYearId:"",active:true};
  const [teachers,students,classes,sections,classTeachers,sectionSubjects,subjectTeachers] = await prisma.$transaction([
    prisma.teacher.count({ where: { schoolId: school.id,active:true } }),
    prisma.student.count({where:{schoolId:school.id,active:true}}),
    prisma.schoolClass.count({where:{schoolId:school.id,academicYearId:currentYear?.id??"",active:true}}),
    prisma.classSection.count({where:{schoolClass:{schoolId:school.id,academicYearId:currentYear?.id??"",active:true},active:true}}),
    prisma.teacherAssignment.count({where:{...scope,type:"CLASS_TEACHER"}}),
    prisma.sectionSubject.count({where:{active:true,section:{active:true,schoolClass:{schoolId:school.id,academicYearId:currentYear?.id??"",active:true}}}}),
    prisma.teacherAssignment.count({where:{...scope,type:"SUBJECT_TEACHER"}}),
  ]);
  return { school,currentYear,stats:{teachers,students,classes,sections,pendingClassTeachers:Math.max(0,sections-classTeachers),pendingSubjectTeachers:Math.max(0,sectionSubjects-subjectTeachers)} };
}

export async function getSchoolTeachers(query?: string) {
  const school = await requireSchool();
  return prisma.teacher.findMany({
    where: {
      schoolId: school.id,
      OR: query ? [
        { user: { name: { contains: query, mode: "insensitive" } } },
        { user: { email: { contains: query, mode: "insensitive" } } },
        { subject: { contains: query, mode: "insensitive" } },
        { classes: { contains: query, mode: "insensitive" } },
      ] : undefined,
    }, include: { user: true, assignments:{where:{active:true},include:{schoolClass:true,section:true,subject:true},orderBy:{createdAt:"asc"}} }, orderBy: { user: { name: "asc" } },
  });
}

export async function getSchoolResources(filters: { query?: string; classLevel?: string; subject?: string; type?: ResourceType }) {
  await requireSchool();
  const where: Prisma.ResourceWhereInput = {
    published: true, classLevel: filters.classLevel || undefined, subject: filters.subject || undefined, type: filters.type,
    OR: filters.query ? [
      { title: { contains: filters.query, mode: "insensitive" } },
      { description: { contains: filters.query, mode: "insensitive" } },
      { subject: { contains: filters.query, mode: "insensitive" } },
    ] : undefined,
  };
  const [resources, classes, subjects] = await prisma.$transaction([
    prisma.resource.findMany({ where, orderBy: { createdAt: "desc" } }),
    prisma.resource.findMany({ where: { published: true }, distinct: ["classLevel"], select: { classLevel: true }, orderBy: { classLevel: "asc" } }),
    prisma.resource.findMany({ where: { published: true }, distinct: ["subject"], select: { subject: true }, orderBy: { subject: "asc" } }),
  ]);
  return { resources, classes, subjects };
}

export async function getSchoolInspectionRequests() {
  const school = await requireSchool();
  return prisma.inspectionRequest.findMany({ where: { schoolId: school.id }, orderBy: { createdAt: "desc" } });
}
