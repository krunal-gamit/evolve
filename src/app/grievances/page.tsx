import { getServerSession } from 'next-auth';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import GrievanceManagement from '@/components/GrievanceManagement';

export default function GrievancesPage() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header pageTitle="Grievances" />
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#F2F2F7] via-[#E8E8ED] to-[#F2F2F7]">
          <GrievanceManagement />
        </main>
        <Footer />
      </div>
    </div>
  );
}
