export type SchoolManagedStudentAccountInput = {
  studentSchoolId: string;
  authenticatedSchoolId: string;
  studentPublisherId: string | null;
  schoolPublisherId: string | null;
  studentActive: boolean;
  schoolActive: boolean;
  publisherActive: boolean;
  hasCurrentActiveEnrollment: boolean;
  hasUser: boolean;
};

export function isEligibleForSchoolManagedStudentAccount(input: SchoolManagedStudentAccountInput) {
  return input.studentSchoolId === input.authenticatedSchoolId
    && Boolean(input.studentPublisherId && input.schoolPublisherId && input.studentPublisherId === input.schoolPublisherId)
    && input.studentActive
    && input.schoolActive
    && input.publisherActive
    && input.hasCurrentActiveEnrollment
    && !input.hasUser;
}
