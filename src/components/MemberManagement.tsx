'use client';

import { useState, useEffect, useMemo } from 'react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, ColumnDef, flexRender } from '@tanstack/react-table';
import { format, subDays, subMonths, startOfYear } from 'date-fns';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Footer from './Footer';
import ConfirmationModal from './ConfirmationModal';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import SubscriptionManagement from './SubscriptionManagement';

interface Member {
  _id: string;
  memberId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  examPrep?: string;
  createdAt: string;
}

export default function MemberManagement() {
  const { data: session } = useSession();
  const isMember = session?.user.role === 'Member';

  const [members, setMembers] = useState<Member[]>([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', examPrep: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionMemberId, setSubscriptionMemberId] = useState<string | null>(null);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const fetchMembers = async () => {
    const res = await fetch('/api/members');
    const data = await res.json();
    data.sort((a: Member, b: Member) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setMembers(data);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const filteredData = useMemo(() => {
    return members.filter(member => {
      const memberDate = new Date(member.createdAt);
      const start = startDateFilter ? new Date(startDateFilter) : null;
      const end = endDateFilter ? new Date(endDateFilter) : null;

      if (start && memberDate < start) return false;
      if (end) {
        const adjustedEnd = new Date(end);
        adjustedEnd.setHours(23, 59, 59, 999);
        if (memberDate > adjustedEnd) return false;
      }
      return true;
    });
  }, [members, startDateFilter, endDateFilter]);

  const handleEdit = (member: Member) => {
    setForm({ name: member.name, email: member.email, phone: member.phone, address: member.address, examPrep: member.examPrep || '' });
    setEditingId(member._id);
    setErrors({});
    setShowModal(true);
  };

  const handleAdd = () => {
    if (isMember) return;
    setForm({ name: '', email: '', phone: '', address: '', examPrep: '' });
    setEditingId(null);
    setShowModal(true);
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteId(id);
    setShowConfirmation(true);
  };

  const handleSubscribe = (memberId: string) => {
    setSubscriptionMemberId(memberId);
    setShowSubscriptionModal(true);
  };

  const handleSubscriptionUpdate = () => {
    fetchMembers();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/members/${deleteId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      toast.success('Member deleted successfully!');
      fetchMembers();
    } else {
      const error = await res.json().catch(() => ({}));
      toast.error(error.error || 'Error deleting member');
    }
    setDeleteId(null);
  };

  const validateField = (name: string, value: string) => {
    let error = '';
    if (name === 'name' && !value.trim()) error = 'Name is required';
    if (name === 'email') {
      if (!value.trim()) error = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(value)) error = 'Invalid email format';
    }
    if (name === 'phone') {
      if (!value.trim()) error = 'Phone is required';
      else if (!/^\d{10}$/.test(value)) error = 'Phone must be 10 digits';
    }
    if (name === 'address' && !value.trim()) error = 'Address is required';
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    validateField(name, value);
  };

  const handleCancel = () => {
    setForm({ name: '', email: '', phone: '', address: '', examPrep: '' });
    setEditingId(null);
    setErrors({});
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `/api/members/${editingId}` : '/api/members';
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ name: '', email: '', phone: '', address: '', examPrep: '' });
      setEditingId(null);
      setShowModal(false);
      toast.success(`Member ${editingId ? 'updated' : 'added'} successfully!`);
      fetchMembers();
    } else {
      const error = await res.json().catch(() => ({}));
      toast.error(error.error || 'Error saving member');
    }
  };

  const exportToExcel = () => {
    const rows = table.getFilteredRowModel().rows.map(r => r.original);
    const data = rows.map(member => ({
      'Member ID': member.memberId,
      Name: member.name,
      Email: member.email,
      Phone: member.phone,
      Address: member.address,
      'Exam Prep': member.examPrep,
      'Join Date': new Date(member.createdAt).toLocaleDateString('en-GB')
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Members');
    XLSX.writeFile(wb, 'members.xlsx');
  };

  const exportToCSV = () => {
    const rows = table.getFilteredRowModel().rows.map(r => r.original);
    const data = rows.map(member => ({
      'Member ID': member.memberId,
      Name: member.name,
      Email: member.email,
      Phone: member.phone,
      Address: member.address,
      'Exam Prep': member.examPrep,
      'Join Date': new Date(member.createdAt).toLocaleDateString('en-GB')
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'members.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const headers = [['Member ID', 'Name', 'Email', 'Phone', 'Address', 'Exam Prep', 'Join Date']];
    const rows = table.getFilteredRowModel().rows.map(r => r.original);
    const data = rows.map(member => [
      member.memberId, member.name, member.email, member.phone, member.address, member.examPrep || '-',
      new Date(member.createdAt).toLocaleDateString('en-GB')
    ]);
    autoTable(doc, {
      head: headers, body: data, styles: { fontSize: 8 }
    });
    doc.save('members.pdf');
  };

  const columns = useMemo<ColumnDef<Member>[]>(() => [
    { accessorKey: 'memberId', header: 'Member ID', cell: info => info.getValue() || '-' },
    { 
      accessorKey: 'name', 
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full ${getAvatarColor(row.original.name)} flex items-center justify-center text-white text-xs font-bold mr-3 shadow-sm`}>
            {getInitials(row.original.name)}
          </div>
          {row.original.name}
        </div>
      )
    },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'phone', header: 'Phone' },
    { accessorKey: 'address', header: 'Address' },
    { accessorKey: 'examPrep', header: 'Exam Prep', cell: info => info.getValue() || '-' },
    { 
      accessorKey: 'createdAt', 
      header: 'Join Date',
      cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString('en-GB').replace(/\//g, '-')
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => isMember ? null : (
        <div className="flex items-center">
            <button onClick={() => handleSubscribe(row.original._id)} className="text-green-600 hover:text-green-900 mr-4 transition-colors" title="Subscribe">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button onClick={() => handleEdit(row.original)} className="text-blue-600 hover:text-blue-900 mr-4 transition-colors" title="Edit">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button onClick={() => handleDeleteRequest(row.original._id)} className="text-red-600 hover:text-red-900 transition-colors" title="Delete">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
        </div>
      )
    }
  ], []);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 font-sans flex flex-col">
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
      <ConfirmationModal isOpen={showConfirmation} onClose={() => setShowConfirmation(false)} onConfirm={handleDeleteConfirm} title="Delete Member" message="Are you sure you want to delete this member? This action cannot be undone and will remove all associated subscriptions." />
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Member Directory
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage library members, contact details, and exam preparation info.
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 gap-4">
            {!isMember && (
              <button
                onClick={handleAdd}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Member
              </button>
            )}
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-lg">
              <input
                type="text"
                placeholder="Search members..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full pl-4 pr-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block transition-colors"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: 'Last 7 Days', days: 7 },
                { label: 'Last 30 Days', days: 30 },
                { label: 'Last 3 Months', months: 3 },
                { label: 'This Year', year: true },
              ].map((filter, idx) => (
                <button key={idx} onClick={() => { if (filter.days) setStartDateFilter(format(subDays(new Date(), filter.days), 'yyyy-MM-dd')); else if (filter.months) setStartDateFilter(format(subMonths(new Date(), filter.months), 'yyyy-MM-dd')); else if (filter.year) setStartDateFilter(format(startOfYear(new Date()), 'yyyy-MM-dd')); setEndDateFilter(''); }} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">{filter.label}</button>
              ))}
              <button onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-full hover:bg-red-100 transition-colors">Clear</button>
              <div className="h-6 w-px bg-gray-300 mx-2 hidden sm:block"></div>
              <button onClick={exportToExcel} className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-green-700 bg-white border border-green-300 rounded-lg hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all">Excel</button>
              <button onClick={exportToCSV} className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all">CSV</button>
              <button onClick={exportToPDF} className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all">PDF</button>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm overflow-hidden rounded-2xl border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 transition-colors" onClick={header.column.getToggleSortingHandler()}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: ' ↑',
                        desc: ' ↓',
                      }[header.column.getIsSorted() as string] ?? null}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                    No members found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6 bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100 sm:px-6">
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

      {showModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 border border-gray-100 overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Member' : 'Add New Member'}</h3>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-gray-50 focus:bg-white ${errors.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder="Full name"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-gray-50 focus:bg-white ${errors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder="Email address"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={form.phone}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-gray-50 focus:bg-white ${errors.phone ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder="10-digit number"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-gray-50 focus:bg-white ${errors.address ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder="Address"
                  />
                </div>

              <div className="sm:col-span-6">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Exam Prep</label>
                <input
                  type="text"
                  name="examPrep"
                  value={form.examPrep}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-gray-50 focus:bg-white sm:text-sm"
                  placeholder="Exam preparation details"
                />
              </div>
              <div className="sm:col-span-6 flex justify-end pt-4 gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-105 text-sm font-medium shadow-sm"
                >
                  {editingId ? 'Update Member' : 'Add Member'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
      <SubscriptionManagement
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onUpdate={handleSubscriptionUpdate}
        initialMemberId={subscriptionMemberId || undefined}
      />
      <Footer />
    </div>
  );
}
