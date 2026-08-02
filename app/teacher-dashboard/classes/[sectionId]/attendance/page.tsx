import TeacherAttendanceWorkspace from "@/components/classroom/TeacherAttendanceWorkspace";
import { getTeacherAttendanceWorkspace } from "@/lib/attendance";

type SearchParams = Promise<{
	date?: string;
	period?: string;
	sessionType?: string;
	subject?: string;
}>;

export default async function TeacherClassAttendancePage({
	params,
	searchParams,
}: {
	params: Promise<{ sectionId: string }>;
	searchParams: SearchParams;
}) {
	const { sectionId } = await params;
	const query = await searchParams;

	const data = await getTeacherAttendanceWorkspace({
		sectionId,
		date: query.date,
		period: query.period,
		sessionType: query.sessionType,
		sectionSubjectId: query.subject,
	});

	const selectedSubjectId = query.subject && data.scope.sectionSubjects.some((item) => item.id === query.subject)
		? query.subject
		: data.scope.sectionSubjects[0]?.id ?? "";

	return (
		<TeacherAttendanceWorkspace
			routeBase={`/teacher-dashboard/classes/${sectionId}/attendance`}
			sectionId={sectionId}
			className={data.scope.schoolClass.name}
			sectionName={data.scope.section.name}
			teacherName={data.scope.teacher.user.name}
			attendanceMode={data.policy.attendanceMode}
			subjects={data.scope.sectionSubjects.map((item) => ({ id: item.id, name: item.subject.name }))}
			selectedSubjectId={selectedSubjectId}
			date={data.session.date.toISOString()}
			period={data.session.period ?? ""}
			sessionType={data.session.sessionType}
			editable={data.editable}
			sessionLocked={data.session.locked}
			sessionSubmitted={Boolean(data.session.submittedAt)}
			lockHour={data.lockHour}
			rows={data.roster}
		/>
	);
}
