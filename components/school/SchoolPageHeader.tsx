import type { ReactNode } from "react";
import { schoolDescription, schoolPage, schoolTitle } from "./compact-school-styles";
export default function SchoolPageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: ReactNode }) {
  return <header className={`flex flex-wrap items-start justify-between gap-3 ${schoolPage.split(" ").slice(0, 1).join(" ")}`}><div>{eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">{eyebrow}</p> : null}<h1 className={schoolTitle}>{title}</h1>{description ? <p className={schoolDescription}>{description}</p> : null}</div>{children}</header>;
}
