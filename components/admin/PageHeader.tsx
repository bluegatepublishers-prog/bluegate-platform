import Link from "next/link";
import { Plus } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description: string;
  buttonLabel?: string;
  buttonHref?: string;
}

export default function PageHeader({
  title,
  description,
  buttonLabel,
  buttonHref,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {title}
        </h1>

        <p className="mt-2 text-slate-600">
          {description}
        </p>
      </div>

      {buttonHref && buttonLabel && (
        <Link
          href={buttonHref}
          className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus className="mr-2 h-5 w-5" />
          {buttonLabel}
        </Link>
      )}
    </div>
  );
}