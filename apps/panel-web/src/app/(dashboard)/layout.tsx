export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardShell from '@/components/DashboardShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const cookieStore = await cookies();
  const token = cookieStore.get('siagrd_token')?.value;

  if (!token) {
    redirect('/login');
  }

  return <DashboardShell>{children}</DashboardShell>;
}
