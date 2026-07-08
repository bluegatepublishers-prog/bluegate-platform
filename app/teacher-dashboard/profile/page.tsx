import type { Metadata } from "next";
import {
  User,
  School,
  Mail,
  Phone,
  MapPin,
  BookOpen,
  GraduationCap,
  Shield,
  Calendar,
  Award,
  Camera,
  Edit,
  Lock,
} from "lucide-react";

export const metadata: Metadata = {
  title: "My Profile | Bluegate Teacher Dashboard",
  description:
    "Manage your Bluegate Teacher account profile and professional information.",
};

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl space-y-8 p-8">

        {/* Header */}

        <div>
          <h1 className="text-4xl font-bold text-slate-900">
            My Profile
          </h1>

          <p className="mt-3 text-slate-600">
            Manage your personal information, school details and account.
          </p>
        </div>

        {/* Profile Hero */}

        <section className="rounded-3xl bg-gradient-to-r from-blue-700 to-blue-900 p-10 text-white shadow-xl">

          <div className="flex flex-col items-center gap-8 lg:flex-row">

            <div className="relative">

              <div className="flex h-36 w-36 items-center justify-center rounded-full bg-white">

                <User className="h-20 w-20 text-blue-700" />

              </div>

              <button className="absolute bottom-1 right-1 rounded-full bg-amber-400 p-3 text-slate-900 shadow-lg transition hover:bg-amber-300">

                <Camera className="h-5 w-5" />

              </button>

            </div>

            <div className="flex-1">

              <h2 className="text-4xl font-bold">
                Rahul Sharma
              </h2>

              <p className="mt-3 text-xl text-blue-100">
                Senior Science Teacher
              </p>

              <div className="mt-6 flex flex-wrap gap-3">

                <span className="rounded-full bg-white/20 px-4 py-2 text-sm">
                  CBSE
                </span>

                <span className="rounded-full bg-white/20 px-4 py-2 text-sm">
                  Class 6–8
                </span>

                <span className="rounded-full bg-white/20 px-4 py-2 text-sm">
                  Science
                </span>

                <span className="rounded-full bg-green-500 px-4 py-2 text-sm font-semibold">
                  Active Member
                </span>

              </div>

            </div>

            <button className="rounded-2xl bg-white px-6 py-4 font-semibold text-blue-700 transition hover:bg-blue-50">

              <Edit className="mr-2 inline h-5 w-5" />

              Edit Profile

            </button>

          </div>

        </section>

        {/* Information Grid */}

        <div className="grid gap-8 lg:grid-cols-2">

          {/* Personal Information */}

          <section className="rounded-3xl bg-white p-8 shadow-sm">

            <h3 className="mb-8 text-2xl font-bold">
              Personal Information
            </h3>

            <div className="space-y-6">

              <InfoRow
                icon={<User className="h-5 w-5" />}
                label="Full Name"
                value="Rahul Sharma"
              />

              <InfoRow
                icon={<Mail className="h-5 w-5" />}
                label="Email"
                value="teacher@bluegate.in"
              />

              <InfoRow
                icon={<Phone className="h-5 w-5" />}
                label="Mobile"
                value="+91 9876543210"
              />

              <InfoRow
                icon={<MapPin className="h-5 w-5" />}
                label="Location"
                value="New Delhi"
              />

              <InfoRow
                icon={<Calendar className="h-5 w-5" />}
                label="Member Since"
                value="July 2026"
              />

            </div>

          </section>

          {/* School Information */}

          <section className="rounded-3xl bg-white p-8 shadow-sm">

            <h3 className="mb-8 text-2xl font-bold">
              School Information
            </h3>

            <div className="space-y-6">

              <InfoRow
                icon={<School className="h-5 w-5" />}
                label="School"
                value="ABC Public School"
              />

              <InfoRow
                icon={<GraduationCap className="h-5 w-5" />}
                label="Designation"
                value="Senior Teacher"
              />

              <InfoRow
                icon={<BookOpen className="h-5 w-5" />}
                label="Subject"
                value="Science"
              />

              <InfoRow
                icon={<Award className="h-5 w-5" />}
                label="Classes"
                value="VI, VII & VIII"
              />

            </div>

          </section>

        </div>

        {/* Account Security */}

        <section className="rounded-3xl bg-white p-8 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <h3 className="text-2xl font-bold">
                Account Security
              </h3>

              <p className="mt-2 text-slate-600">
                Manage your password and account security settings.
              </p>

            </div>

            <button className="flex items-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700">

              <Lock className="mr-2 h-5 w-5" />

              Change Password

            </button>

          </div>

        </section>

        {/* Account Status */}

        <section className="rounded-3xl bg-white p-8 shadow-sm">

          <div className="flex items-center gap-5">

            <Shield className="h-14 w-14 text-green-600" />

            <div>

              <h3 className="text-2xl font-bold text-slate-900">
                Verified Teacher Account
              </h3>

              <p className="mt-2 text-slate-600">
                Your account has been verified by Bluegate Publishers.
                You have full access to teacher resources, downloads
                and training programmes.
              </p>

            </div>

          </div>

        </section>

      </div>
    </main>
  );
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoRow({
  icon,
  label,
  value,
}: InfoRowProps) {
  return (
    <div className="flex items-start gap-4">

      <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
        {icon}
      </div>

      <div>

        <p className="text-sm text-slate-500">
          {label}
        </p>

        <h4 className="mt-1 text-lg font-semibold text-slate-900">
          {value}
        </h4>

      </div>

    </div>
  );
}