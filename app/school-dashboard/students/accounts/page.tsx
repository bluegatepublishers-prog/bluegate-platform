import Link from 'next/link';
import StudentAccountsClient from '@/components/school/StudentAccountsClient';
import { getStudentAccountWorkspace } from '@/lib/student-account-queries';

export default async function StudentAccountsPage() {
  const workspace = await getStudentAccountWorkspace();
  return <main className='space-y-5 p-4 text-[15px] sm:p-6 lg:p-8'><header className='flex flex-wrap items-end justify-between gap-3'><div><p className='text-xs font-bold uppercase tracking-[0.16em] text-blue-700'>People</p><h1 className='mt-1 text-2xl font-bold text-slate-950'>Student Accounts</h1><p className='mt-1 text-sm text-slate-600'>Create school-managed student login accounts and download their one-time credentials securely.</p></div><div className='flex flex-wrap gap-2'><Link href='/school-dashboard/students'>Student Directory</Link><Link href='/school-dashboard/students/bulk-upload'>Bulk Upload</Link></div></header><StudentAccountsClient workspace={workspace} /></main>;
}
