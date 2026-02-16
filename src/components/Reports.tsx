'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, ColumnDef, flexRender } from '@tanstack/react-table';
import { format, subDays, subMonths, startOfYear } from 'date-fns';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Toaster } from 'react-hot-toast';

interface Subscription {
  _id: string;
  member: {
    name: string;
    email: string;
    memberId: string;
    phone: string;
    address: string;
    examPrep: string;
    createdAt: string;
  };
  seat: {
    seatNumber: number;
    status: string;
  };
  location?: { _id: string; name: string; address: string };
  startDate: string;
  endDate: string;
  duration: string;
  totalAmount: number;
  status: string;
  payments: {
    _id: string;
    amount: number;
    method: string;
    upiCode?: string;
    dateTime: string;
    uniqueCode: string;
  }[];
}

interface Expense {
  _id: string;
  description: string;
  amount: number;
  category: string;
  paidTo: string;
  method: string;
  date: string;
  location?: { _id: string; name: string };
  createdAt: string;
}

export default function Reports() {
  const { data: session } = useSession();
  const isMember = session?.user.role === 'Member';

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [reportType, setReportType] = useState<'income' | 'expense'>('income');

  const fetchSubscriptions = async () => {
    const res = await fetch('/api/subscriptions');
    let data = await res.json();
    data = data.filter((sub: Subscription) => sub.member); // Filter out subscriptions without member
    if (session?.user.role === 'Member') {
      data = data.filter((sub: Subscription) => sub.member.email === session.user.email);
    }
    data.sort((a: Subscription, b: Subscription) => {
      const getLastPaymentDate = (sub: Subscription) => {
        if (sub.payments && sub.payments.length > 0) {
          return Math.max(...sub.payments.map((p: any) => new Date(p.dateTime).getTime()));
        }
        return new Date(sub.startDate).getTime();
      };
      return getLastPaymentDate(b) - getLastPaymentDate(a);
    });
    setSubscriptions(data);
  };

  const fetchExpenses = async () => {
    if (session?.user.role === 'Member') {
      setExpenses([]);
      return;
    }
    const res = await fetch('/api/expenses');
    if (res.ok) {
      const data = await res.json();
      data.sort((a: Expense, b: Expense) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setExpenses(data);
    } else {
      setExpenses([]);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    fetchExpenses();
    if (session?.user.role === 'Member') {
      setReportType('income');
    }
  }, [session]);

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      const matchesGlobal = globalFilter === '' ||
        sub.member.name.toLowerCase().includes(globalFilter.toLowerCase()) ||
        sub.member.memberId.toLowerCase().includes(globalFilter.toLowerCase()) ||
        sub.seat.seatNumber.toString().includes(globalFilter);

      const matchesStartDate = !startDateFilter || new Date(sub.startDate) >= new Date(startDateFilter);
      const matchesEndDate = !endDateFilter || new Date(sub.startDate) <= new Date(endDateFilter);
      const matchesStatus = !statusFilter || sub.status === statusFilter;

      return matchesGlobal && matchesStartDate && matchesEndDate && matchesStatus;
    });
  }, [subscriptions, globalFilter, startDateFilter, endDateFilter, statusFilter]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchesGlobal = globalFilter === '' ||
        exp.description.toLowerCase().includes(globalFilter.toLowerCase()) ||
        exp.category.toLowerCase().includes(globalFilter.toLowerCase()) ||
        exp.paidTo.toLowerCase().includes(globalFilter.toLowerCase());

      const matchesStartDate = !startDateFilter || new Date(exp.date) >= new Date(startDateFilter);
      const matchesEndDate = !endDateFilter || new Date(exp.date) <= new Date(endDateFilter);

      return matchesGlobal && matchesStartDate && matchesEndDate;
    });
  }, [expenses, globalFilter, startDateFilter, endDateFilter]);

  const totalRevenue = subscriptions.reduce((sum, sub) => sum + sub.totalAmount, 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  const subscriptionColumns: ColumnDef<Subscription>[] = [
    { accessorKey: 'member.memberId', header: 'Member ID' },
    { accessorKey: 'member.name', header: 'Name' },
    { accessorKey: 'member.phone', header: 'Phone' },
    { accessorKey: 'seat.seatNumber', header: 'Seat' },
    { 
      accessorKey: 'location', 
      header: 'Location',
      cell: ({ row }) => row.original.location?.name || '-'
    },
    {
      accessorKey: 'startDate',
      header: 'Start Date',
      cell: ({ getValue }) => format(new Date(getValue<string>()), 'dd/MM/yyyy')
    },
    {
      accessorKey: 'endDate',
      header: 'End Date',
      cell: ({ getValue }) => format(new Date(getValue<string>()), 'dd/MM/yyyy')
    },
    { accessorKey: 'duration', header: 'Duration' },
    { accessorKey: 'totalAmount', header: 'Amount', cell: ({ getValue }) => `₹${getValue<number>().toLocaleString('en-IN')}` },
    { 
      accessorKey: 'status', 
      header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue<string>();
        const colorClass = status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colorClass}`}>{status}</span>
        );
      }
    },
    {
      accessorKey: 'payments',
      header: 'Payments',
      enableSorting: false,
      cell: ({ getValue }) => {
        const payments = getValue<{ amount: number; method: string; dateTime: string; uniqueCode: string }[]>();
        return payments.map(p => `₹${p.amount} via ${p.method}, ${format(new Date(p.dateTime), 'dd/MM/yy hh:mm a')}`).join('; ');
      }
    },
  ];

  const expenseColumns: ColumnDef<Expense>[] = [
    { accessorKey: 'description', header: 'Description' },
    { 
      accessorKey: 'location', 
      header: 'Location',
      cell: ({ row }) => row.original.location?.name || '-'
    },
    { accessorKey: 'category', header: 'Category' },
    { accessorKey: 'paidTo', header: 'Paid To' },
    { accessorKey: 'date', header: 'Date', cell: ({ getValue }) => format(new Date(getValue<string>()), 'dd/MM/yyyy') },
    { accessorKey: 'amount', header: 'Amount', cell: ({ getValue }) => `₹${getValue<number>().toLocaleString('en-IN')}` },
    { accessorKey: 'method', header: 'Method' },
  ];

  const tableSubscriptions = useReactTable({
    data: filteredSubscriptions,
    columns: subscriptionColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
  });

  const tableExpenses = useReactTable({
    data: filteredExpenses,
    columns: expenseColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    initialState: {
      sorting: [{ id: 'date', desc: true }],
    },
  });

  const exportToExcel = () => {
    if (reportType === 'income') {
    const data = filteredSubscriptions.map(sub => ({
      'Member ID': sub.member.memberId,
      Name: sub.member.name,
      Phone: sub.member.phone,
      'Seat Number': sub.seat.seatNumber,
      'Start Date': format(new Date(sub.startDate), 'dd/MM/yyyy'),
      'End Date': format(new Date(sub.endDate), 'dd/MM/yyyy'),
      Duration: sub.duration,
      'Total Amount': sub.totalAmount,
      Status: sub.status,
      Payments: sub.payments.map(p => `₹${p.amount} via ${p.method}, ${format(new Date(p.dateTime), 'dd/MM/yy hh:mm a')}`).join('; '),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Subscriptions');
    XLSX.writeFile(wb, 'Income_Report.xlsx');
    } else {
      const data = filteredExpenses.map(exp => ({
        Description: exp.description,
        Category: exp.category,
        'Paid To': exp.paidTo,
        Date: format(new Date(exp.date), 'dd/MM/yyyy'),
        Amount: exp.amount,
        Method: exp.method,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
      XLSX.writeFile(wb, 'Expense_Report.xlsx');
    }
  };

  const exportToCSV = () => {
    if (reportType === 'income') {
    const data = filteredSubscriptions.map(sub => ({
      'Member ID': sub.member.memberId,
      Name: sub.member.name,
      Phone: sub.member.phone,
      Location: sub.location?.name || 'N/A',
      'Seat Number': sub.seat.seatNumber,
      'Start Date': format(new Date(sub.startDate), 'dd/MM/yyyy'),
      'End Date': format(new Date(sub.endDate), 'dd/MM/yyyy'),
      Duration: sub.duration,
      'Total Amount': sub.totalAmount,
      Status: sub.status,
      Payments: sub.payments.map(p => `₹${p.amount} via ${p.method}, ${format(new Date(p.dateTime), 'dd/MM/yy hh:mm a')}`).join('; '),
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Income_Report.csv';
    a.click();
    URL.revokeObjectURL(url);
    } else {
      const data = filteredExpenses.map(exp => ({
        Description: exp.description,
        Category: exp.category,
        Location: exp.location?.name || 'N/A',
        'Paid To': exp.paidTo,
        Date: format(new Date(exp.date), 'dd/MM/yyyy'),
        Amount: exp.amount,
        Method: exp.method,
      }));
      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Expense_Report.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    if (reportType === 'income') {
    const headers = [['Member ID', 'Name', 'Phone', 'Location', 'Seat', 'Start', 'End', 'Duration', 'Amount', 'Status', 'Payments']];
    const data = filteredSubscriptions.map(sub => [
      sub.member.memberId,
      sub.member.name,
      sub.member.phone,
      sub.location?.name || 'N/A',
      sub.seat.seatNumber,
      format(new Date(sub.startDate), 'dd/MM/yyyy'),
      format(new Date(sub.endDate), 'dd/MM/yyyy'),
      sub.duration,
      sub.totalAmount,
      sub.status,
      sub.payments.map(p => `${p.amount} via ${p.method}, ${format(new Date(p.dateTime), 'dd/MM/yy hh:mm a')}`).join('; '),
    ]);
    autoTable(doc, {
      head: headers,
      body: data,
      styles: { fontSize: 8 },
      columnStyles: { 10: { overflow: 'linebreak', cellWidth: 50 } },
    });
    doc.save('Income_Report.pdf');
    } else {
      const headers = [['Description', 'Category', 'Location', 'Paid To', 'Date', 'Amount', 'Method']];
      const data = filteredExpenses.map(exp => [
        exp.description,
        exp.category,
        exp.location?.name || 'N/A',
        exp.paidTo,
        format(new Date(exp.date), 'dd/MM/yyyy'),
        exp.amount,
        exp.method,
      ]);
      autoTable(doc, {
        head: headers,
        body: data,
        styles: { fontSize: 8 },
      });
      doc.save('Expense_Report.pdf');
    }
  };


  const currentTable = reportType === 'income' ? tableSubscriptions : tableExpenses;

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50/50 min-h-screen font-sans flex flex-col">
      <style jsx global>{`
        /* For Webkit-based browsers (Chrome, Safari) */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        ::-webkit-scrollbar-thumb:hover { background-color: rgba(107, 114, 128, 0.8); }
        /* For Firefox */
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
        }
      `}</style>
      <div className="flex-1">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="mt-1 text-sm text-gray-500">Analyze financial performance.</p>
        </div>
        {!isMember && (
          <div className="flex gap-4">
            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 flex flex-col items-end">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</span>
              <span className="text-xl font-bold text-green-600">₹{totalRevenue.toLocaleString()}</span>
            </div>
            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 flex flex-col items-end">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</span>
              <span className="text-xl font-bold text-red-600">₹{totalExpenses.toLocaleString()}</span>
            </div>
            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 flex flex-col items-end">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Net Profit</span>
              <span className={`text-xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>₹{netProfit.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

        <div className="space-y-6 mb-6">
        {/* Tabs */}
        {!isMember && (
          <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg w-fit">
            <button onClick={() => setReportType('income')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${reportType === 'income' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>Income</button>
            <button onClick={() => setReportType('expense')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${reportType === 'expense' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>Expenses</button>
          </div>
        )}

        {/* Filters Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder={reportType === 'income' ? "Search members, seats..." : "Search description, category..."}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full pl-4 pr-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block transition-colors"
              />
            </div>
            {reportType === 'income' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
            )}
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            />
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-100 pt-4">
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Last 7 Days', days: 7 },
                { label: 'Last 30 Days', days: 30 },
                { label: 'Last 3 Months', months: 3 },
                { label: 'Last 6 Months', months: 6 },
                { label: 'This Year', year: true },
              ].map((filter, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (filter.days) setStartDateFilter(format(subDays(new Date(), filter.days), 'yyyy-MM-dd'));
                    else if (filter.months) setStartDateFilter(format(subMonths(new Date(), filter.months), 'yyyy-MM-dd'));
                    else if (filter.year) setStartDateFilter(format(startOfYear(new Date()), 'yyyy-MM-dd'));
                    setEndDateFilter('');
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  {filter.label}
                </button>
              ))}
              <button 
                onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }} 
                className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-full hover:bg-red-100 transition-colors"
              >
                Clear
              </button>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={exportToExcel} className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-green-700 bg-white border border-green-300 rounded-lg hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all">Excel</button>
              <button onClick={exportToCSV} className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all">CSV</button>
              <button onClick={exportToPDF} className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all">PDF</button>
            </div>
          </div>
        </div>


      </div>

      {/* Data Table */}
        <div className="bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {currentTable.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-2 py-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 transition-colors" onClick={header.column.getToggleSortingHandler()}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header as any, header.getContext())}
                    {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentTable.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-2 py-1 whitespace-nowrap text-xs text-gray-700">
                    {flexRender(cell.column.columnDef.cell as any, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
        <div className="flex items-center justify-between mt-6 bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100 sm:px-6">
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing page <span className="font-medium">{currentTable.getState().pagination.pageIndex + 1}</span> of <span className="font-medium">{currentTable.getPageCount()}</span>
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => currentTable.previousPage()}
                disabled={!currentTable.getCanPreviousPage()}
                className="relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => currentTable.nextPage()}
                disabled={!currentTable.getCanNextPage()}
                className="relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
        {/* Mobile Pagination */}
        <div className="flex items-center justify-between w-full sm:hidden">
           <button
            onClick={() => currentTable.previousPage()}
            disabled={!currentTable.getCanPreviousPage()}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {currentTable.getState().pagination.pageIndex + 1} of {currentTable.getPageCount()}
          </span>
          <button
            onClick={() => currentTable.nextPage()}
            disabled={!currentTable.getCanNextPage()}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}