import TeacherClassChat from "@/components/classroom/TeacherClassChat";
import { requireTeacherSubject } from "@/lib/teacher-experience";

export default async function TeacherClassChatPage({ params, searchParams }: { params: Promise<{ sectionId: string }>; searchParams: Promise<{ subject?: string }> }) { const { sectionId } = await params; await requireTeacherSubject(sectionId, (await searchParams).subject); return <TeacherClassChat sectionId={sectionId} />; }
