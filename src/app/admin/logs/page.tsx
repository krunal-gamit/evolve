'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Download, FileText, Activity, Clock, User, Database } from 'lucide-react';
import { format, subDays, subMonths, startOfYear } from 'date-fns';

interface Log {
  _id: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  performedBy?: string;
  createdAt: string;
}

export default function LogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<Log[]>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'Admin') {
      router.push('/');
      return;
    }
    fetchLogs();
  }, [session, status, router]);

  const fetchLogs = async () => {
    const res = await fetch('/api/logs');
    if (res.ok) {
      const data = await res.json();
      setLogs(data);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesGlobal = globalFilter === '' ||
        log.action.toLowerCase().includes(globalFilter.toLowerCase()) ||
        log.entity.toLowerCase().includes(globalFilter.toLowerCase()) ||
        (log.details && log.details.toLowerCase().includes(globalFilter.toLowerCase())) ||
        (log.performedBy && log.performedBy.toLowerCase().includes(globalFilter.toLowerCase()));

      const matchesStartDate = !startDateFilter || new Date(log.createdAt) >= new Date(startDateFilter);
      const matchesEndDate = !endDateFilter || new Date(log.createdAt) <= new Date(endDateFilter);
      const matchesAction = !actionFilter || log.action === actionFilter;

      return matchesGlobal && matchesStartDate && matchesEndDate && matchesAction;
    });
  }, [logs, globalFilter, startDateFilter, endDateFilter, actionFilter]);

  const downloadLogs = () => {
    const csvContent = [
      ['Action', 'Entity', 'Entity ID', 'Details', 'Performed By', 'Created At'],
      ...filteredLogs.map(log => [
        log.action,
        log.entity,
        log.entityId || '',
        log.details || '',
        log.performedBy || '',
        new Date(log.createdAt).toLocaleString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'logs.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || session.user.role !== 'Admin') {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header pageTitle="System Logs" />
        
        <main className="flex-1 overflow-y-auto">
          <div className="w-full space-y-4 md:space-y-6 p-3 md:p-4 lg:p-6">
            
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4 bg-white p-3 md:p-5 rounded-xl shadow-sm border border-gray-100">
              <div>
                <h2 className="text-base md:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                  Audit Trail
                </h2>
                <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1">View and export system activity logs.</p>
              </div>
              <button
                onClick={downloadLogs}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>

            {/* Filters Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="w-full pl-4 pr-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block transition-colors"
                  />
                </div>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                >
                  <option value="">All Actions</option>
                  <option value="CREATE">CREATE</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
                  <option value="LOGIN">LOGIN</option>
                  <option value="LOGOUT">LOGOUT</option>
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
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-200">
                      <th className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                      <th className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entity</th>
                      <th className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entity ID</th>
                      <th className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                      <th className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Performed By</th>
                      <th className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          <div className="flex flex-col items-center justify-center">
                            <FileText className="w-12 h-12 text-gray-300 mb-3" />
                            <p>No logs found</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-2 py-1 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-600">
                            <div className="flex items-center gap-2">
                              <Database className="w-3 h-3 text-gray-400" />
                              {log.entity}
                            </div>
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap text-xs font-mono text-gray-500">
                            {log.entityId || '-'}
                          </td>
                          <td className="px-2 py-1 text-xs text-gray-600 max-w-xs truncate" title={log.details}>
                            {log.details || '-'}
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-600">
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3 text-gray-400" />
                              {log.performedBy || 'System'}
                            </div>
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 text-gray-400" />
                              {new Date(log.createdAt).toLocaleString()}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}