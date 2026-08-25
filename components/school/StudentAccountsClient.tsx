'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StudentAccountRow, StudentAccountWorkspace } from '@/lib/student-account-queries';

type Filter = 'ALL' | 'NOT_ACTIVATED' | 'ACTIVE';
type Result = { requested: number; activated: number; alreadyActive: number; failed: number; failures: Array<{ admissionNumber: string | null; studentName: string | null; message: string }> };

export default function StudentAccountsClient({ workspace }: { workspace: StudentAccountWorkspace }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('NOT_ACTIVATED');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  const classes = useMemo(() => [...new Set(workspace.rows.map((row) => row.className))].sort(), [workspace.rows]);
  const sections = useMemo(() => [...new Set(workspace.rows.map((row) => row.sectionName))].sort(), [workspace.rows]);
  const years = useMemo(() => [...new Set(workspace.rows.map((row) => row.academicYear))].sort(), [workspace.rows]);
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workspace.rows.filter((row) =>
      (filter === 'ALL' || row.status === filter) &&
      (!query || row.studentName.toLowerCase().includes(query) || row.admissionNumber.toLowerCase().includes(query)) &&
      (!classFilter || row.className === classFilter) &&
      (!sectionFilter || row.sectionName === sectionFilter) &&
      (!yearFilter || row.academicYear === yearFilter)
    );
  }, [classFilter, filter, search, sectionFilter, yearFilter, workspace.rows]);
  const eligibleIds = rows.filter((row) => row.eligible).map((row) => row.id);
  const allSelected = eligibleIds.length > 0 && eligibleIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    setResult(null);
  }
  function toggleAll() {
    setSelected((current) => { const next = new Set(current); if (allSelected) eligibleIds.forEach((id) => next.delete(id)); else eligibleIds.forEach((id) => next.add(id)); return next; });
  }
  async function activate() {
    if (!selected.size || pending) return;
    if (!window.confirm('Create login accounts for the selected students? Their one-time credentials will download in an Excel file.')) return;
    setPending(true); setError(''); setResult(null);
    try {
      const response = await fetch('/school-dashboard/students/accounts/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentIds: [...selected] }) });
      if (!response.ok) { const body = await response.json().catch(() => null) as { message?: string } | null; setError(body?.message || 'Student accounts could not be activated.'); return; }
      const encoded = response.headers.get('X-Bluegate-Activation-Result');
      if (encoded) setResult(JSON.parse(decodeBase64Url(encoded)) as Result);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'Student Login Credentials.xlsx'; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSelected(new Set()); router.refresh();
    } catch { setError('Student accounts could not be activated. Please try again.'); }
    finally { setPending(false); }
  }

  const failureText = result?.failures.map((failure) => (failure.studentName || failure.admissionNumber || 'Student') + ': ' + failure.message).join(' ') || '';
  return <>{result ? <p className='rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900'>Activation complete. {result.activated} activated, {result.alreadyActive} already active, {result.failed} failed. {failureText} The credentials workbook contains only newly activated accounts; keep it secure and delete it after distribution.</p> : null}{error ? <p role='alert' className='rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800'>{error}</p> : null}
    <section className='grid gap-3 sm:grid-cols-4'><Summary label='Total students' value={workspace.summary.totalStudents} /><Summary label='Active accounts' value={workspace.summary.activeAccounts} /><Summary label='Not activated' value={workspace.summary.notActivated} /><Summary label='Unavailable' value={workspace.summary.unavailable} /></section>
    <section className='mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'>
      <div className='flex flex-wrap items-center gap-2 border-b border-slate-100 p-4'>{(['ALL', 'NOT_ACTIVATED', 'ACTIVE'] as Filter[]).map((item) => <button key={item} type='button' onClick={() => setFilter(item)} className={'rounded-lg px-3 py-2 text-xs font-bold ' + (filter === item ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700')}>{item === 'ALL' ? 'All' : item === 'ACTIVE' ? 'Active' : 'Not activated'}</button>)}<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder='Search name or admission number' className='h-9 min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 text-sm' /><Select label='Class' value={classFilter} options={classes} onChange={setClassFilter} /><Select label='Section' value={sectionFilter} options={sections} onChange={setSectionFilter} /><Select label='Year' value={yearFilter} options={years} onChange={setYearFilter} /></div>
      <div className='flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3'><label className='flex items-center gap-2 text-sm font-semibold text-slate-700'><input type='checkbox' checked={allSelected} onChange={toggleAll} disabled={!eligibleIds.length} /> Select all eligible shown</label><div className='flex items-center gap-3'><span className='text-sm text-slate-600'>{selected.size} selected</span><button type='button' onClick={activate} disabled={!selected.size || pending} className='rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50'>{pending ? 'Activating...' : 'Activate selected'}</button></div></div>
      <div className='overflow-x-auto'><table className='w-full min-w-[1000px] text-left text-sm'><thead className='bg-slate-50 text-xs uppercase tracking-wide text-slate-500'><tr><th className='w-12 px-4 py-3'>Select</th><th className='px-4 py-3'>Admission</th><th className='px-4 py-3'>Student</th><th className='px-4 py-3'>Class / section</th><th className='px-4 py-3'>Roll</th><th className='px-4 py-3'>Email</th><th className='px-4 py-3'>Account</th></tr></thead><tbody className='divide-y divide-slate-100'>{rows.map((row) => <AccountRow key={row.id} row={row} checked={selected.has(row.id)} onToggle={toggle} />)}</tbody></table>{!rows.length ? <p className='p-8 text-center text-sm text-slate-500'>No students match these filters.</p> : null}</div>
    </section>
  </>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className='h-9 rounded-lg border border-slate-300 px-2 text-sm'><option value=''>All {label.toLowerCase()}s</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
}
function AccountRow({ row, checked, onToggle }: { row: StudentAccountRow; checked: boolean; onToggle: (id: string) => void }) {
  return <tr><td className='px-4 py-3'><input type='checkbox' checked={checked} disabled={!row.eligible} onChange={() => onToggle(row.id)} aria-label={'Select ' + row.studentName} /></td><td className='px-4 py-3 font-semibold'>{row.admissionNumber}</td><td className='px-4 py-3'>{row.studentName}<div className='text-xs text-slate-500'>{row.academicYear}</div></td><td className='px-4 py-3 text-slate-600'>{row.className} / {row.sectionName}</td><td className='px-4 py-3 text-slate-600'>{row.rollNumber || 'Not provided'}</td><td className='px-4 py-3 text-slate-600'>{row.email || 'Not provided'}</td><td className='px-4 py-3 font-bold'>{row.status === 'ACTIVE' ? <span className='text-emerald-700'>Active {row.loginId || ''}</span> : row.status === 'NOT_ACTIVATED' ? <span className='text-blue-700'>Not activated</span> : <span className='text-slate-500'>Unavailable</span>}</td></tr>;
}
function Summary({ label, value }: { label: string; value: number }) { return <div className='rounded-xl border border-slate-200 bg-white p-4 shadow-sm'><p className='text-xs font-bold uppercase tracking-wide text-slate-500'>{label}</p><p className='mt-1 text-2xl font-bold text-slate-900'>{value}</p></div>; }
function decodeBase64Url(value: string) { const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4); const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0)); return new TextDecoder().decode(bytes); }
