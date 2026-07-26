import Link from "next/link";

import { createSchoolAction } from "../actions";

export const metadata = { title: "Create School | Bluegate Admin" };

export default function CreateSchoolPage() {
  return <main className="mx-auto max-w-3xl space-y-6">
    <header>
      <Link href="/admin/schools" className="font-semibold text-blue-700">← Schools</Link>
      <h1 className="mt-3 text-3xl font-bold">Create school</h1>
      <p className="mt-2 text-slate-600">Creates a paused institution account. Resume it only after its profile and entitlement are ready. The school can establish its password through account recovery.</p>
    </header>
    <form action={createSchoolAction} className="grid gap-4 rounded-2xl border bg-white p-6 shadow-sm sm:grid-cols-2">
      <Field name="schoolName" label="School name" wide />
      <Field name="city" label="City" />
      <Field name="state" label="State" />
      <Field name="principalName" label="Principal display name" />
      <Field name="phone" label="Phone" />
      <Field name="email" label="School account email" type="email" wide />
      <button className="min-h-12 rounded-xl bg-blue-700 px-5 font-semibold text-white sm:w-fit">Create paused school</button>
    </form>
  </main>;
}

function Field({name,label,type="text",wide=false}:{name:string;label:string;type?:string;wide?:boolean}) {
  return <label className={`${wide?"sm:col-span-2 ":""}text-sm font-semibold`}>{label}<input name={name} type={type} required={["schoolName","city","state","email"].includes(name)} className="mt-2 block min-h-11 w-full rounded-xl border px-3 font-normal" /></label>;
}
