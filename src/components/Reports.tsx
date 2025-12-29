'use client';

import { useState, useEffect, useMemo } from 'react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, ColumnDef, flexRender } from '@tanstack/react-table';
import { format, subDays, subMonths, startOfYear } from 'date-fns';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export default function Reports() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchSubscriptions = async () => {
    const res = await fetch('/api/subscriptions');
    const data = await res.json();
    setSubscriptions(data);
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const filteredData = useMemo(() => {
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

  const totalRevenue = subscriptions.reduce((sum, sub) => sum + sub.totalAmount, 0);

  const columns: ColumnDef<Subscription>[] = [
    { accessorKey: 'member.memberId', header: 'Member ID' },
    { accessorKey: 'member.name', header: 'Name' },
    { accessorKey: 'member.phone', header: 'Phone' },
    { accessorKey: 'seat.seatNumber', header: 'Seat Number' },
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
    { accessorKey: 'totalAmount', header: 'Total Amount', cell: ({ getValue }) => `₹${getValue<number>()}` },
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
      cell: ({ getValue }) => {
        const payments = getValue<{ amount: number; method: string; dateTime: string; uniqueCode: string }[]>();
        return payments.map(p => `₹${p.amount} via ${p.method}, ${format(new Date(p.dateTime), 'dd/MM/yy hh:mm a')}`).join('; ');
      }
    },
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
  });

  const exportToExcel = () => {
    const data = filteredData.map(sub => ({
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
    XLSX.writeFile(wb, 'subscriptions.xlsx');
  };

  const exportToCSV = () => {
    const data = filteredData.map(sub => ({
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
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subscriptions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const headers = [['Member ID', 'Name', 'Phone', 'Seat Number', 'Start Date', 'End Date', 'Duration', 'Total Amount', 'Status', 'Payments']];
    const data = filteredData.map(sub => [
      sub.member.memberId,
      sub.member.name,
      sub.member.phone,
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
      columnStyles: { 9: { overflow: 'linebreak', cellWidth: 50 } },
    });
    doc.save('subscriptions.pdf');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen font-sans">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
          <p className="mt-1 text-sm text-gray-500">Analyze subscription performance and revenue.</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-xl shadow-sm border border-gray-200 flex flex-col items-end">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</span>
          <span className="text-2xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</span>
        </div>
      </div>

      <div className="space-y-6 mb-8">
        {/* Filters Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search members, seats..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full pl-4 pr-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block transition-colors"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
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
      <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6 bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200 sm:px-6">
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing page <span className="font-medium">{table.getState().pagination.pageIndex + 1}</span> of <span className="font-medium">{table.getPageCount()}</span>
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
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
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}