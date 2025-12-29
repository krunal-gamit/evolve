import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MemberManagement from '@/components/MemberManagement';

export default function MembersPage() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header pageTitle="Member Management" />
        <div className="flex-1 overflow-auto">
          <MemberManagement />
        </div>
      </div>
    </div>
  );
}