import type { Metadata } from "next";
import {
  Bell,
  Download,
  Globe,
  Moon,
  Monitor,
  Smartphone,
  Save,
} from "lucide-react";
import AccountSecurityPanel from "@/components/auth/AccountSecurityPanel";
import { requireTeacher } from "@/lib/teacher-dashboard";

export const metadata: Metadata = {
  title: "Settings | Bluegate Teacher Dashboard",
  description:
    "Manage your account preferences, notifications, downloads and security.",
};

export default async function SettingsPage() {
  const teacher = await requireTeacher();
  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl space-y-8 p-8">

        {/* Header */}

        <div>
          <h1 className="text-4xl font-bold text-slate-900">
            Settings
          </h1>

          <p className="mt-3 text-slate-600">
            Manage your Bluegate Teacher account preferences.
          </p>
        </div>

        {/* Notifications */}

        <section className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="mb-8 flex items-center gap-3">
            <Bell className="h-7 w-7 text-blue-700" />
            <h2 className="text-2xl font-bold">
              Notifications
            </h2>
          </div>

          <div className="space-y-5">

            <SettingToggle
              title="Email Notifications"
              description="Receive important updates by email."
            />

            <SettingToggle
              title="Training Alerts"
              description="Notify me about upcoming webinars."
            />

            <SettingToggle
              title="Resource Updates"
              description="Receive alerts when new resources are published."
            />

          </div>
        </section>

        {/* Downloads */}

        <section className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="mb-8 flex items-center gap-3">
            <Download className="h-7 w-7 text-blue-700" />
            <h2 className="text-2xl font-bold">
              Download Preferences
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">

            <SettingCard
              icon={<Download className="h-6 w-6" />}
              title="Default File Format"
              value="PDF"
            />

            <SettingCard
              icon={<Globe className="h-6 w-6" />}
              title="Language"
              value="English"
            />

          </div>
        </section>

        {/* Appearance */}

        <section className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="mb-8 flex items-center gap-3">
            <Moon className="h-7 w-7 text-blue-700" />
            <h2 className="text-2xl font-bold">
              Appearance
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">

            <SettingCard
              icon={<Monitor className="h-6 w-6" />}
              title="Theme"
              value="Light Mode"
            />

            <SettingCard
              icon={<Smartphone className="h-6 w-6" />}
              title="Responsive Layout"
              value="Enabled"
            />

          </div>
        </section>

        <AccountSecurityPanel
          email={teacher.user.email ?? "Not provided"}
          emailVerified={Boolean(teacher.user.emailVerifiedAt)}
        />

        {/* Save */}

        <div className="flex justify-end">

          <button className="flex items-center rounded-2xl bg-blue-600 px-8 py-4 font-semibold text-white transition hover:bg-blue-700">

            <Save className="mr-2 h-5 w-5" />

            Save Settings

          </button>

        </div>

      </div>
    </main>
  );
}

interface SettingCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
}

function SettingCard({
  icon,
  title,
  value,
}: SettingCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 p-6">

      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
        {icon}
      </div>

      <h3 className="mt-5 text-lg font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-slate-500">
        {value}
      </p>

    </div>
  );
}

interface SettingToggleProps {
  title: string;
  description: string;
}

function SettingToggle({
  title,
  description,
}: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-5">

      <div>

        <h3 className="font-semibold">
          {title}
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>

      </div>

      <label className="relative inline-flex cursor-pointer items-center">

        <input
          type="checkbox"
          defaultChecked
          className="peer sr-only"
        />

        <div className="peer h-7 w-12 rounded-full bg-slate-300 transition peer-checked:bg-blue-600"></div>

        <div className="absolute left-1 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5"></div>

      </label>

    </div>
  );
}
