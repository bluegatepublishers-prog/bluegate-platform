import { Clock3 } from "lucide-react";

export default function FutureClassroomSection({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-2xl border border-dashed bg-white p-8 text-center shadow-sm">
      <Clock3 className="mx-auto h-10 w-10 text-slate-300" />
      <h2 className="mt-4 text-2xl font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-slate-600">{description}</p>
    </section>
  );
}
