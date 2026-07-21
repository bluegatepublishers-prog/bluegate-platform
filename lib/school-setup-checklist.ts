export type SchoolSetupChecklistStep = {
  key: "profile" | "academicYear" | "sections" | "staff" | "students" | "assignments";
  label: string;
  href: string;
  complete: boolean;
};

export type SchoolSetupChecklistSnapshot = {
  hasProfileBasics: boolean;
  hasCurrentAcademicYear: boolean;
  hasSections: boolean;
  hasStaff: boolean;
  hasStudents: boolean;
  hasTeacherAssignments: boolean;
};

export function buildSchoolSetupChecklist(
  snapshot: SchoolSetupChecklistSnapshot,
): SchoolSetupChecklistStep[] {
  return [
    {
      key: "profile",
      label: "Confirm school / institution profile",
      href: "/school-dashboard/profile",
      complete: snapshot.hasProfileBasics,
    },
    {
      key: "academicYear",
      label: "Create current academic year",
      href: "/school-dashboard/academic-years",
      complete: snapshot.hasCurrentAcademicYear,
    },
    {
      key: "sections",
      label: "Create classes and sections",
      href: "/school-dashboard/classes",
      complete: snapshot.hasSections,
    },
    {
      key: "staff",
      label: "Add staff or teachers",
      href: "/school-dashboard/staff",
      complete: snapshot.hasStaff,
    },
    {
      key: "students",
      label: "Add students",
      href: "/school-dashboard/students",
      complete: snapshot.hasStudents,
    },
    {
      key: "assignments",
      label: "Assign teachers to subjects",
      href: "/school-dashboard/teacher-assignments",
      complete: snapshot.hasTeacherAssignments,
    },
  ];
}