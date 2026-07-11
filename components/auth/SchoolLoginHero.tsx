import { BookOpen, Building2, CheckCircle2, ShieldCheck, Users } from "lucide-react";

export default function SchoolLoginHero() {
  const features = [
    "Manage your linked teacher community",
    "Browse published educational resources",
    "Track school inspection-copy requests",
    "Review institution and contact details",
  ];

  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 lg:flex lg:flex-col lg:justify-between">
      <div className="absolute inset-0">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>
      <div className="relative flex h-full flex-col justify-between p-14">
        <div>
          <div className="inline-flex items-center rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-blue-100 backdrop-blur">
            <Building2 className="mr-2 h-4 w-4" /> Bluegate School Portal
          </div>
          <h1 className="mt-8 text-5xl font-bold leading-tight text-white">Supporting<br />Schools<br />Every Day</h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-blue-100">
            A secure workspace for school administrators and coordinators to access Bluegate resources and school services.
          </p>
          <div className="mt-12 space-y-5">
            {features.map((feature) => <div key={feature} className="flex items-center"><CheckCircle2 className="mr-4 h-6 w-6 text-green-300" /><span className="text-blue-50">{feature}</span></div>)}
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <HeroCard icon={BookOpen} title="Resources" text="Academic Library" />
          <HeroCard icon={Users} title="Teachers" text="School Community" />
          <HeroCard icon={ShieldCheck} title="Secure" text="School Access" />
        </div>
      </div>
    </div>
  );
}

function HeroCard({ icon: Icon, title, text }: { icon: typeof BookOpen; title: string; text: string }) {
  return <div className="rounded-2xl bg-white/10 p-5 backdrop-blur"><Icon className="h-8 w-8 text-blue-200" /><h3 className="mt-4 text-2xl font-bold text-white">{title}</h3><p className="mt-2 text-sm text-blue-100">{text}</p></div>;
}
