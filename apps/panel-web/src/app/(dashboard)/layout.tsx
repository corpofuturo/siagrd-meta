import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase-server';
import TopBar from '@/components/TopBar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
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
