import {
  Sidebar,
  Header,
  WelcomeCard,
  StatsCards,
  QuickActions,
  LatestResources,
  RecentDownloads,
  UpcomingTraining,
  Notifications,
} from "@/components/dashboard";

export const metadata = {
  title: "Teacher Dashboard | Bluegate Publishers",
  description:
    "Bluegate Teacher Dashboard provides teachers with access to teaching resources, downloads, training, notifications and classroom tools.",
};

export default function TeacherDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <Header />

          {/* Dashboard Content */}
          <div className="space-y-8 p-6 lg:p-8">
            {/* Welcome */}
            <WelcomeCard />

            {/* Statistics */}
            <StatsCards />

            {/* Quick Actions */}
            <QuickActions />

            {/* Two Column Section */}
            <div className="grid gap-8 xl:grid-cols-3">
              {/* Latest Resources */}
              <div className="xl:col-span-2">
                <LatestResources />
              </div>

              {/* Notifications */}
              <div>
                <Notifications />
              </div>
            </div>

            {/* Recent Downloads */}
            <RecentDownloads />

            {/* Upcoming Training */}
            <UpcomingTraining />
          </div>
        </div>
      </div>
    </main>
  );
}