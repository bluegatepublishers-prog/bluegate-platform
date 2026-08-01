export default function MentorSettingsPage() {
  return (
    <main className="space-y-6">
      <header className="rounded-[2rem] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Mentor Account</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Settings</h1>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Notification Preferences</h2>
        <p className="mt-2 text-sm text-slate-600">Notification preference controls are available for mentor alerts, follow-ups, and reminders.</p>
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          <li>Session reminders for assigned students</li>
          <li>Learning-gap updates</li>
          <li>New published results</li>
          <li>Follow-up due reminders</li>
        </ul>
      </section>
    </main>
  );
}
