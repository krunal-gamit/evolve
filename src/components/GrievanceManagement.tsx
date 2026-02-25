"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Plus, 
  Search, 
  Filter,
  Eye,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface Grievance {
  _id: string;
  title: string;
  description: string;
  category: string;
  location: { _id: string; name: string };
  reportedBy: { _id: string; name: string; email: string };
  status: string;
  priority: string;
  resolution?: string;
  resolvedBy?: { _id: string; name: string; email: string };
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Location {
  _id: string;
  name: string;
  address: string;
}

const CATEGORIES = [
  'AC', 'Fan', 'Lights', 'Furniture', 'Washroom', 
  'Internet', 'Noise', 'Cleanliness', 'Safety', 'Other'
];

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function GrievanceManagement() {
  const { data: session } = useSession();
  const isAdminOrManager = session?.user?.role === 'Admin' || session?.user?.role === 'Manager';
  
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewGrievance, setViewGrievance] = useState<Grievance | null>(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'AC',
    location: '',
    priority: 'Medium'
  });

  useEffect(() => {
    fetchGrievances();
    fetchLocations();
  }, []);

  const fetchGrievances = async () => {
    try {
      const res = await fetch('/api/grievances');
      if (res.ok) {
        const data = await res.json();
        setGrievances(data);
      }
    } catch (error) {
      console.error('Error fetching grievances:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations');
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.title || !form.description || !form.category || !form.location) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const res = await fetch('/api/grievances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        toast.success('Grievance submitted successfully!');
        setShowModal(false);
        setForm({ title: '', description: '', category: 'AC', location: '', priority: 'Medium' });
        fetchGrievances();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to submit grievance');
      }
    } catch (error) {
      toast.error('Error submitting grievance');
    }
  };

  const handleStatusUpdate = async (id: string, status: string, resolution?: string) => {
    try {
      const res = await fetch(`/api/grievances/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolution })
      });

      if (res.ok) {
        toast.success(`Grievance marked as ${status}`);
        fetchGrievances();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      toast.error('Error updating status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this grievance?')) return;
    
    try {
      const res = await fetch(`/api/grievances/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Grievance deleted');
        fetchGrievances();
      } else {
        toast.error('Failed to delete');
      }
    } catch (error) {
      toast.error('Error deleting');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'In Progress':
        return <AlertTriangle className="w-4 h-4 text-blue-500" />;
      case 'Resolved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'Rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Resolved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'text-red-600';
      case 'High':
        return 'text-orange-600';
      case 'Medium':
        return 'text-yellow-600';
      case 'Low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredGrievances = grievances.filter(g => {
    const matchesStatus = filterStatus === 'All' || g.status === filterStatus;
    const matchesCategory = filterCategory === 'All' || g.category === filterCategory;
    const matchesSearch = !searchQuery || 
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.location.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesCategory && matchesSearch;
  });

  const stats = {
    total: grievances.length,
    pending: grievances.filter(g => g.status === 'Pending').length,
    inProgress: grievances.filter(g => g.status === 'In Progress').length,
    resolved: grievances.filter(g => g.status === 'Resolved').length
  };

  return (
    <div className="p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Grievances</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Resolved</p>
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search grievances..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Add Button */}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Report Grievance
          </button>
        </div>
      </div>

      {/* Grievances List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filteredGrievances.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No grievances found. Click "Report Grievance" to submit one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  {isAdminOrManager && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reported By</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredGrievances.map((grievance) => (
                  <tr key={grievance._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{grievance.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{grievance.description}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{grievance.category}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{grievance.location?.name}</td>
                    {isAdminOrManager && (
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">{grievance.reportedBy?.name}</div>
                        <div className="text-xs text-gray-500">{grievance.reportedBy?.email}</div>
                      </td>
                    )}
                    <td className="px-4 py-4">
                      <span className={`text-sm font-medium ${getPriorityColor(grievance.priority)}`}>
                        {grievance.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(grievance.status)}`}>
                        {getStatusIcon(grievance.status)}
                        {grievance.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {new Date(grievance.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewGrievance(grievance)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isAdminOrManager && grievance.status !== 'Resolved' && grievance.status !== 'Rejected' && (
                          <button
                            onClick={() => handleStatusUpdate(grievance._id, 'Resolved')}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Mark Resolved"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {grievance.reportedBy?._id === session?.user?.id && (
                          <button
                            onClick={() => handleDelete(grievance._id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submit Grievance Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Report a Grievance</h2>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Brief title of the issue"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location *
                    </label>
                    <select
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Location</option>
                      {locations.map(loc => (
                        <option key={loc._id} value={loc._id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {PRIORITIES.map(pri => (
                        <option key={pri} value={pri}>{pri}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      placeholder="Describe the issue in detail..."
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Grievance Modal */}
      {viewGrievance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold">{viewGrievance.title}</h2>
                <button
                  onClick={() => setViewGrievance(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(viewGrievance.status)}`}>
                    {getStatusIcon(viewGrievance.status)}
                    {viewGrievance.status}
                  </span>
                  <span className={`text-sm font-medium ${getPriorityColor(viewGrievance.priority)}`}>
                    {viewGrievance.priority} Priority
                  </span>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium">{viewGrievance.category}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">{viewGrievance.location?.name}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Reported By</p>
                  <p className="font-medium">{viewGrievance.reportedBy?.name}</p>
                  <p className="text-sm text-gray-500">{viewGrievance.reportedBy?.email}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="text-gray-700">{viewGrievance.description}</p>
                </div>

                {viewGrievance.resolution && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Resolution</p>
                    <p className="text-green-800">{viewGrievance.resolution}</p>
                    {viewGrievance.resolvedBy && (
                      <p className="text-sm text-green-600 mt-2">
                        Resolved by {viewGrievance.resolvedBy.name} on {new Date(viewGrievance.resolvedAt!).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  <p>Created: {new Date(viewGrievance.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(viewGrievance.updatedAt).toLocaleString()}</p>
                </div>

                {/* Admin/Manager Actions */}
                {isAdminOrManager && viewGrievance.status !== 'Resolved' && viewGrievance.status !== 'Rejected' && (
                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Admin Actions</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const resolution = prompt('Enter resolution notes:');
                          if (resolution) {
                            handleStatusUpdate(viewGrievance._id, 'Resolved', resolution);
                            setViewGrievance(null);
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        Mark Resolved
                      </button>
                      <button
                        onClick={() => {
                          const resolution = prompt('Enter rejection reason:');
                          if (resolution) {
                            handleStatusUpdate(viewGrievance._id, 'Rejected', resolution);
                            setViewGrievance(null);
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          handleStatusUpdate(viewGrievance._id, 'In Progress');
                          setViewGrievance(null);
                        }}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        In Progress
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
