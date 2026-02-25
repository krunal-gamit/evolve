"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Toaster, toast } from 'react-hot-toast';
import { Menu, Bell, UserPlus, BookOpen, Home, MapPin, Users, IndianRupee, BarChart3, X, LogOut, User, UserCheck, CreditCard, Settings, ClipboardList, Calendar, Search, AlertCircle, CheckCircle, XCircle, Hash, Mail, Phone, Sun, Moon, Receipt, Package, QrCode } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useTheme } from '@/context/ThemeContext';
import QRScanner from './QRScanner';

interface HeaderProps {
  pageTitle: string;
}

interface SearchHint {
  memberId: string;
  name: string;
  email: string;
  phone: string;
  displayText: string;
}

export default function Header({ pageTitle }: HeaderProps) {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const isMember = session?.user.role === 'Member';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', examPrep: '' });
  const [showModal, setShowModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyMemberId, setVerifyMemberId] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifyHints, setVerifyHints] = useState<SearchHint[]>([]);
  const [showVerifyHints, setShowVerifyHints] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleVerify = async () => {
    if (!verifyMemberId.trim()) {
      setVerifyError('Please enter a Member ID, Email, Phone, or Name');
      return;
    }
    setVerifyLoading(true);
    setVerifyError('');
    setVerifyResult(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('q', verifyMemberId.trim());
      
      const response = await fetch(`/api/verify?${queryParams.toString()}`);
      const data = await response.json();
      if (response.ok) {
        setVerifyResult(data);
      } else {
        setVerifyError(data.error || 'Failed to verify member');
      }
    } catch {
      setVerifyError('Network error. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const resetVerifyModal = () => {
    setVerifyMemberId('');
    setVerifyResult(null);
    setVerifyError('');
    setVerifyHints([]);
    setShowVerifyHints(false);
  };

  const handleQRScan = (memberId: string) => {
    setVerifyMemberId(memberId);
    handleVerify();
  };

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

  // Fetch search hints for verify modal
  useEffect(() => {
    const fetchHints = async () => {
      if (!showVerifyModal || !verifyMemberId || verifyMemberId.trim().length < 2) {
        setVerifyHints([]);
        return;
      }

      try {
        const response = await fetch(`/api/verify?q=${encodeURIComponent((verifyMemberId || '').trim())}&hints=true`);
        const data = await response.json();
        if (response.ok) {
          setVerifyHints(data.hints || []);
        }
      } catch (err) {
        console.error('Error fetching hints:', err);
      }
    };

    const debounceTimer = setTimeout(fetchHints, 300);
    return () => clearTimeout(debounceTimer);
  }, [verifyMemberId, showVerifyModal]);

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
      <header className="glass dark:glass-dark sticky top-0 z-30 h-12 md:h-14 flex items-center justify-between px-3 md:px-4">
        <div className="flex items-center">
          <button
            className="lg:hidden mr-3 p-1.5 rounded-lg hover:bg-black/5"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={18} />
          </button>
          <h1 className="text-base font-semibold text-gray-800 dark:text-white">{pageTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          {!isMember && <button onClick={() => setShowModal(true)} className="hidden sm:flex items-center px-3 py-1.5 bg-[#007AFF] text-white rounded-lg hover:bg-[#0066CC] transition-all duration-200 text-sm font-medium">
            <UserPlus size={14} className="mr-1.5" />
            <span className="hidden md:inline">Add</span>
          </button>}
          {!isMember && <button onClick={() => setShowVerifyModal(true)} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors" title="Verify Member">
            <Search size={16} className="text-gray-600 dark:text-gray-300" />
          </button>}
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun size={18} className="text-yellow-500" />
            ) : (
              <Moon size={18} className="text-gray-600 dark:text-gray-300" />
            )}
          </button>
          <div className="relative" ref={notificationRef}>
            <button onClick={() => setNotificationsOpen(!notificationsOpen)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 relative transition-colors">
              <Bell size={18} className="text-gray-600 dark:text-gray-300" />
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
              className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#007AFF] to-[#5856D6] flex items-center justify-center text-xs font-semibold text-white">
                {session?.user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="font-semibold text-sm text-gray-800 dark:text-white">{session?.user.name}</span>
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

              {isMember ? (
                <>
                  <Link href="/profile" className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 text-sm" onClick={() => setSidebarOpen(false)}>
                    <User size={18} /> <span>Profile</span>
                  </Link>
                  <Link href="/grievances" className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 text-sm" onClick={() => setSidebarOpen(false)}>
                    <AlertCircle size={18} /> <span>Grievances</span>
                  </Link>
                </>
              ) : (
                <>
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
                  <Link href="/payment-history" className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 text-sm" onClick={() => setSidebarOpen(false)}>
                    <Receipt size={18} /> <span>Payment History</span>
                  </Link>
                </>
              )}

              {(session?.user.role === 'Admin' || session?.user.role === 'Manager') && (
                <>
                  <Link href="/grievances" className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 text-sm" onClick={() => setSidebarOpen(false)}>
                    <AlertCircle size={18} /> <span>Grievances</span>
                  </Link>
                  <Link href="/admin/inventory" className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 text-sm" onClick={() => setSidebarOpen(false)}>
                    <Package size={18} /> <span>Inventory</span>
                  </Link>
                </>
              )}

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

      {showVerifyModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-lg w-full shadow-2xl min-h-[450px] rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search size={18} className="text-white" />
                <h3 className="text-base font-semibold text-white">Verify Member</h3>
              </div>
              <button onClick={() => { setShowVerifyModal(false); resetVerifyModal(); }} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/20">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4">
              {/* Search Input */}
              <div className="relative">
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={verifyMemberId || ''}
                      onChange={(e) => { setVerifyMemberId(e.target.value); setShowVerifyHints(true); }}
                      onFocus={() => setShowVerifyHints(true)}
                      onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                      placeholder="Enter Member ID, Email, Phone, or Name"
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                      autoFocus
                    />
                    {verifyHints.length > 0 && (
                      <div className="absolute z-10 w-full left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {verifyHints.map((hint, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setVerifyMemberId(hint.memberId);
                              setVerifyHints([]);
                              handleVerify();
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{hint.name}</p>
                                <p className="text-xs text-gray-500">ID: {hint.memberId}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-600">{hint.phone}</p>
                                <p className="text-xs text-gray-400 truncate max-w-[120px]">{hint.email}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => setShowQRScanner(true)}
                    className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors"
                    title="Scan QR Code"
                  >
                    <QrCode className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                  <button onClick={handleVerify} disabled={verifyLoading} className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 text-sm font-medium disabled:opacity-50 shadow-md">
                    {verifyLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : 'Verify'}
                  </button>
                </div>
              </div>

              {verifyError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-700">{verifyError}</p>
                </div>
              )}

              {verifyResult && (
                <div className={`rounded-xl overflow-hidden border-2 ${verifyResult.valid ? 'border-green-200' : 'border-red-200'}`}>
                  {/* Status Header */}
                  <div className={`px-4 py-3 ${verifyResult.valid ? 'bg-green-500' : 'bg-red-500'} flex items-center gap-2`}>
                    {verifyResult.valid ? <CheckCircle className="w-5 h-5 text-white" /> : <XCircle className="w-5 h-5 text-white" />}
                    <span className="text-white font-medium">{verifyResult.valid ? 'Valid Subscription' : verifyResult.message}</span>
                  </div>
                  
                  {verifyResult.member && (
                    <div className="bg-white p-4 space-y-4">
                      {/* Member Info */}
                      <div>
                        <p className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider mb-2">Member Information</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 p-2 rounded-lg">
                            <p className="text-[10px] text-gray-500">Name</p>
                            <p className="text-sm font-semibold text-gray-900">{verifyResult.member.name}</p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded-lg">
                            <p className="text-[10px] text-gray-500">Member ID</p>
                            <p className="text-sm font-mono font-semibold text-gray-900">{verifyResult.member.memberId}</p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded-lg">
                            <p className="text-[10px] text-gray-500">Phone</p>
                            <p className="text-xs text-gray-900">{verifyResult.member.phone}</p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded-lg">
                            <p className="text-[10px] text-gray-500">Email</p>
                            <p className="text-xs text-gray-900 truncate">{verifyResult.member.email}</p>
                          </div>
                        </div>
                      </div>

                      {/* Subscription Info */}
                      {verifyResult.subscription && (
                        <div>
                          <p className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider mb-2">Subscription Details</p>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-gray-50 p-2 rounded-lg">
                              <p className="text-[10px] text-gray-500">Status</p>
                              <p className={`text-xs font-semibold ${verifyResult.subscription.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                                {verifyResult.subscription.status.charAt(0).toUpperCase() + verifyResult.subscription.status.slice(1)}
                              </p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-lg">
                              <p className="text-[10px] text-gray-500">Location</p>
                              <p className="text-xs font-medium text-gray-900 truncate">{verifyResult.subscription.location?.name || 'N/A'}</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-lg">
                              <p className="text-[10px] text-gray-500">Seat</p>
                              <p className="text-xs font-medium text-gray-900">Seat {verifyResult.subscription.seat?.seatNumber || 'N/A'}</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-lg">
                              <p className="text-[10px] text-gray-500">Duration</p>
                              <p className="text-xs font-medium text-gray-900">{verifyResult.subscription.duration}</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-lg">
                              <p className="text-[10px] text-gray-500">Amount</p>
                              <p className="text-xs font-bold text-gray-900">₹{verifyResult.subscription.totalAmount?.toLocaleString('en-IN')}</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-lg">
                              <p className="text-[10px] text-gray-500">End Date</p>
                              <p className={`text-xs font-medium ${verifyResult.valid ? 'text-green-600' : 'text-red-600'}`}>
                                {new Date(verifyResult.subscription.endDate).toLocaleDateString('en-IN')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <QRScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScan}
      />
    </>
  );
}