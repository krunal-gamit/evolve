import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ExpenseManagement from '@/components/ExpenseManagement';

export default async function ExpensesPage() {
  const session = await getServerSession();

  // Redirect members to dashboard
  if (session?.user?.role === 'Member') {
    redirect('/');
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header pageTitle="Expense Management" />
        <div className="flex-1 overflow-auto">
          <ExpenseManagement />
        </div>
      </div>
    </div>
  );
}
