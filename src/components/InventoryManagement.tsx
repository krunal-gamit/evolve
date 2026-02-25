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

interface InventoryItem {
  _id: string;
  name: string;
  category: string;
  location?: { _id: string; name: string };
  quantity: number;
  amount: number;
  status: string;
  purchaseDate?: string;
  lastMaintenanceDate?: string;
  notes?: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  createdAt: string;
}

interface Location {
  _id: string;
  name: string;
  address: string;
}

export default function InventoryManagement() {
  const { data: session } = useSession();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const managerLocations = session?.user.locations as string[] | undefined;
  const [form, setForm] = useState({
    name: '',
    category: 'AC',
    location: '',
    quantity: '1',
    amount: '0',
    status: 'Working',
    purchaseDate: '',
    lastMaintenanceDate: '',
    notes: '',
    serialNumber: '',
    brand: '',
    model: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterLocation, setFilterLocation] = useState<string>('');

  const categories = ['AC', 'CCTV', 'Fan', 'Light', 'Furniture', 'Electronics', 'Other'];
  const statuses = ['Working', 'Under Maintenance', 'Broken', 'Retired'];

  const fetchInventory = async () => {
    const res = await fetch('/api/inventory');
    const data = await res.json();
    data.sort((a: InventoryItem, b: InventoryItem) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setInventory(data);
  };

  useEffect(() => {
    fetchInventory();
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    const res = await fetch('/api/locations');
    const data = await res.json();
    setLocations(data);
  };

  const handleEdit = (item: InventoryItem) => {
    setForm({
      name: item.name,
      category: item.category,
      location: item.location?._id || '',
      quantity: item.quantity.toString(),
      amount: item.amount?.toString() || '0',
      status: item.status,
      purchaseDate: item.purchaseDate ? format(new Date(item.purchaseDate), 'yyyy-MM-dd') : '',
      lastMaintenanceDate: item.lastMaintenanceDate ? format(new Date(item.lastMaintenanceDate), 'yyyy-MM-dd') : '',
      notes: item.notes || '',
      serialNumber: item.serialNumber || '',
      brand: item.brand || '',
      model: item.model || ''
    });
    setEditingId(item._id);
    setErrors({});
    setShowModal(true);
  };

  const handleAdd = () => {
    // Set default location for managers with single location
    const defaultLocation = (managerLocations && managerLocations.length === 1) ? managerLocations[0] : '';
    setForm({
      name: '',
      category: 'AC',
      location: defaultLocation,
      quantity: '1',
      amount: '0',
      status: 'Working',
      purchaseDate: '',
      lastMaintenanceDate: '',
      notes: '',
      serialNumber: '',
      brand: '',
      model: ''
    });
    setEditingId(null);
    setShowModal(true);
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteId(id);
    setShowConfirmation(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/inventory/${deleteId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      toast.success('Inventory item deleted successfully!');
      fetchInventory();
    } else {
      const error = await res.json().catch(() => ({}));
      toast.error(error.error || 'Error deleting inventory item');
    }
    setDeleteId(null);
  };

  const validateField = (name: string, value: string) => {
    let error = '';
    if (name === 'name' && !value.trim()) error = 'Name is required';
    if (name === 'quantity') {
      if (!value.trim()) error = 'Quantity is required';
      else if (isNaN(Number(value)) || Number(value) < 0) error = 'Quantity must be a positive number';
    }
    if (name === 'location' && !value) error = 'Location is required';
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    validateField(name, value);
  };

  const handleCancel = () => {
    const defaultLocation = (managerLocations && managerLocations.length === 1) ? managerLocations[0] : '';
    setForm({
      name: '',
      category: 'AC',
      location: defaultLocation,
      quantity: '1',
      amount: '0',
      status: 'Working',
      purchaseDate: '',
      lastMaintenanceDate: '',
      notes: '',
      serialNumber: '',
      brand: '',
      model: ''
    });
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
    const url = editingId ? `/api/inventory/${editingId}` : '/api/inventory';
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        quantity: Number(form.quantity),
        amount: Number(form.amount),
        purchaseDate: form.purchaseDate || null,
        lastMaintenanceDate: form.lastMaintenanceDate || null
      }),
    });
    if (res.ok) {
      const defaultLocation = (managerLocations && managerLocations.length === 1) ? managerLocations[0] : '';
      setForm({
        name: '',
        category: 'AC',
        location: defaultLocation,
        quantity: '1',
        amount: '0',
        status: 'Working',
        purchaseDate: '',
        lastMaintenanceDate: '',
        notes: '',
        serialNumber: '',
        brand: '',
        model: ''
      });
      setEditingId(null);
      setShowModal(false);
      toast.success(`Inventory item ${editingId ? 'updated' : 'added'} successfully!`);
      fetchInventory();
    } else {
      const error = await res.json().catch(() => ({}));
      toast.error(error.error || 'Error saving inventory item');
    }
  };

  const exportToExcel = () => {
    const data = inventory.map(item => ({
      Name: item.name,
      Category: item.category,
      Quantity: item.quantity,
      Amount: item.amount,
      Status: item.status,
      Location: item.location?.name || 'N/A',
      Brand: item.brand || '',
      Model: item.model || '',
      'Serial Number': item.serialNumber || '',
      'Purchase Date': item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString('en-GB') : '',
      'Last Maintenance': item.lastMaintenanceDate ? new Date(item.lastMaintenanceDate).toLocaleDateString('en-GB') : '',
      Notes: item.notes || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, 'inventory.xlsx');
  };

  const exportToCSV = () => {
    const data = inventory.map(item => ({
      Name: item.name,
      Category: item.category,
      Quantity: item.quantity,
      Amount: item.amount,
      Status: item.status,
      Location: item.location?.name || 'N/A',
      Brand: item.brand || '',
      Model: item.model || '',
      'Serial Number': item.serialNumber || '',
      'Purchase Date': item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString('en-GB') : '',
      'Last Maintenance': item.lastMaintenanceDate ? new Date(item.lastMaintenanceDate).toLocaleDateString('en-GB') : '',
      Notes: item.notes || ''
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const headers = [['Name', 'Category', 'Qty', 'Amount', 'Status', 'Location', 'Brand', 'Model', 'Serial No', 'Purchase Date']];
    const data = inventory.map(item => [
      item.name, item.category, item.quantity.toString(), item.amount?.toString() || '0', item.status, item.location?.name || 'N/A',
      item.brand || '', item.model || '', item.serialNumber || '',
      item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString('en-GB') : ''
    ]);
    autoTable(doc, {
      head: headers, body: data, styles: { fontSize: 8 }
    });
    doc.save('inventory.pdf');
  };

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    return inventory.filter(item => {
      if (filterCategory && item.category !== filterCategory) return false;
      if (filterStatus && item.status !== filterStatus) return false;
      if (filterLocation && item.location?._id !== filterLocation) return false;
      return true;
    });
  }, [inventory, filterCategory, filterStatus, filterLocation]);

  const columns = useMemo<ColumnDef<InventoryItem>[]>(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'category', header: 'Category' },
    { accessorKey: 'quantity', header: 'Qty' },
    { accessorKey: 'amount', header: 'Amount', cell: info => info.getValue<number>() ? `₹${info.getValue<number>().toLocaleString('en-IN')}` : '-' },
    { 
      accessorKey: 'status', 
      header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue<string>();
        const colors: Record<string, string> = {
          'Working': 'bg-green-100 text-green-800',
          'Under Maintenance': 'bg-yellow-100 text-yellow-800',
          'Broken': 'bg-red-100 text-red-800',
          'Retired': 'bg-gray-100 text-gray-800'
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
            {status}
          </span>
        );
      }
    },
    { 
      accessorKey: 'location', 
      header: 'Location',
      cell: ({ row }) => row.original.location?.name || '-'
    },
    { accessorKey: 'brand', header: 'Brand' },
    { 
      accessorKey: 'purchaseDate', 
      header: 'Purchase Date',
      cell: ({ getValue }) => getValue<string>() ? new Date(getValue<string>()).toLocaleDateString('en-GB') : '-'
    },
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

  // Get summary counts
  const summary = useMemo(() => {
    return {
      total: inventory.length,
      working: inventory.filter(i => i.status === 'Working').length,
      maintenance: inventory.filter(i => i.status === 'Under Maintenance').length,
      broken: inventory.filter(i => i.status === 'Broken').length,
      byCategory: categories.map(cat => ({
        category: cat,
        count: inventory.filter(i => i.category === cat).length
      }))
    };
  }, [inventory]);

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
      <Toaster position="top-right" />
      <ConfirmationModal isOpen={showConfirmation} onClose={() => setShowConfirmation(false)} onConfirm={handleDeleteConfirm} title="Delete Inventory Item" message="Are you sure you want to delete this inventory item? This action cannot be undone." />
      <div className="px-3 md:px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl md:text-2xl font-bold leading-6 md:leading-7 text-gray-900 sm:text-2xl sm:truncate">
              Inventory Management
            </h2>
            <p className="mt-1 text-xs md:text-sm text-gray-500">
              Track and manage Reading Room equipment (AC, CCTV, Fans, Lights, etc.)
            </p>
          </div>
          <div className="mt-4 md:mt-0 md:ml-4 gap-2 md:gap-4 flex flex-col md:flex-row w-full md:w-auto">
            <button
              onClick={handleAdd}
              className="inline-flex items-center px-3 py-1.5 md:px-4 md:py-2 border border-transparent rounded-md shadow-sm text-xs md:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors w-full md:w-auto justify-center"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Inventory
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
            <div className="text-sm text-gray-500">Total Items</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="text-2xl font-bold text-green-600">{summary.working}</div>
            <div className="text-sm text-gray-500">Working</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="text-2xl font-bold text-yellow-600">{summary.maintenance}</div>
            <div className="text-sm text-gray-500">Under Maintenance</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="text-2xl font-bold text-red-600">{summary.broken}</div>
            <div className="text-sm text-gray-500">Broken</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-lg">
              <input
                type="text"
                placeholder="Search inventory..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full pl-4 pr-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block transition-colors"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                {statuses.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Locations</option>
                {locations.map(loc => <option key={loc._id} value={loc._id}>{loc.name}</option>)}
              </select>
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
                      No inventory items found.
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
              <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Inventory Item' : 'Add New Inventory Item'}</h3>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-gray-50 focus:bg-white ${errors.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder="Item name"
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
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-gray-50 focus:bg-white ${errors.quantity ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-gray-50 focus:bg-white"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Brand</label>
                  <input
                    type="text"
                    name="brand"
                    value={form.brand}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-gray-50 focus:bg-white"
                    placeholder="Brand name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Model</label>
                  <input
                    type="text"
                    name="model"
                    value={form.model}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-gray-50 focus:bg-white"
                    placeholder="Model number"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Serial Number</label>
                <input
                  type="text"
                  name="serialNumber"
                  value={form.serialNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-gray-50 focus:bg-white"
                  placeholder="Serial/IMEI number"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Purchase Date</label>
                  <input
                    type="date"
                    name="purchaseDate"
                    value={form.purchaseDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-gray-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Last Maintenance</label>
                  <input
                    type="date"
                    name="lastMaintenanceDate"
                    value={form.lastMaintenanceDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-gray-50 focus:bg-white"
                  placeholder="Additional notes..."
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
                  {editingId ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
