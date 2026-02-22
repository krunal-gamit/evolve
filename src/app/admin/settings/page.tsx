'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import { toast } from 'react-hot-toast';
import { Save, Settings as SettingsIcon, Users, Building, MapPin, UserCheck } from 'lucide-react';
import LocationManagement from '@/components/LocationManagement';
import UserManagement from '@/components/UserManagement';

interface Settings {
  projectName: string;
  maxSeats: string;
}

type TabType = 'general' | 'fees' | 'locations' | 'managers';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({
    projectName: 'Evolve',
    maxSeats: '100'
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('general');

  const isAdmin = session?.user?.role === 'Admin';

  useEffect(() => {
    if (!initialLoading) {
      setActiveTab('general');
    }
  }, [initialLoading]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'Admin') {
      router.push('/');
      return;
    }
    fetchSettings();
  }, [session, status, router]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          projectName: data.projectName || 'Evolve',
          maxSeats: data.maxSeats ? String(data.maxSeats) : '100'
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...settings,
        maxSeats: parseInt(settings.maxSeats, 10)
      };
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetch('/api/seats/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ maxSeats: payload.maxSeats }),
        });
        toast.success('Settings updated successfully');
      } else {
        const error = await res.json().catch(() => ({}));
        toast.error(error.error || 'Error updating settings');
      }
    } catch (error) {
      toast.error('Error updating settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const tabs = [
    { id: 'general' as TabType, label: 'General', icon: SettingsIcon },
    { id: 'locations' as TabType, label: 'Locations', icon: MapPin },
    { id: 'managers' as TabType, label: 'Managers', icon: UserCheck },
  ];

  if (status === 'loading' || initialLoading) {
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
        <Header pageTitle="Settings" />
        
        <main className="flex-1 overflow-y-auto p-3 md:p-4 sm:p-6 lg:p-8">
          <div className="max-w-full mx-auto space-y-4 md:space-y-6">
            
            {/* Tab Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 md:p-2">
              <nav className="flex flex-wrap gap-1.5 md:gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* General Settings Tab */}
            {activeTab === 'general' && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <SettingsIcon className="w-5 h-5 text-blue-600" />
                      Global Configuration
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Manage general system settings and constraints.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Project Settings Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                      <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-500" />
                        Project Identity
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">Define the core identity of your project.</p>
                    </div>
                    <div className="p-6 space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                        <div className="relative">
                          <input
                            type="text"
                            name="projectName"
                            value={settings.projectName}
                            onChange={handleInputChange}
                            className="w-full pl-4 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-400"
                            placeholder="e.g. Evolve System"
                          />
                        </div>
                        <p className="mt-2 text-xs text-gray-500">This name will be displayed across the application header and emails.</p>
                      </div>
                    </div>
                  </div>

                  {/* Capacity Settings Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                      <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        Capacity Management
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">Control user access and seat limits.</p>
                    </div>
                    <div className="p-6 space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Seats</label>
                        <div className="relative max-w-xs">
                          <input
                            type="number"
                            name="maxSeats"
                            value={settings.maxSeats}
                            onChange={handleInputChange}
                            className="w-full pl-4 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-400"
                            placeholder="100"
                            min="1"
                          />
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          Total number of user accounts allowed in the system. 
                          Currently used seats are calculated based on active users.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-end gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                  <button
                    type="button"
                    onClick={() => fetchSettings()}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Locations Tab */}
            {activeTab === 'locations' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Locations Management
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Create and manage your reading room facilities.</p>
                </div>
                <LocationManagement />
              </div>
            )}

            {/* Managers Tab */}
            {activeTab === 'managers' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-2">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                    Manager Management
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Add, view, and delete manager accounts.</p>
                </div>
                <div className="-m-6 -mb-6">
                  <UserManagement />
                </div>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
