'use client';

import { useState, useEffect, useMemo } from 'react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, ColumnDef, flexRender } from '@tanstack/react-table';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { Toaster, toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Search, Receipt, Download, User, X, Filter } from 'lucide-react';

interface PaymentRecord {
  _id: string;
  amount: number;
  method: string;
  upiCode?: string;
  dateTime: string;
  uniqueCode: string;
  createdAt: string;
  member: {
    memberId: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  subscription: {
    _id: string;
    duration: string;
    startDate: string;
    endDate: string;
    totalAmount: number;
  } | null;
  location: {
    _id: string;
    name: string;
  } | null;
}

interface Location {
  _id: string;
  name: string;
}

interface MemberSuggestion {
  memberId: string;
  name: string;
  email: string;
  phone: string;
  displayText: string;
}

export default function PaymentHistory() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  
  const [searchedMember, setSearchedMember] = useState<any>(null);
  const [summary, setSummary] = useState({ totalPayments: 0, totalAmount: 0 });
  
  const [memberSuggestions, setMemberSuggestions] = useState<MemberSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations');
      if (res.ok) {
        const data = await res.json();
        setLocations(data || []);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchPayments = async (filters?: { startDate?: string; endDate?: string }, search?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const effectiveSearch = search ?? searchQuery;
      if (effectiveSearch) params.append('search', effectiveSearch);
      if (selectedLocation) params.append('locationId', selectedLocation);
      if (selectedMethod) params.append('method', selectedMethod);
      const effectiveStartDate = filters?.startDate ?? startDate;
      const effectiveEndDate = filters?.endDate ?? endDate;
      if (effectiveStartDate) params.append('startDate', effectiveStartDate);
      if (effectiveEndDate) params.append('endDate', effectiveEndDate);
      if (selectedMonth) params.append('month', selectedMonth);

      const res = await fetch(`/api/payments/recent?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
        setSummary(data.summary || { totalPayments: 0, totalAmount: 0 });
        
        if (searchQuery && data.payments.length > 0) {
          const firstPayment = data.payments[0];
          if (firstPayment.member) {
            setSearchedMember(firstPayment.member);
          }
        } else if (searchQuery && data.payments.length === 0) {
          setSearchedMember(null);
        } else if (!searchQuery) {
          setSearchedMember(null);
        }
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to fetch payments');
      }
    } catch (error) {
      toast.error('Error fetching payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    fetchPayments();
  }, []);

  const handleSearchInputChange = async (value: string) => {
    setSearchQuery(value);
    if (value.length >= 2) {
      try {
        const res = await fetch(`/api/verify/search?q=${encodeURIComponent(value)}`);
        if (res.ok) {
          const data = await res.json();
          setMemberSuggestions(data.hints || []);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    } else {
      setMemberSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectMember = (suggestion: MemberSuggestion) => {
    setSearchQuery(suggestion.name);
    setShowSuggestions(false);
    setMemberSuggestions([]);
    fetchPayments(undefined, suggestion.name);
  };

  const generateAllInvoicesPDF = async () => {
    if (payments.length === 0) {
      toast.error('No payments to download');
      return;
    }
    
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT HISTORY REPORT', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Evolve Reading Room', 105, 30, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 42);
      
      // Format amounts as plain strings to avoid font issues
      const formatAmount = (amt: number) => 'Rs.' + amt.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      
      const tableData = payments.map(p => [
        new Date(p.dateTime).toLocaleDateString(),
        p.member?.name || 'N/A',
        p.member?.memberId || 'N/A',
        p.location?.name || 'N/A',
        p.subscription?.duration || 'N/A',
        formatAmount(p.amount),
        p.method,
        p.uniqueCode
      ]);
      
      autoTable(doc, {
        startY: 52,
        head: [['Date', 'Member', 'Member ID', 'Location', 'Duration', 'Amount', 'Method', 'Txn ID']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { font: 'helvetica', fontSize: 9 },
      });
      
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`Total Payments: ${payments.length}`, 14, finalY);
      doc.text(`Total Amount: ${formatAmount(summary.totalAmount)}`, 14, finalY + 7);
      
      doc.save(`payment_history_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Report downloaded!');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    fetchPayments();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedLocation('');
    setSelectedMethod('');
    setStartDate('');
    setEndDate('');
    setSelectedMonth('');
    setSearchedMember(null);
    setShowSuggestions(false);
    setMemberSuggestions([]);
    fetchPayments();
  };

  const generateInvoicePDF = async (payment: PaymentRecord) => {
    if (!payment.member) {
      toast.error('Member information not available');
      return;
    }
    
    try {
      const res = await fetch(`/api/payments/member/${payment.member.memberId}/invoice?paymentId=${payment._id}&type=single`);
      if (!res.ok) {
        toast.error('Failed to generate invoice');
        return;
      }
      
      const invoiceData = await res.json();
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Invoice Number: ${invoiceData.invoiceNumber}`, 14, 35);
      doc.text(`Date: ${invoiceData.invoiceDate}`, 14, 42);
      
      doc.setFont('helvetica', 'bold');
      doc.text('From:', 14, 55);
      doc.setFont('helvetica', 'normal');
      doc.text('Evolve Reading Room', 14, 62);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Bill To:', 120, 55);
      doc.setFont('helvetica', 'normal');
      doc.text(invoiceData.member.name, 120, 62);
      doc.text(`Member ID: ${invoiceData.member.memberId}`, 120, 69);
      
      const formatAmount = (amt: number) => 'Rs.' + amt.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      
      const tableData = invoiceData.payments.map((p: any) => [
        new Date(p.dateTime).toLocaleDateString(),
        p.subscriptionDetails?.duration || 'N/A',
        p.method,
        formatAmount(p.amount)
      ]);
      
      autoTable(doc, {
        startY: 85,
        head: [['Date', 'Duration', 'Method', 'Amount']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { font: 'helvetica', fontSize: 9 },
      });
      
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont('helvetica', 'bold');
      doc.text(`Total: ${formatAmount(invoiceData.summary.total)}`, 14, finalY);
      
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text('Thank you for your payment!', 105, 280, { align: 'center' });
      
      doc.save(`invoice_${invoiceData.invoiceNumber}.pdf`);
      toast.success('Invoice downloaded!');
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    }
  };

  const columns = useMemo<ColumnDef<PaymentRecord>[]>(() => [
    {
      id: 'srNo',
      header: 'Sr No',
      cell: ({ row }) => row.index + 1
    },
    {
      accessorKey: 'dateTime',
      header: 'Date',
      cell: info => new Date(info.getValue<string>()).toLocaleDateString('en-IN')
    },
    {
      accessorKey: 'member.name',
      header: 'Member',
      cell: info => info.row.original.member?.name || 'N/A'
    },
    {
      accessorKey: 'member.memberId',
      header: 'Member ID',
      cell: info => info.row.original.member?.memberId || 'N/A'
    },
    {
      accessorKey: 'location.name',
      header: 'Location',
      cell: info => info.row.original.location?.name || 'N/A'
    },
    {
      accessorKey: 'subscription.duration',
      header: 'Duration',
      cell: info => info.row.original.subscription?.duration || 'N/A'
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: info => `₹${info.getValue<number>().toLocaleString('en-IN')}`
    },
    {
      accessorKey: 'method',
      header: 'Method',
      cell: info => (
        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
          info.getValue<string>() === 'UPI' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
        }`}>
          {info.getValue<string>()}
        </span>
      )
    },
    {
      accessorKey: 'uniqueCode',
      header: 'Txn ID',
      cell: info => <span className="text-xs font-mono">{info.getValue<string>()}</span>
    },
    {
      id: 'actions',
      header: 'Invoice',
      enableSorting: false,
      cell: ({ row }) => (
        <button
          onClick={() => generateInvoicePDF(row.original)}
          className="text-blue-600 hover:text-blue-900 p-0.5"
          title="Download Invoice"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      )
    }
  ], []);

  const table = useReactTable({
    data: payments,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header pageTitle="Payment History" />
        <main className="flex-1 overflow-y-auto bg-gray-50/50">
          <Toaster position="top-right" />
          <div className="p-4 space-y-4">
            {/* Search and Filter Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <form onSubmit={handleSearch} className="space-y-3">
                {/* Summary Row */}
                {payments.length > 0 && (
                  <div className="flex flex-wrap gap-4 pb-3 border-b border-gray-100 mb-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-500">Total Payments:</p>
                      <p className="text-lg font-bold text-gray-900">{summary.totalPayments}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-500">Total Amount:</p>
                      <p className="text-lg font-bold text-green-600">₹{summary.totalAmount.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[200px] relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search Member</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearchInputChange(e.target.value)}
                        onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                        placeholder="Name, ID, email or phone..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        autoComplete="off"
                      />
                    </div>
                    {/* Member Suggestions Dropdown */}
                    {showSuggestions && memberSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {memberSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectMember(suggestion)}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-b-0"
                          >
                            <span className="font-medium text-gray-900">{suggestion.name}</span>
                            <span className="text-gray-500 ml-2">({suggestion.memberId})</span>
                            <div className="text-xs text-gray-400">{suggestion.phone}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-3 py-2 rounded-lg border flex items-center gap-2 text-sm ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Search
                  </button>
                  {(searchQuery || selectedLocation || selectedMethod || startDate || endDate || selectedMonth) && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Clear
                    </button>
                  )}
                </div>

                {/* Additional Filters */}
                {showFilters && (
                  <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <select
                        value={selectedLocation}
                        onChange={(e) => { setSelectedLocation(e.target.value); fetchPayments(); }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[150px]"
                      >
                        <option value="">All Locations</option>
                        {locations.map(loc => (
                          <option key={loc._id} value={loc._id}>{loc.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                      <select
                        value={selectedMethod}
                        onChange={(e) => { setSelectedMethod(e.target.value); fetchPayments(); }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[150px]"
                      >
                        <option value="">All Methods</option>
                        <option value="UPI">UPI</option>
                        <option value="cash">Cash</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Month</label>
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => { setSelectedMonth(e.target.value); fetchPayments(); }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[150px]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          fetchPayments({ startDate: e.target.value, endDate });
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          fetchPayments({ startDate, endDate: e.target.value });
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Searched Member Info */}
            {searchedMember && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{searchedMember.name}</h3>
                      <p className="text-sm text-gray-500">ID: {searchedMember.memberId} | {searchedMember.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Payments</p>
                      <p className="text-xl font-bold text-gray-900">{summary.totalPayments}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total</p>
                      <p className="text-xl font-bold text-green-600">₹{summary.totalAmount.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Cards (when not searching) */}
            {/* Download Button & Table */}
            <div className="flex justify-end mb-2">
              <button
                onClick={generateAllInvoicesPDF}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Report
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              ) : payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Receipt className="w-12 h-12 mb-2" />
                  <p>No payments found</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        {table.getHeaderGroups().map(headerGroup => (
                          <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                              <th key={header.id} className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700" onClick={header.column.getToggleSortingHandler()}>
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {table.getRowModel().rows.map(row => (
                          <tr key={row.id} className="hover:bg-gray-50">
                            {row.getVisibleCells().map(cell => (
                              <td key={cell.id} className="px-2 py-2 whitespace-nowrap text-sm text-gray-700">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-200">
                    <div className="text-sm text-gray-700">
                      Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50">Previous</button>
                      <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50">Next</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
