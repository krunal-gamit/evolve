'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Toaster, toast } from 'react-hot-toast';
import { User, Mail, Lock, Key, Save, ShieldCheck } from 'lucide-react';

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    setName(session.user.name || '');
    setEmail(session.user.email || '');
  }, [session, status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setLoading(true);
    const updateData: { name: string; email?: string; password?: string; currentPassword?: string } = { name };
    if (session?.user.role === 'Admin') {
      updateData.email = email;
    }
    if (newPassword) {
      updateData.password = newPassword;
      updateData.currentPassword = currentPassword;
    }

    try {
      const res = await fetch(`/api/users/${session?.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Profile updated successfully');
        // Update the session with new data
        update({ name, email: session?.user.role === 'Admin' ? email : session?.user.email });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(data.error || 'Error updating profile');
      }
    } catch {
      toast.error('Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header pageTitle="Profile" />
        <div className="flex-1 overflow-auto bg-gray-50/50 p-3 md:p-4 sm:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-5 md:mb-8">
              <h2 className="text-lg md:text-2xl font-bold text-gray-900">Account Settings</h2>
              <p className="text-gray-500 text-xs md:text-sm mt-0.5 md:mt-1">Manage your personal information and security settings.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
              {/* Profile Card */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6 text-center h-full">
                  <div className="w-16 h-16 md:w-24 md:h-24 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full mx-auto flex items-center justify-center text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4 shadow-lg">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-base md:text-xl font-bold text-gray-900">{name}</h3>
                  <p className="text-gray-500 text-xs md:text-sm mb-3 md:mb-4">{email}</p>
                  <div className="inline-flex items-center px-2.5 md:px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    {session.user.role} Account
                  </div>
                </div>
              </div>

              {/* Settings Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Personal Info */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Personal Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                          disabled={session.user.role !== 'Admin'}
                          required
                        />
                      </div>
                      {session.user.role !== 'Admin' && (
                        <p className="text-xs text-gray-500 mt-1.5 ml-1">Contact administrator to change email address.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Security */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-blue-600" />
                    Security
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="Required to set new password"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="block w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="Min. 6 characters"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="block w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="Re-enter password"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 font-medium"
                  >
                    {loading ? 'Saving...' : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}