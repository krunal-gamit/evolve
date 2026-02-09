import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import FeeManagement from '@/components/FeeManagement';

export default async function FeesPage() {
  const session = await getServerSession();

  // Redirect members to dashboard
  if (session?.user?.role === 'Member') {
    redirect('/');
  }

  return <FeeManagement />;
}
