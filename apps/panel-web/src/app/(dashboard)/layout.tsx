export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TopBar from '@/components/TopBar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('siagrd_token')?.value;

  if (!token) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[#0A0E1A] flex flex-col">
      <TopBar />
      <div className="flex flex-1 pt-12 h-screen overflow-hidden">
        {children}
      </div>
    </div>
  );
}
