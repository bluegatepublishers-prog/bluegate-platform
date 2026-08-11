import TeacherQuestionBank from "@/components/dashboard/TeacherQuestionBank";
import { getTeacherQuestionBankOptions } from "@/lib/teacher-question-bank-ui";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Question Bank | Bluegate Teacher Dashboard" };

export default async function TeacherQuestionBankPage() {
  const options = await getTeacherQuestionBankOptions();
  return <TeacherQuestionBank options={options} />;
}