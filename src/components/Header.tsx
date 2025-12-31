"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Toaster, toast } from 'react-hot-toast';
import { Menu, Bell, UserPlus, BookOpen, Home, MapPin, Users, IndianRupee, BarChart3, X, LogOut, User, UserCheck } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

interface HeaderProps {
  pageTitle: string;
}

export default function Header({ pageTitle }: HeaderProps) {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', examPrep: '' });
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notificationRef, userMenuRef]);

  useEffect(() => {
    if (session) {
      fetchNotifications();
    }
  }, [session]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const validateField = (name: string, value: string) => {
    let error = '';
    if (name === 'name' && !value.trim()) error = 'Name is required';
    if (name === 'email') {
      if (!value.trim()) error = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(value)) error = 'Invalid email format';
    }
    if (name === 'phone') {
      if (!value.trim()) error = 'Phone is required';
      else if (!/^\d{10}$/.test(value)) error = 'Phone must be 10 digits';
    }
    if (name === 'address' && !value.trim()) error = 'Address is required';
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    validateField(name, value);
  };

  const handleCancel = () => {
    setForm({ name: '', email: '', phone: '', address: '', examPrep: '' });
    setErrors({});
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ name: '', email: '', phone: '', address: '', examPrep: '' });
      setShowModal(false);
      toast.success('Member added successfully!');
    } else {
      const error = await res.json().catch(() => ({}));
      toast.error(error.error || 'Error adding member');
    }
  };

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  const handleReadNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setNotifications(notifications.map(n => n._id === id ? { ...n, read: true } : n));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      {/* Top Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30">
        <div className="flex items-center">
          <button
            className="md:hidden mr-4 p-2 rounded-md hover:bg-gray-100"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={20} />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">{pageTitle}</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={() => setShowModal(true)} className="hidden sm:flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md text-sm font-medium">
            <UserPlus size={16} className="mr-2" />
            Add Member
          </button>
          <div className="relative" ref={notificationRef}>
            <button onClick={() => setNotificationsOpen(!notificationsOpen)} className="p-2 rounded-full hover:bg-gray-100 relative transition-colors">
              <Bell size={20} className="text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center border-2 border-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in-down">
                <div className="p-4 font-bold border-b border-gray-100">Notifications</div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((n: any) => (
                    <div key={n._id} className={`p-4 border-b border-gray-50 text-sm hover:bg-gray-50 ${!n.read ? 'bg-blue-50/50' : ''}`}>
                      <p className="text-gray-800">{n.message}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</span>
                        {!n.read && <button onClick={() => handleReadNotification(n._id)} className="text-xs text-blue-600 font-semibold hover:underline">Mark as read</button>}
                      </div>
                    </div>
                  ))}
                  {notifications.length === 0 && <p className="p-4 text-center text-gray-500">No new notifications.</p>}
                </div>
                <div className="p-2 bg-gray-50 text-center"><Link href="/admin/notifications" className="text-sm font-medium text-blue-600 hover:underline">View all notifications</Link></div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button 
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-3 p-1 rounded-full hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                {session?.user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="font-semibold text-sm text-gray-800">{session?.user.name}</span>
                <span className="text-xs text-gray-500">{session?.user.email}</span>
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in-down origin-top-right">
                <div className="p-4 border-b border-gray-50">
                  <p className="text-sm font-bold text-gray-900 truncate">{session?.user.name || 'User'}</p>
                  <p className="text-xs text-gray-500 truncate">{session?.user.email || ''}</p>
                </div>
                <div className="p-2">
                  <Link 
                    href="/profile" 
                    className="flex items-center px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User size={16} className="mr-2 text-gray-500" />
                    Profile
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="w-full flex items-center px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={16} className="mr-2" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setSidebarOpen(false)}>
          <div className="w-72 bg-gray-900 text-white h-full fixed left-0 top-0 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <BookOpen size={24} className="text-white" />
                </div>
                <span className="text-xl font-bold tracking-wide">Evolve</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
              <Link href="/" className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-800 transition-all duration-200" onClick={() => setSidebarOpen(false)}>
                <Home size={20} /> <span className="font-medium">Dashboard</span>
              </Link>
              <Link href="/seats" className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-800 transition-all duration-200" onClick={() => setSidebarOpen(false)}>
                <MapPin size={20} /> <span className="font-medium">Seats & Subscriptions</span>
              </Link>
              <Link href="/members" className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-800 transition-all duration-200" onClick={() => setSidebarOpen(false)}>
                <Users size={20} /> <span className="font-medium">Members</span>
              </Link>
              <Link href="/expenses" className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-800 transition-all duration-200" onClick={() => setSidebarOpen(false)}>
                <IndianRupee size={20} /> <span className="font-medium">Expenses</span>
              </Link>
              <Link href="/reports" className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-800 transition-all duration-200" onClick={() => setSidebarOpen(false)}>
                <BarChart3 size={20} /> <span className="font-medium">Reports</span>
              </Link>
              {session?.user.role === 'Admin' && (
                <Link href="/admin/users" className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-800 transition-all duration-200" onClick={() => setSidebarOpen(false)}>
                  <UserCheck size={20} /> <span className="font-medium">Manager Management</span>
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 border border-gray-100 overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">Add Member</h3>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-gray-50 focus:bg-white ${errors.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder="Full name"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-gray-50 focus:bg-white ${errors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder="Email address"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={form.phone}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-gray-50 focus:bg-white ${errors.phone ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder="10-digit number"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-gray-50 focus:bg-white ${errors.address ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder="Address"
                  />
                </div>

              <div className="sm:col-span-6">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Exam Prep</label>
                <input
                  type="text"
                  name="examPrep"
                  value={form.examPrep}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-gray-50 focus:bg-white sm:text-sm"
                  placeholder="Exam preparation details"
                />
              </div>
              <div className="sm:col-span-6 flex justify-end pt-4 gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button type="submit" className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-105">
                  Add Member
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}