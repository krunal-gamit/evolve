'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Header from '../../../components/Header';
import Sidebar from '../../../components/Sidebar';
import Footer from '../../../components/Footer';

export default function FixDatabasePage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');

  const runMigration = async () => {
    setLoading('migrate-locations');
    setResult('');
    try {
      const res = await fetch('/api/migrate-locations', { method: 'POST' });
      const data = await res.json();
      setResult(prev => prev + '\n--- Migration ---\n' + JSON.stringify(data, null, 2));
    } catch (error: any) {
      setResult(prev => prev + '\n--- Migration Error ---\n' + error.message);
    }
    setLoading(null);
  };

  const runFixIndexes = async () => {
    setLoading('fix-seats-index');
    setResult('');
    try {
      const res = await fetch('/api/fix-seats-index', { method: 'POST' });
      const data = await res.json();
      setResult(prev => prev + '\n--- Fix Indexes ---\n' + JSON.stringify(data, null, 2));
    } catch (error: any) {
      setResult(prev => prev + '\n--- Fix Indexes Error ---\n' + error.message);
    }
    setLoading(null);
  };

  const deleteSubscriptions = async () => {
    if (!confirm('Are you sure you want to delete ALL subscriptions and waiting list entries? This cannot be undone.')) {
      return;
    }
    setLoading('delete-subscriptions');
    setResult('');
    try {
      const res = await fetch('/api/fix-database/delete-subscriptions', { method: 'POST' });
      const data = await res.json();
      setResult(prev => prev + '\n--- Delete Subscriptions ---\n' + JSON.stringify(data, null, 2));
    } catch (error: any) {
      setResult(prev => prev + '\n--- Delete Error ---\n' + error.message);
    }
    setLoading(null);
  };

  if (!session || session.user.role !== 'Admin') {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header pageTitle="Fix Database" />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="text-red-600">Access denied. Admin only.</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header pageTitle="Fix Database" />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Database Fix Tools</h1>
            
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Step 1: Run Migration</h2>
              <p className="text-gray-600 mb-4">
                Creates a default "Main Building" location and assigns all existing seats and subscriptions to it.
              </p>
              <button
                onClick={runMigration}
                disabled={loading !== null}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading === 'migrate-locations' ? 'Running...' : 'Run Migration'}
              </button>
            </div>

            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Step 2: Fix Indexes</h2>
              <p className="text-gray-600 mb-4">
                Drops the old unique index on seatNumber and creates the new compound index (location + seatNumber).
                This allows the same seat numbers in different locations.
              </p>
              <button
                onClick={runFixIndexes}
                disabled={loading !== null}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading === 'fix-seats-index' ? 'Running...' : 'Fix Indexes'}
              </button>
            </div>

            <div className="bg-white shadow rounded-lg p-6 mb-6 border border-red-200">
              <h2 className="text-lg font-semibold mb-4 text-red-600">Danger Zone: Delete All Data</h2>
              <p className="text-gray-600 mb-4">
                Deletes ALL subscriptions and waiting list entries from the database. This action cannot be undone.
              </p>
              <button
                onClick={deleteSubscriptions}
                disabled={loading !== null}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading === 'delete-subscriptions' ? 'Deleting...' : 'Delete All Subscriptions & Waiting List'}
              </button>
            </div>

            {result && (
              <div className="bg-gray-900 text-green-400 rounded-lg p-6">
                <pre className="whitespace-pre-wrap text-sm">{result}</pre>
              </div>
            )}
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}
