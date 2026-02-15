"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Toaster, toast } from 'react-hot-toast';
import { Menu, Bell, UserPlus, BookOpen, Home, MapPin, Users, IndianRupee, BarChart3, X, LogOut, User, UserCheck, CreditCard, Settings, ClipboardList, Calendar } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

interface HeaderProps {
  pageTitle: string;
}

export default function Header({ pageTitle }: HeaderProps) {
  const { data: session } = useSession();
  const isMember = session?.user.role === 'Member';
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
      {/* Top Header - iOS Style with Glassmorphism */}
      <header className="glass sticky top-0 z-30 h-14 flex items-center justify-between px-4">
        <div className="flex items-center">
          <button
            className="lg:hidden mr-3 p-1.5 rounded-lg hover:bg-black/5"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={18} />
          </button>
          <h1 className="text-base font-semibold text-gray-800">{pageTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          {!isMember && <button onClick={() => setShowModal(true)} className="hidden sm:flex items-center px-3 py-1.5 bg-[#007AFF] text-white rounded-lg hover:bg-[#0066CC] transition-all duration-200 text-sm font-medium">
            <UserPlus size={14} className="mr-1.5" />
            <span className="hidden md:inline">Add</span>
          </button>}
          <div className="relative" ref={notificationRef}>
            <button onClick={() => setNotificationsOpen(!notificationsOpen)} className="p-1.5 rounded-full hover:bg-gray-100 relative transition-colors">
              <Bell size={18} className="text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-[#FF3B30] text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-2 mt-2 w-72 glass-card shadow-xl overflow-hidden z-50 animate-ios-fade-in">
                <div className="px-4 py-3 font-semibold border-b border-gray-100 text-sm">Notifications</div>
                <div className="max-80 overflow-y-auto">
                  {notifications.map((n: any) => (
                    <div key={n._id} className={`px-4 py-3 border-b border-gray-50 text-sm hover:bg-gray-50 ${!n.read ? 'bg-blue-50/50' : ''}`}>
                      <p className="text-gray-800 text-sm">{n.message}</p>
                      <div className="flex justify-between items-center mt-1.5">
                        <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</span>
                        {!n.read && <button onClick={() => handleReadNotification(n._id)} className="text-xs text-[#007AFF] font-medium">Mark read</button>}
                      </div>
                    </div>
                  ))}
                  {notifications.length === 0 && <p className="p-4 text-center text-gray-500 text-sm">No new notifications.</p>}
                </div>
                <div className="p-2 bg-gray-50 text-center"><Link href="/admin/notifications" className="text-xs font-medium text-[#007AFF] hover:underline">View all</Link></div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button 
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#007AFF] to-[#5856D6] flex items-center justify-center text-xs font-semibold text-white">
                {session?.user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="font-semibold text-sm text-gray-800">{session?.user.name}</span>
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-2 mt-2 w-52 glass-card shadow-xl overflow-hidden z-50 animate-ios-fade-in origin-top-right">
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="text-sm font-semibold text-gray-900 truncate">{session?.user.name || 'User'}</p>
                  <p className="text-xs text-gray-500 truncate">{session?.user.email || ''}</p>
                </div>
                <div className="p-1.5">
                  <Link 
                    href="/profile" 
                    className="flex items-center px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User size={15} className="mr-2 text-gray-500" />
                    Profile
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="w-full flex items-center px-3 py-2 text-sm text-[#FF3B30] rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={15} className="mr-2" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay - iOS Style */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)}>
          <div className="w-72 bg-[#1C1C1E] text-white h-full fixed left-0 top-0 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center space-x-3">
                <div className="bg-[#007AFF] p-1.5 rounded-lg">
                  <BookOpen size={20} className="text-white" />
                </div>
                <span className="text-lg font-semibold tracking-wide">Evolve</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>
            <div className="px-3 py-3">
              {!isMember && <button onClick={() => { setShowModal(true); setSidebarOpen(false); }} className="w-full flex items-center space-x-2 p-2.5 rounded-xl bg-[#007AFF] text-white hover:bg-[#0066CC] transition-all duration-200 text-sm font-medium">
                <UserPlus size={18} />
                <span>Add Member</span>
              </button>}
            </div>
            <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
              <Link href="/" className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 text-sm" onClick={() => setSidebarOpen(false)}>
                <Home size={18} /> <span>Dashboard</span>
              </Link>
              <Link href="/members" className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 text-sm" onClick={() => setSidebarOpen(false)}>
                <Users size={18} /> <span>Members</span>
              </Link>
              <Link href="/seats" className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 text-sm" onClick={() => setSidebarOpen(false)}>
                <Calendar size={18} /> <span>Subscriptions</span>
              </Link>
              <Link href="/expenses" className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 text-sm" onClick={() => setSidebarOpen(false)}>
                <IndianRupee size={18} /> <span>Expenses</span>
              </Link>
              <Link href="/reports" className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 text-sm" onClick={() => setSidebarOpen(false)}>
                <BarChart3 size={18} /> <span>Reports</span>
              </Link>
              <Link href="/fees" className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 text-sm" onClick={() => setSidebarOpen(false)}>
                <CreditCard size={18} /> <span>Fee Types</span>
              </Link>
              <Link href="/profile" className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 text-sm" onClick={() => setSidebarOpen(false)}>
                <User size={18} /> <span>Profile</span>
              </Link>
              {session?.user.role === 'Admin' && (
                <>
                  <Link href="/admin/settings" className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 text-sm" onClick={() => setSidebarOpen(false)}>
                    <Settings size={18} /> <span>Settings</span>
                  </Link>
                  <Link href="/admin/logs" className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 text-sm" onClick={() => setSidebarOpen(false)}>
                    <ClipboardList size={18} /> <span>Logs</span>
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-lg w-full shadow-2xl">
            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 bg-gray-50/80">
              <h3 className="text-lg font-semibold text-gray-900">Add Member</h3>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-500 transition-colors p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-5">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    className={`ios-input w-full text-sm ${errors.name ? 'border-red-300' : ''}`}
                    placeholder="Full name"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleInputChange}
                    className={`ios-input w-full text-sm ${errors.email ? 'border-red-300' : ''}`}
                    placeholder="Email address"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={form.phone}
                    onChange={handleInputChange}
                    className={`ios-input w-full text-sm ${errors.phone ? 'border-red-300' : ''}`}
                    placeholder="10-digit number"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleInputChange}
                    className={`ios-input w-full text-sm ${errors.address ? 'border-red-300' : ''}`}
                    placeholder="Address"
                  />
                </div>

              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Exam Prep</label>
                <input
                  type="text"
                  name="examPrep"
                  value={form.examPrep}
                  onChange={handleInputChange}
                  className="ios-input w-full text-sm"
                  placeholder="Exam preparation details"
                />
              </div>
              <div className="sm:col-span-6 flex justify-end pt-3 gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="ios-btn ios-btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="ios-btn ios-btn-primary text-sm px-4">
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