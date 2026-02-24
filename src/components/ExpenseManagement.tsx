'use client';

import { useState, useEffect, useMemo } from 'react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, ColumnDef, flexRender } from '@tanstack/react-table';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ConfirmationModal from './ConfirmationModal';
import { Toaster, toast } from 'react-hot-toast';

import { useSession } from 'next-auth/react';

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

interface Location {
  _id: string;
  name: string;
  address: string;
}

export default function ExpenseManagement() {
  const { data: session } = useSession();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const managerLocations = session?.user.locations as string[] | undefined;
  const [form, setForm] = useState({ description: '', amount: '', category: 'Equipment', paidTo: '', method: 'Cash', date: format(new Date(), 'yyyy-MM-dd'), location: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const categories = ['Equipment', 'Maintenance', 'Utilities', 'Salaries', 'Marketing', 'Supplies', 'Rent', 'Other'];
  const methods = ['Cash', 'UPI', 'Bank Transfer', 'Cheque'];

  const fetchExpenses = async () => {
    const res = await fetch('/api/expenses');
    const data = await res.json();
    data.sort((a: Expense, b: Expense) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setExpenses(data);
  };

  useEffect(() => {
    fetchExpenses();
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    const res = await fetch('/api/locations');
    const data = await res.json();
    setLocations(data);
  };

  const handleEdit = (expense: Expense) => {
    setForm({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      paidTo: expense.paidTo,
      method: expense.method,
      date: format(new Date(expense.date), 'yyyy-MM-dd'),
      location: expense.location?._id || ''
    });
    setEditingId(expense._id);
    setErrors({});
    setShowModal(true);
  };

  const handleAdd = () => {
    // Set default location for managers with single location
    const defaultLocation = (managerLocations && managerLocations.length === 1) ? managerLocations[0] : '';
    setForm({ description: '', amount: '', category: 'Equipment', paidTo: '', method: 'Cash', date: format(new Date(), 'yyyy-MM-dd'), location: defaultLocation });
    setEditingId(null);
    setShowModal(true);
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteId(id);
    setShowConfirmation(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/expenses/${deleteId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      toast.success('Expense deleted successfully!');
      fetchExpenses();
    } else {
      const error = await res.json().catch(() => ({}));
      toast.error(error.error || 'Error deleting expense');
    }
    setDeleteId(null);
  };

  const validateField = (name: string, value: string) => {
    let error = '';
    if (name === 'description' && !value.trim()) error = 'Description is required';
    if (name === 'amount') {
      if (!value.trim()) error = 'Amount is required';
      else if (isNaN(Number(value)) || Number(value) <= 0) error = 'Amount must be a positive number';
    }
    if (name === 'paidTo' && !value.trim()) error = 'Paid To is required';
    if (name === 'date' && !value) error = 'Date is required';
    if (name === 'location' && !value) error = 'Location is required';
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    validateField(name, value);
  };

  const handleCancel = () => {
    const defaultLocation = (managerLocations && managerLocations.length === 1) ? managerLocations[0] : '';
    setForm({ description: '', amount: '', category: 'Equipment', paidTo: '', method: 'Cash', date: format(new Date(), 'yyyy-MM-dd'), location: defaultLocation });
    setEditingId(null);
    setErrors({});
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.location) {
      toast.error('Please select a location');
      return;
    }
    const url = editingId ? `/api/expenses/${editingId}` : '/api/expenses';
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    if (res.ok) {
      const defaultLocation = (managerLocations && managerLocations.length === 1) ? managerLocations[0] : '';
      setForm({ description: '', amount: '', category: 'Equipment', paidTo: '', method: 'Cash', date: format(new Date(), 'yyyy-MM-dd'), location: defaultLocation });
      setEditingId(null);
      setShowModal(false);
      toast.success(`Expense ${editingId ? 'updated' : 'added'} successfully!`);
      fetchExpenses();
    } else {
      const error = await res.json().catch(() => ({}));
      toast.error(error.error || 'Error saving expense');
    }
  };

  const exportToExcel = () => {
    const data = expenses.map(expense => ({
      Description: expense.description,
      Amount: expense.amount,
      Category: expense.category,
      'Paid To': expense.paidTo,
      Method: expense.method,
      Date: new Date(expense.date).toISOString().split('T')[0],
      'Recorded': new Date(expense.createdAt).toISOString().split('T')[0]
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    XLSX.writeFile(wb, 'expenses.xlsx');
  };

  const exportToCSV = () => {
    const data = expenses.map(expense => ({
      Description: expense.description,
      Amount: expense.amount,
      Category: expense.category,
      Location: expense.location?.name || 'N/A',
      'Paid To': expense.paidTo,
      Method: expense.method,
      Date: new Date(expense.date).toISOString().split('T')[0],
      'Recorded': new Date(expense.createdAt).toISOString().split('T')[0]
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expenses.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const headers = [['Description', 'Amount', 'Category', 'Location', 'Paid To', 'Method', 'Date', 'Recorded']];
    const data = expenses.map(expense => [
      expense.description, expense.amount.toString(), expense.category, expense.location?.name || 'N/A', expense.paidTo, expense.method,
      new Date(expense.date).toLocaleDateString('en-GB'),
      new Date(expense.createdAt).toLocaleDateString('en-GB')
    ]);
    autoTable(doc, {
      head: headers, body: data, styles: { fontSize: 8 }
    });
    doc.save('expenses.pdf');
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Assume first row is headers
      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1) as any[][];

      const parseDate = (dateValue: any): Date | null => {
        if (!dateValue) return null;
        if (dateValue instanceof Date) {
          return isNaN(dateValue.getTime()) ? null : dateValue;
        }
        if (typeof dateValue === 'number') {
          // Excel serial date number
          return new Date((dateValue - 25569) * 86400 * 1000);
        }
        // Handle string dates (ISO format YYYY-MM-DD or other formats)
        const parsed = new Date(dateValue);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
        // Try parsing DD/MM/YYYY format
        const parts = String(dateValue).split('/');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          const date = new Date(`${year}-${month}-${day}`);
          if (!isNaN(date.getTime())) return date;
        }
        return null;
      };

      const parsedExpenses = rows.map(row => {
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        const parsedDate = parseDate(obj['Date']);
        return {
          description: obj['Description'],
          amount: parseFloat(obj['Amount']),
          category: obj['Category'],
          paidTo: obj['Paid To'],
          method: obj['Method'],
          date: parsedDate,
        };
      });

      // Validate and check for duplicates
      const validExpenses = parsedExpenses.filter(exp => 
        exp.description && 
        exp.category && 
        exp.paidTo && 
        exp.date && 
        !isNaN(exp.amount) && 
        exp.method
      );

      // Check for duplicates against existing expenses in the database
      const newExpenses = validExpenses.filter(newExp => {
        const isDuplicate = expenses.some(existing => 
          existing.description?.toLowerCase() === newExp.description?.toLowerCase() &&
          existing.amount === newExp.amount &&
          existing.paidTo?.toLowerCase() === newExp.paidTo?.toLowerCase() &&
          new Date(existing.date).toDateString() === newExp.date?.toDateString()
        );
        return !isDuplicate;
      });

      if (validExpenses.length === 0) {
        toast.error('No valid expenses found in the file.');
        return;
      }

      if (newExpenses.length === 0) {
        toast.error('All expenses in the file already exist. No new expenses to upload.');
        return;
      }

      if (newExpenses.length < validExpenses.length) {
        const skipped = validExpenses.length - newExpenses.length;
        toast(`${skipped} duplicate expense(s) skipped. Uploading ${newExpenses.length} new expense(s).`);
      }

      try {
        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newExpenses),
        });
        if (res.ok) {
          toast.success(`Uploaded ${newExpenses.length} expenses successfully.`);
          setUploadFile(null);
          fetchExpenses(); // Refresh data
        } else {
          const error = await res.json();
          toast.error(error.error || 'Failed to upload expenses.');
        }
      } catch (error) {
        toast.error('Error uploading expenses.');
      }
    };
    reader.readAsArrayBuffer(uploadFile);
  };

  const columns = useMemo<ColumnDef<Expense>[]>(() => [
    { accessorKey: 'description', header: 'Description' },
    { accessorKey: 'amount', header: 'Amount', cell: info => `₹${info.getValue<number>().toLocaleString('en-IN')}` },
    { accessorKey: 'category', header: 'Category' },
    { accessorKey: 'paidTo', header: 'Paid To' },
    { accessorKey: 'method', header: 'Method' },
    { 
      accessorKey: 'location', 
      header: 'Location',
      cell: ({ row }) => row.original.location?.name || '-'
    },
    { accessorKey: 'date', header: 'Date', cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString('en-GB') },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center">
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
    data: expenses,
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
    <div className="min-h-screen dark:bg-black bg-[#F2F2F7] py-6 flex flex-col">
      <style jsx global>{`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background-color: rgba(142, 142, 147, 0.4);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover { background-color: rgba(142, 142, 147, 0.6); }
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(142, 142, 147, 0.4) transparent;
        }
      `}</style>
      <ConfirmationModal isOpen={showConfirmation} onClose={() => setShowConfirmation(false)} onConfirm={handleDeleteConfirm} title="Delete Expense" message="Are you sure you want to delete this expense? This action cannot be undone." />
      <div className="px-3 md:px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl md:text-2xl font-bold leading-6 md:leading-7 text-gray-900 sm:text-2xl sm:truncate">
              Expense Records
            </h2>
            <p className="mt-1 text-xs md:text-sm text-gray-500">
              Track and manage all gym expenses.
            </p>
          </div>
          <div className="mt-4 md:mt-0 md:ml-4 gap-2 md:gap-4 flex flex-col md:flex-row w-full md:w-auto">
            <div className="flex items-center w-full md:w-auto">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="block w-full text-xs md:text-sm text-gray-500 file:mr-2 md:file:mr-4 file:py-1.5 md:file:py-2 file:px-2 md:file:px-4 file:rounded-lg file:border-0 file:text-xs md:file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
            </div>
            <button
              onClick={handleUpload}
              disabled={!uploadFile}
              className="inline-flex items-center px-3 py-1.5 md:px-4 md:py-2 border border-transparent rounded-md shadow-sm text-xs md:text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full md:w-auto justify-center"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Upload
            </button>
            <button
              onClick={handleAdd}
              className="inline-flex items-center px-3 py-1.5 md:px-4 md:py-2 border border-transparent rounded-md shadow-sm text-xs md:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors w-full md:w-auto justify-center"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Expense
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-lg">
              <input
                type="text"
                placeholder="Search expenses..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full pl-4 pr-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block transition-colors"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    No expenses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

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
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 border border-gray-100 overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Expense' : 'Add New Expense'}</h3>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
                <select
                  name="location"
                  value={form.location}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-gray-50 focus:bg-white ${errors.location ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                >
                  <option value="">Select Location</option>
                  {(managerLocations && managerLocations.length > 0 
                    ? locations.filter(loc => managerLocations.includes(loc._id))
                    : locations
                  ).map(loc => (
                    <option key={loc._id} value={loc._id}>{loc.name}</option>
                  ))}
                </select>
                {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  name="description"
                  value={form.description}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-gray-50 focus:bg-white ${errors.description ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                  placeholder="Expense description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-gray-50 focus:bg-white ${errors.amount ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-gray-50 focus:bg-white"
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Paid To</label>
                  <input
                    type="text"
                    name="paidTo"
                    value={form.paidTo}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-gray-50 focus:bg-white ${errors.paidTo ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder="Recipient name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Method</label>
                  <select
                    name="method"
                    value={form.method}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-gray-50 focus:bg-white"
                  >
                    {methods.map(method => <option key={method} value={method}>{method}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-gray-50 focus:bg-white ${errors.date ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                />
              </div>
              <div className="flex justify-end pt-4 gap-3">
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
                  {editingId ? 'Update Expense' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}