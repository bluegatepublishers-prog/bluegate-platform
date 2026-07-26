"use server";

export async function updateTeacherAiPlan(_teacherId: string, _form: FormData) {
  void _teacherId;
  void _form;
  return {
    ok: false,
    message: "Publisher administrators cannot modify teacher accounts or plans.",
  };
}
