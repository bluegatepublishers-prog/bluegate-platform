import { requireUser } from "@/lib/authz";
import {
  Users,
  School,
  BookOpen,
  FolderOpen,
  FileText,
  Bell,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboardPage() {
  await requireUser(["ADMIN"]);
  const stats = [
    {
      title: "Teachers",
      value: 0,
      icon: Users,
      color: "bg-blue-100 text-blue-700",
    },
    {
      title: "Schools",
      value: 0,
      icon: School,
      color: "bg-green-100 text-green-700",
    },
    {
      title: "Books",
      value: 0,
      icon: BookOpen,
      color: "bg-purple-100 text-purple-700",
    },
    {
      title: "Resources",
      value: 0,
      icon: FolderOpen,
      color: "bg-amber-100 text-amber-700",
    },
  ];

  const actions = [
    {
      title: "Add Book",
      href: "/admin/books/new",
      icon: BookOpen,
    },
    {
      title: "Manage Teachers",
      href: "/admin/teachers",
      icon: Users,
    },
    {
      title: "Manage Schools",
      href: "/admin/schools",
      icon: School,
    },
    {
      title: "Upload Resource",
      href: "/admin/resources/new",
      icon: FolderOpen,
    },
    {
      title: "Inspection Requests",
      href: "/admin/inspection-requests",
      icon: FileText,
    },
    {
      title: "Send Notification",
      href: "/admin/notifications/new",
      icon: Bell,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Admin Dashboard
        </h1>

        <p className="mt-2 text-slate-600">
          Welcome to Bluegate Publishers Admin Panel.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-2xl bg-white p-6 shadow-sm border"
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-xl ${item.color}`}
              >
                <Icon className="h-7 w-7" />
              </div>

              <h2 className="mt-5 text-4xl font-bold">{item.value}</h2>

              <p className="mt-2 text-slate-600">{item.title}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border bg-white p-6">
        <h2 className="mb-6 text-xl font-bold">
          Quick Actions
        </h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {actions.map((item) => {
            const Icon = item.icon;

            return (
              <a
                key={item.title}
                href={item.href}
                className="rounded-xl border p-5 transition hover:border-blue-600 hover:bg-blue-50"
              >
                <Icon className="mb-4 h-8 w-8 text-blue-700" />

                <h3 className="font-semibold">
                  {item.title}
                </h3>
              </a>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl border bg-white p-6">
        <h2 className="mb-4 text-xl font-bold">
          Recent Activity
        </h2>

        <div className="rounded-xl border border-dashed p-12 text-center text-slate-500">
          Activity feed will appear here.
        </div>
      </div>
    </div>
  );
}