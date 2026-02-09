'use client';

import { useState, useEffect, useMemo } from 'react';
import { useReactTable, getCoreRowModel, ColumnDef, flexRender } from '@tanstack/react-table';
import { toast } from 'react-hot-toast';
import ConfirmationModal from './ConfirmationModal';

interface Location {
  _id: string;
  name: string;
  address: string;
  totalSeats: number;
  isActive: boolean;
  createdAt: string;
}

export default function LocationManagement() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [seatsModal, setSeatsModal] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [seatsForm, setSeatsForm] = useState({ totalSeats: '' });
  const [form, setForm] = useState({ name: '', address: '', totalSeats: '', initializeSeats: 'true' });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations');
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      } else {
        toast.error('Failed to fetch locations.');
      }
    } catch {
      toast.error('Error fetching locations.');
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const validateField = (name: string, value: string) => {
    let error = '';
    if (name === 'name' && !value.trim()) error = 'Name is required';
    if (name === 'address' && !value.trim()) error = 'Address is required';
    if (name === 'totalSeats') {
        if (!value.trim()) error = 'Total seats is required';
        else if (isNaN(Number(value)) || Number(value) <= 0) error = 'Seats must be a positive number';
    }
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    validateField(name, value);
  };

  const handleAdd = () => {
    setForm({ name: '', address: '', totalSeats: '', initializeSeats: 'true' });
    setEditingId(null);
    setErrors({});
    setShowModal(true);
  };

  const handleEdit = (location: Location) => {
    setForm({ name: location.name, address: location.address, totalSeats: String(location.totalSeats), initializeSeats: 'false' });
    setEditingId(location._id);
    setErrors({});
    setShowModal(true);
  };

  const handleCancel = () => {
    setShowModal(false);
    setEditingId(null);
    setForm({ name: '', address: '', totalSeats: '', initializeSeats: 'true' });
    setErrors({});
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteId(id);
    setShowConfirmation(true);
  };

  const handleAddSeatsRequest = (locationId: string) => {
    setSelectedLocationId(locationId);
    setSeatsForm({ totalSeats: '' });
    setSeatsModal(true);
  };

  const handleAddSeatsSubmit = async () => {
    if (!selectedLocationId || !seatsForm.totalSeats) return;
    
    try {
      const res = await fetch('/api/seats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: selectedLocationId,
          totalSeats: parseInt(seatsForm.totalSeats, 10)
        })
      });
      
      if (res.ok) {
        toast.success('Seats added successfully');
        setSeatsModal(false);
        fetchLocations();
      } else {
        const result = await res.json();
        toast.error(result.error || 'Failed to add seats');
      }
    } catch {
      toast.error('Error adding seats');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/locations/${deleteId}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Location deleted successfully.');
      fetchLocations();
    } else {
      const result = await res.json().catch(() => ({}));
      toast.error(result.error || 'Failed to delete location.');
    }
    setDeleteId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasErrors = Object.values(errors).some(error => error !== '');
    if (hasErrors) {
        toast.error('Please fix the errors before submitting.');
        return;
    }

    const url = editingId ? `/api/locations/${editingId}` : '/api/locations';
    const method = editingId ? 'PUT' : 'POST';
    const body = {
      name: form.name,
      address: form.address,
      totalSeats: parseInt(form.totalSeats, 10)
    };

    setIsLoading(true);
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const location = await res.json();
      toast.success(`Location ${editingId ? 'updated' : 'added'} successfully.`);
      setShowModal(false);
      
      // Initialize seats for new location
      if (!editingId && form.initializeSeats === 'true' && parseInt(form.totalSeats, 10) > 0) {
        await fetch('/api/seats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locationId: location._id,
            totalSeats: parseInt(form.totalSeats, 10)
          })
        });
      }
      
      fetchLocations();
    } else {
      const result = await res.json().catch(() => ({}));
      toast.error(result.error || 'Failed to save location.');
    }
    setIsLoading(false);
  };

  const columns = useMemo<ColumnDef<Location>[]>(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'address', header: 'Address' },
    { accessorKey: 'totalSeats', header: 'Total Seats' },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-4">
          <button onClick={() => handleAddSeatsRequest(row.original._id)} className="text-green-600 hover:text-green-900 transition-colors" title="Add Seats">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
          <button onClick={() => handleEdit(row.original)} className="text-blue-600 hover:text-blue-900 transition-colors" title="Edit">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button onClick={() => handleDeleteRequest(row.original._id)} className="text-red-600 hover:text-red-900 transition-colors" title="Delete">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      )
    }
  ], []);

  const table = useReactTable({
    data: locations,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <ConfirmationModal isOpen={showConfirmation} onClose={() => setShowConfirmation(false)} onConfirm={handleDeleteConfirm} title="Delete Location" message="Are you sure you want to delete this location? This will also remove all associated seats and subscriptions. This action cannot be undone." />
      
      <div className="flex justify-end mb-6">
        <button onClick={handleAdd} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
          Add Location
        </button>
      </div>
      
      <div className="bg-white shadow-sm overflow-hidden rounded-2xl border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 border border-gray-100 overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Location' : 'Add New Location'}</h3>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                <input type="text" name="name" value={form.name} onChange={handleInputChange} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-gray-50 focus:bg-white ${errors.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                <input type="text" name="address" value={form.address} onChange={handleInputChange} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-gray-50 focus:bg-white ${errors.address ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Total Seats</label>
                <input type="number" name="totalSeats" value={form.totalSeats} onChange={handleInputChange} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-gray-50 focus:bg-white ${errors.totalSeats ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`} required min="1" disabled={!!editingId} />
                {editingId && <p className="text-xs text-gray-500 mt-1">Contact developer to modify seat count after creation.</p>}
              </div>
              {!editingId && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="initializeSeats"
                    checked={form.initializeSeats === 'true'}
                    onChange={(e) => setForm({ ...form, initializeSeats: e.target.checked ? 'true' : 'false' })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="initializeSeats" className="text-sm text-gray-700">Auto-generate seats for this location</label>
                </div>
              )}
              <div className="flex justify-end pt-4 gap-3">
                <button type="button" onClick={handleCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors text-sm font-medium">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-105 text-sm font-medium shadow-sm disabled:opacity-50">
                  {isLoading ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Seats Modal */}
      {seatsModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-gray-100 overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Add Seats</h3>
              <button onClick={() => setSeatsModal(false)} className="text-gray-400 hover:text-gray-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Number of Seats to Add</label>
                <input 
                  type="number" 
                  value={seatsForm.totalSeats}
                  onChange={(e) => setSeatsForm({ totalSeats: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 bg-gray-50 focus:bg-white"
                  required
                  min="1"
                  placeholder="Enter number of seats"
                />
              </div>
              <div className="flex justify-end pt-4 gap-3">
                <button 
                  type="button" 
                  onClick={() => setSeatsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddSeatsSubmit}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all text-sm font-medium shadow-sm"
                >
                  Add Seats
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}