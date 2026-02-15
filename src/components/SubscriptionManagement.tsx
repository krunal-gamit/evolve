'use client';

import { useState, useEffect, useMemo } from 'react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, ColumnDef, flexRender } from '@tanstack/react-table';
import { format, subDays, subMonths, startOfYear } from 'date-fns';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ConfirmationModal from './ConfirmationModal';
import { Toaster, toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';

interface Member {
  _id: string;
  name: string;
  email: string;
}

interface Subscription {
  _id: string;
  member: { name: string; email: string; memberId: string };
  location?: { _id: string; name: string; address: string };
  seat: { seatNumber: number };
  startDate: string;
  endDate: string;
  duration: string;
  totalAmount: number;
  status: string;
  payments: any[];
}

interface Location {
  _id: string;
  name: string;
  address: string;
  totalSeats: number;
}

interface Waiting {
  _id: string;
  member: { name: string; email: string; memberId: string };
  requestedDate: string;
  startDate: string;
  duration: string;
  amount: number;
}

interface SubscriptionManagementProps {
  isOpen?: boolean;
  onClose?: () => void;
  onUpdate?: () => void;
  initialSeatNumber?: string;
  initialLocationId?: string;
  initialMemberId?: string;
  selectedLocation?: string;
  onLocationChange?: (locationId: string) => void;
}

export default function SubscriptionManagement({ isOpen = false, onClose = () => {}, onUpdate, initialSeatNumber, initialLocationId, initialMemberId, selectedLocation: propLocation, onLocationChange }: SubscriptionManagementProps) {
  const { data: session } = useSession();
  const isMember = session?.user.role === 'Member';

  const [members, setMembers] = useState<Member[]>([]);
  const [seats, setSeats] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [waitingList, setWaitingList] = useState<Waiting[]>([]);
  const [feeTypes, setFeeTypes] = useState<any[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const internalSelectedLocation = useState<string>('');
  const selectedLocation = propLocation !== undefined ? propLocation : internalSelectedLocation[0];
  const setSelectedLocation = onLocationChange || internalSelectedLocation[1];
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'active' | 'expired' | 'waiting'>(isMember ? 'waiting' : 'active');
  const [globalFilter, setGlobalFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [changingSeatId, setChangingSeatId] = useState<string | null>(null);
  const [newSeat, setNewSeat] = useState<string>('');
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [endSubscriptionId, setEndSubscriptionId] = useState<string | null>(null);
  const [form, setForm] = useState({
    memberId: '',
    locationId: '',
    seatNumber: '',
    startDate: '',
    duration: '',
    amount: '',
    paymentMethod: 'cash',
    upiCode: '',
    dateTime: '',
    feeType: '',
  });

  // Effect to set initial values when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialLocationId) {
        setForm(prev => ({ ...prev, locationId: initialLocationId }));
      }
      if (initialMemberId) {
        setForm(prev => ({ ...prev, memberId: initialMemberId }));
      }
      if (initialSeatNumber) {
        setForm(prev => ({ ...prev, seatNumber: initialSeatNumber }));
      }
    }
  }, [isOpen, initialLocationId, initialMemberId, initialSeatNumber]);

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members');
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || 'Failed to fetch members');
      }
    } catch (error) {
      setError('Network error fetching members');
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations');
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
        // Only auto-select first location if no location is currently selected
        if (data.length > 0 && !selectedLocation) {
          setSelectedLocation(data[0]._id);
          setForm(prev => ({ ...prev, locationId: data[0]._id }));
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchSeats = async () => {
    if (!selectedLocation) {
      setSeats([]);
      return;
    }
    try {
      const url = `/api/seats?locationId=${selectedLocation}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSeats(data);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || 'Failed to fetch seats');
      }
    } catch (error) {
      setError('Network error fetching seats');
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const url = selectedLocation ? `/api/subscriptions?locationId=${selectedLocation}` : '/api/subscriptions';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        data.sort((a: Subscription, b: Subscription) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        setSubscriptions(data);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to fetch subscriptions');
      }
    } catch (error) {
      setError('Network error fetching subscriptions');
    }
  };

  const fetchWaitingList = async () => {
    try {
      const res = await fetch('/api/waiting');
      if (res.ok) {
        const data = await res.json();
        data.sort((a: Waiting, b: Waiting) => new Date(b.requestedDate).getTime() - new Date(a.requestedDate).getTime());
        setWaitingList(data);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to fetch waiting list');
      }
    } catch (error) {
      setError('Network error fetching waiting list');
    }
  };

  const fetchFeeTypes = async () => {
    try {
      const res = await fetch('/api/fees');
      if (res.ok) {
        const data = await res.json();
        setFeeTypes(data);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to fetch fee types');
      }
    } catch (error) {
      setError('Network error fetching fee types');
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchLocations();
    fetchFeeTypes();
  }, []);

  useEffect(() => {
    fetchSeats();
    fetchSubscriptions();
    fetchWaitingList();
  }, [selectedLocation]);

  useEffect(() => {
    if (selectedLocation) {
      setForm(prev => ({ ...prev, locationId: selectedLocation }));
    }
  }, [selectedLocation]);

  const handleFeeTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedFee = feeTypes.find(f => f._id === selectedId);
    if (selectedFee) {
      setForm(prev => ({
        ...prev,
        feeType: selectedId,
        amount: selectedFee.amount.toString(),
        duration: selectedFee.duration
      }));
    } else {
      setForm(prev => ({ ...prev, feeType: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parseFloat(form.amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    setError('');
    const res = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        seatNumber: parseInt(form.seatNumber),
        amount: parseFloat(form.amount),
      }),
    });
    const result = await res.json();
    if (res.ok) {
      toast.success(result.message || 'Subscription created');
      setForm({
        memberId: '',
        locationId: selectedLocation,
        seatNumber: '',
        startDate: '',
        duration: '',
        amount: '',
        paymentMethod: 'cash',
        upiCode: '',
        dateTime: '',
        feeType: '',
      });
      onClose();
    } else {
      setError(result.error || 'Failed to create subscription');
    }
    fetchSubscriptions();
    fetchSeats();
    fetchWaitingList();
    if (onUpdate) onUpdate();
  };

  const handleAddToWaiting = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation - only member and location are required for waiting list
    if (!form.memberId) {
      setError('Please select a member');
      return;
    }
    
    setError('');
    const res = await fetch('/api/waiting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: form.memberId,
        locationId: form.locationId || selectedLocation,
        startDate: form.startDate,
        duration: form.duration,
        amount: parseFloat(form.amount),
        paymentMethod: form.paymentMethod,
        upiCode: form.upiCode,
        dateTime: form.dateTime,
      }),
    });
    const result = await res.json();
    if (res.ok) {
      toast.success(result.message || 'Added to waiting list');
      setForm({
        memberId: '',
        locationId: selectedLocation,
        seatNumber: '',
        startDate: '',
        duration: '',
        amount: '',
        paymentMethod: 'cash',
        upiCode: '',
        dateTime: '',
        feeType: '',
      });
      onClose();
    } else {
      setError(result.error || 'Failed to add to waiting list');
    }
    fetchSubscriptions();
    fetchSeats();
    fetchWaitingList();
    if (onUpdate) onUpdate();
  };

  const handleEndSubscriptionRequest = (id: string) => {
    setEndSubscriptionId(id);
    setShowEndConfirmation(true);
  };

  const handleEndSubscriptionConfirm = async () => {
    if (!endSubscriptionId) return;
    const res = await fetch(`/api/subscriptions/${endSubscriptionId}`, { method: 'PUT' });
    if (res.ok) {
      toast.success('Subscription ended successfully.');
      fetchSubscriptions();
      fetchSeats();
      fetchWaitingList();
      if (onUpdate) onUpdate();
    }
    setEndSubscriptionId(null);
  };

  const changeSeat = async (id: string, newSeatNumber: string) => {
    const res = await fetch(`/api/subscriptions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatNumber: parseInt(newSeatNumber) }),
    });
    if (res.ok) {
      setChangingSeatId(null);
      setNewSeat('');
      fetchSubscriptions();
      fetchSeats();
      if (onUpdate) onUpdate();
    } else {
      toast.error('Failed to change seat. It might be occupied.');
    }
  };

  const removeFromWaiting = async (id: string) => {
    await fetch(`/api/waiting/${id}`, { method: 'DELETE' });
    fetchWaitingList();
    if (onUpdate) onUpdate();
  };

  const calculatePreviewEndDate = () => {
    if (!form.startDate || !form.duration) return null;
    const start = new Date(form.startDate);
    const duration = form.duration;
    if (duration.includes('month')) {
      const months = parseInt(duration.split(' ')[0]);
      start.setMonth(start.getMonth() + months);
    } else {
      const days = parseInt(duration.split(' ')[0]) || 0;
      start.setDate(start.getDate() + days);
    }
    return start.toLocaleDateString('en-GB');
  };

  const vacantSeats = seats.filter(s => s.status === 'vacant');

  // --- Filtering Logic ---
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      const date = new Date(sub.startDate);
      const start = startDateFilter ? new Date(startDateFilter) : null;
      const end = endDateFilter ? new Date(endDateFilter) : null;
      if (start && date < start) return false;
      if (end) {
        const adjustedEnd = new Date(end);
        adjustedEnd.setHours(23, 59, 59, 999);
        if (date > adjustedEnd) return false;
      }
      return true;
    });
  }, [subscriptions, startDateFilter, endDateFilter]);

  const activeSubscriptions = useMemo(() => filteredSubscriptions.filter(s => s.status === 'active'), [filteredSubscriptions]);
  const expiredSubscriptions = useMemo(() => filteredSubscriptions.filter(s => s.status === 'expired'), [filteredSubscriptions]);

  const filteredWaitingList = useMemo(() => {
    return waitingList.filter(wait => {
      const date = new Date(wait.requestedDate);
      const start = startDateFilter ? new Date(startDateFilter) : null;
      const end = endDateFilter ? new Date(endDateFilter) : null;
      if (start && date < start) return false;
      if (end) {
        const adjustedEnd = new Date(end);
        adjustedEnd.setHours(23, 59, 59, 999);
        if (date > adjustedEnd) return false;
      }
      return true;
    });
  }, [waitingList, startDateFilter, endDateFilter]);

  // --- Columns Definitions ---
  const activeColumns = useMemo<ColumnDef<Subscription>[]>(() => [
    {
      accessorKey: 'member.name',
      header: 'Member',
      cell: ({ row }) => (
        <div className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shadow-sm">
            {row.original.member?.name ? row.original.member.name.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{row.original.member?.name || 'Unknown Member'}</div>
            <div className="text-xs text-gray-500 font-mono">{row.original.member?.memberId || 'N/A'}</div>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'location.name',
      header: 'Location',
      cell: ({ getValue }) => <span className="text-sm text-gray-600">{getValue<string>() || '-'}</span>
    },
    {
      accessorKey: 'seat.seatNumber',
      header: 'Seat',
      cell: ({ getValue }) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Seat {getValue<number>()}
        </span>
      )
    },
    {
      id: 'timeline',
      header: 'Timeline',
      accessorFn: row => `${row.startDate} ${row.endDate}`,
      cell: ({ row }) => (
        <div>
          <div className="text-sm text-gray-900">{row.original.duration}</div>
          <div className="text-xs text-gray-500">
            {new Date(row.original.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(row.original.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
          </div>
        </div>
      )
    },
    {
      accessorKey: 'totalAmount',
      header: 'Amount',
      cell: ({ getValue }) => <span className="font-semibold text-gray-900">₹{getValue<number>().toLocaleString('en-IN')}</span>
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const sub = row.original;
        return changingSeatId === sub._id ? (
          <div className="flex items-center gap-2">
            <select
              value={newSeat}
              onChange={(e) => setNewSeat(e.target.value)}
              className="block w-24 pl-2 pr-1 py-1 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md border"
            >
              <option value="">Select</option>
              {vacantSeats.map(seat => (
                <option key={seat._id} value={seat.seatNumber}>{seat.seatNumber}</option>
              ))}
            </select>
            <button
              onClick={() => changeSeat(sub._id, newSeat)}
              className="p-1 rounded-full text-green-600 hover:bg-green-100 transition-colors"
              title="Confirm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => { setChangingSeatId(null); setNewSeat(''); }}
              className="p-1 rounded-full text-red-600 hover:bg-red-100 transition-colors"
              title="Cancel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setChangingSeatId(sub._id)}
              className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors text-xs uppercase font-semibold tracking-wide"
            >
              Change Seat
            </button>
            <button onClick={() => handleEndSubscriptionRequest(sub._id)} className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors text-xs uppercase font-semibold tracking-wide">
              End
            </button>
          </div>
        );
      }
    }
  ], [vacantSeats, changingSeatId, newSeat]);

  const expiredColumns = useMemo<ColumnDef<Subscription>[]>(() => [
    {
      accessorKey: 'member.name',
      header: 'Member',
      cell: ({ row }) => (
        <div className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm shadow-sm">
            {row.original.member?.name ? row.original.member.name.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{row.original.member?.name || 'Unknown Member'}</div>
            <div className="text-xs text-gray-500 font-mono">{row.original.member?.memberId || 'N/A'}</div>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'location.name',
      header: 'Location',
      cell: ({ getValue }) => <span className="text-sm text-gray-600">{getValue<string>() || '-'}</span>
    },
    {
      accessorKey: 'seat.seatNumber',
      header: 'Seat',
      cell: ({ getValue }) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Seat {getValue<number>()}
        </span>
      )
    },
    {
      id: 'timeline',
      header: 'Timeline',
      accessorFn: row => `${row.startDate} ${row.endDate}`,
      cell: ({ row }) => (
        <div>
          <div className="text-sm text-gray-900">{row.original.duration}</div>
          <div className="text-xs text-gray-500">
            {new Date(row.original.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(row.original.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
          </div>
        </div>
      )
    },
    {
      accessorKey: 'totalAmount',
      header: 'Amount',
      cell: ({ getValue }) => <span className="font-semibold text-gray-900">₹{getValue<number>().toLocaleString('en-IN')}</span>
    }
  ], []);

  const waitingColumns = useMemo<ColumnDef<Waiting>[]>(() => [
    {
      accessorKey: 'member.name',
      header: 'Member',
      cell: ({ row }) => (
        <div className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold text-sm shadow-sm">
            {row.original.member?.name ? row.original.member.name.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{row.original.member?.name || 'Unknown Member'}</div>
            <div className="text-xs text-gray-500 font-mono">{row.original.member?.memberId || 'N/A'}</div>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'requestedDate',
      header: 'Requested Date',
      cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    },
    { accessorKey: 'duration', header: 'Duration' },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ getValue }) => <span className="font-semibold text-gray-900">₹{getValue<number>().toLocaleString('en-IN')}</span>
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <button onClick={() => removeFromWaiting(row.original._id)} className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors text-xs uppercase font-semibold tracking-wide">
          Remove
        </button>
      )
    }
  ], []);

  // --- Table Instances ---
  const tableActive = useReactTable({
    data: activeSubscriptions,
    columns: activeColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
  });

  const tableExpired = useReactTable({
    data: expiredSubscriptions,
    columns: expiredColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
  });

  const tableWaiting = useReactTable({
    data: filteredWaitingList,
    columns: waitingColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
  });

  // --- Export Functions ---
  const exportToExcel = () => {
    const data = filteredSubscriptions.map(sub => ({
      'Member ID': sub.member.memberId,
      Name: sub.member.name,
      'Seat Number': sub.seat.seatNumber,
      'Start Date': format(new Date(sub.startDate), 'dd/MM/yyyy'),
      'End Date': format(new Date(sub.endDate), 'dd/MM/yyyy'),
      Duration: sub.duration,
      'Total Amount': sub.totalAmount,
      Status: sub.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Subscriptions');
    XLSX.writeFile(wb, 'subscriptions.xlsx');
  };

  const exportToCSV = () => {
    const data = filteredSubscriptions.map(sub => ({
      'Member ID': sub.member.memberId,
      Name: sub.member.name,
      'Seat Number': sub.seat.seatNumber,
      'Start Date': format(new Date(sub.startDate), 'dd/MM/yyyy'),
      'End Date': format(new Date(sub.endDate), 'dd/MM/yyyy'),
      Duration: sub.duration,
      'Total Amount': sub.totalAmount,
      Status: sub.status,
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
    const headers = [['Member ID', 'Name', 'Seat', 'Start Date', 'End Date', 'Duration', 'Amount', 'Status']];
    const data = filteredSubscriptions.map(sub => [
      sub.member.memberId,
      sub.member.name,
      sub.seat.seatNumber,
      format(new Date(sub.startDate), 'dd/MM/yyyy'),
      format(new Date(sub.endDate), 'dd/MM/yyyy'),
      sub.duration,
      sub.totalAmount,
      sub.status,
    ]);
    autoTable(doc, {
      head: headers,
      body: data,
      styles: { fontSize: 8 },
    });
    doc.save('subscriptions.pdf');
  };

  // --- Pagination Component ---
  const Pagination = ({ table }: { table: any }) => (
    <div className="flex items-center justify-between mt-4 bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200 sm:px-6">
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
        <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Previous</button>
        <span className="text-sm text-gray-700">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span>
        <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Next</button>
      </div>
    </div>
  );

  return (
    <>
        <ConfirmationModal isOpen={showEndConfirmation} onClose={() => setShowEndConfirmation(false)} onConfirm={handleEndSubscriptionConfirm} title="End Subscription" message="Are you sure you want to end this subscription? This will free up the seat. This action cannot be undone." />
        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-4 border border-red-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        {isOpen && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 border border-gray-100 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Create New Subscription</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-6">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-6">
                
                <div className="sm:col-span-3">
                  <label htmlFor="location-select" className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
                  <select
                    id="location-select"
                    value={form.locationId}
                    onChange={(e) => {
                      setForm({ ...form, locationId: e.target.value, seatNumber: '' });
                      setSelectedLocation(e.target.value);
                    }}
                    required
                    className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg border bg-gray-50 focus:bg-white transition-colors"
                  >
                    <option value="">Select Location</option>
                    {locations.map(location => (
                      <option key={location._id} value={location._id}>{location.name} - {location.address}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="member-select" className="block text-sm font-semibold text-gray-700 mb-1">Member</label>
                  <select
                    id="member-select"
                    value={form.memberId}
                    onChange={(e) => setForm({ ...form, memberId: e.target.value })}
                    required
                    className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg border bg-gray-50 focus:bg-white transition-colors"
                  >
                    <option value="">Select Member</option>
                    {members.map(member => (
                      <option key={member._id} value={member._id}>{member.name}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="seat-select" className="block text-sm font-semibold text-gray-700 mb-1">Seat</label>
                  <select
                    id="seat-select"
                    value={form.seatNumber}
                    onChange={(e) => setForm({ ...form, seatNumber: e.target.value })}
                    required
                    className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg border bg-gray-50 focus:bg-white transition-colors"
                  >
                    <option value="">Select Seat</option>
                    {vacantSeats.map(seat => (
                      <option key={seat._id} value={seat.seatNumber}>{seat.seatNumber}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="fee-type" className="block text-sm font-semibold text-gray-700 mb-1">Fee Type (Optional)</label>
                  <select
                    id="fee-type"
                    value={form.feeType}
                    onChange={handleFeeTypeChange}
                    className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg border bg-gray-50 focus:bg-white transition-colors"
                  >
                    <option value="">Select Fee Type</option>
                    {feeTypes.map(fee => (
                      <option key={fee._id} value={fee._id}>{fee.name} - ₹{fee.amount} ({fee.duration})</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="start-date" className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                  <input
                    id="start-date"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                    className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2.5 px-3 border bg-gray-50 focus:bg-white transition-colors"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="duration" className="block text-sm font-semibold text-gray-700 mb-1">Duration</label>
                  <input
                    id="duration"
                    type="text"
                    placeholder="e.g., 30 days"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    required
                    className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2.5 px-3 border bg-gray-50 focus:bg-white transition-colors"
                  />
                  {calculatePreviewEndDate() && (
                    <p className="mt-1 text-xs text-blue-600">Ends: {calculatePreviewEndDate()}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="amount" className="block text-sm font-semibold text-gray-700 mb-1">Amount</label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">₹</span>
                    </div>
                    <input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      required
                      className="block w-full pl-7 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2.5 border bg-gray-50 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="payment-method" className="block text-sm font-semibold text-gray-700 mb-1">Payment Method</label>
                  <select
                    id="payment-method"
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg border bg-gray-50 focus:bg-white transition-colors"
                  >
                    <option value="cash">Cash</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>

                {form.paymentMethod === 'UPI' && (
                  <div className="sm:col-span-2">
                    <label htmlFor="upi-code" className="block text-sm font-semibold text-gray-700 mb-1">UPI Transaction ID</label>
                    <input
                      id="upi-code"
                      type="text"
                      value={form.upiCode}
                      onChange={(e) => setForm({ ...form, upiCode: e.target.value })}
                      className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2.5 px-3 border bg-gray-50 focus:bg-white transition-colors"
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label htmlFor="payment-datetime" className="block text-sm font-semibold text-gray-700 mb-1">Payment Date & Time</label>
                  <input
                    id="payment-datetime"
                    type="datetime-local"
                    value={form.dateTime}
                    onChange={(e) => setForm({ ...form, dateTime: e.target.value })}
                    required
                    className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2.5 px-3 border bg-gray-50 focus:bg-white transition-colors"
                  />
                </div>

                <div className="sm:col-span-6 flex justify-end pt-4 gap-3">
                  <button
                    type="button"
                    onClick={handleAddToWaiting}
                    className="px-4 py-2 border border-yellow-300 rounded-lg text-yellow-700 hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors text-sm font-medium"
                  >
                    Add to Waiting List
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-105"
                  >
                    Create Subscription
                  </button>
                </div>
              </form>
            </div>
          </div>
          </div>
        )}

        {/* Tabs */}
        {!isMember && <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {['active', 'expired', 'waiting'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors`}
              >
                {tab === 'waiting' ? 'Waiting List' : `${tab} Subscriptions`}
              </button>
            ))}
          </nav>
        </div>}

        {/* Filters Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-lg">
              <input
                type="text"
                placeholder="Search subscriptions..."
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
              <button onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-full hover:bg-red-100 transition-colors">Clear</button>
              <div className="h-6 w-px bg-gray-300 mx-2 hidden sm:block"></div>
              <button onClick={exportToExcel} className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-green-700 bg-white border border-green-300 rounded-lg hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all">Excel</button>
              <button onClick={exportToCSV} className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all">CSV</button>
              <button onClick={exportToPDF} className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all">PDF</button>
            </div>
          </div>
        </div>

        {isMember ? (
          <div className="text-center py-8">
            <p className="text-gray-500">You do not have access to subscription management.</p>
          </div>
        ) : (
          <div className="space-y-4">
          {/* Active Subscriptions */}
          {activeTab === 'active' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200 animate-fade-in">
            <div className="px-4 py-3 sm:px-6 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Active Subscriptions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  {tableActive.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th key={header.id} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 transition-colors" onClick={header.column.getToggleSortingHandler()}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableActive.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {tableActive.getRowModel().rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-2 text-center text-sm text-gray-500">No active subscriptions found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination table={tableActive} />
          </div>
          )}

          {/* Expired Subscriptions */}
          {activeTab === 'expired' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200 animate-fade-in">
            <div className="px-4 py-3 sm:px-6 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Expired Subscriptions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  {tableExpired.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th key={header.id} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 transition-colors" onClick={header.column.getToggleSortingHandler()}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableExpired.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {tableExpired.getRowModel().rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-2 text-center text-sm text-gray-500">No expired subscriptions found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination table={tableExpired} />
          </div>
          )}

          {/* Waiting List */}
          {activeTab === 'waiting' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200 animate-fade-in">
            <div className="px-4 py-3 sm:px-6 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Waiting List</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  {tableWaiting.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th key={header.id} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 transition-colors" onClick={header.column.getToggleSortingHandler()}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableWaiting.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {tableWaiting.getRowModel().rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-2 text-center text-sm text-gray-500">No members in waiting list</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination table={tableWaiting} />
          </div>
          )}
        </div>
        )}

    </>
  );
}