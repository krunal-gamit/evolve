import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ExpenseManagement from '@/components/ExpenseManagement';

export default function ExpensesPage() {
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