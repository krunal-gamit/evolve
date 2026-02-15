import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import Reports from '@/components/Reports';

export default async function ReportsPage() {
  const session = await getServerSession();

  // Redirect members to dashboard
  if (session?.user?.role === 'Member') {
    redirect('/');
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header pageTitle="Reports" />
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#F2F2F7] via-[#E8E8ED] to-[#F2F2F7]">
            <Reports />
        </main>
        <Footer />
      </div>
    </div>
  );
}
