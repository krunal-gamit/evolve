'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { Toaster } from 'react-hot-toast';
import { IndianRupee, Users, TrendingUp, BarChart3, Eye, Clock, ArrowUpRight, ArrowDownRight, Wallet, Activity, CreditCard } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isMember = session?.user.role === 'Member';
  const isAdmin = session?.user.role === 'Admin';
  const managerLocations = session?.user.locations as string[] | undefined;

  const [members, setMembers] = useState<any[]>([]);
  const [seats, setSeats] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [filterType, setFilterType] = useState<'total' | 'thisMonth' | 'previousMonth'>('total');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [isLocationLocked, setIsLocationLocked] = useState(false);

  useEffect(() => {
    if (status === 'loading') return; // Still loading
    if (!session) {
      router.push('/auth/signin');
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const promises = [
          fetch('/api/members'),
          fetch('/api/seats'),
          fetch('/api/subscriptions'),
          fetch('/api/locations'),
        ];
        if (!isMember) {
          promises.push(fetch('/api/expenses'));
        }
        const [membersRes, seatsRes, subsRes, locationsRes, expensesRes] = await Promise.all(promises);
        const m = await membersRes.json();
        const s = await seatsRes.json();
        const subs = await subsRes.json();
        const locs = await locationsRes.json();
        let exp = [];
        if (!isMember && expensesRes) {
          if (expensesRes.ok) {
            exp = await expensesRes.json();
          }
        }
        setMembers(Array.isArray(m) ? m : []);
        setSeats(Array.isArray(s) ? s : []);
        setSubscriptions(Array.isArray(subs) ? subs : []);
        setLocations(locs || []);
        setExpenses(exp);
        
        // Auto-select location for managers with single specific location (not for all locations)
        if (managerLocations && managerLocations.length > 0 && managerLocations.length < locations.length) {
          if (managerLocations.length === 1) {
            setSelectedLocation(managerLocations[0]);
          }
          setIsLocationLocked(true);
        }
        
        // Extract and sort payments
        const allPayments = (Array.isArray(subs) ? subs : []).flatMap((sub: any) =>
          (sub.payments || []).map((p: any) => ({ ...p, memberName: sub.member?.name || 'Unknown Member' }))
        ).sort((a: any, b: any) => +new Date(b.dateTime) - +new Date(a.dateTime));
        setPayments(allPayments);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    if (session) fetchData();
  }, [session, managerLocations]);

  useEffect(() => {
    if (filterType === 'previousMonth' && !selectedMonth) {
      const now = new Date();
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      setSelectedMonth(d.toISOString().slice(0, 7));
    }
  }, [filterType, selectedMonth]);

  // Calculate metrics
  const totalSeats = seats.length;
  const occupiedSeats = seats.filter(seat => seat.status === 'occupied').length;
  const occupancyRate = totalSeats > 0 ? ((occupiedSeats / totalSeats) * 100).toFixed(1) : '0.0';
  const activeMembers = members.length; // Assuming all are active

  // Filter seats by selected location
  const filteredSeats = useMemo(() => {
    if (!selectedLocation) return seats;
    return seats.filter((seat: any) => seat.location?._id === selectedLocation || seat.location === selectedLocation);
  }, [seats, selectedLocation]);

  // Filter members by selected location (based on their subscriptions)
  const filteredMembers = useMemo(() => {
    if (!selectedLocation) return members;
    // Members who have subscriptions at the selected location
    const memberIdsAtLocation = subscriptions
      .filter((sub: any) => sub.location?._id === selectedLocation || sub.location === selectedLocation)
      .map((sub: any) => sub.member?._id || sub.member);
    return members.filter((m: any) => memberIdsAtLocation.includes(m._id));
  }, [members, subscriptions, selectedLocation]);

  const filteredTotalSeats = filteredSeats.length;
  const filteredOccupiedSeats = filteredSeats.filter((seat: any) => seat.status === 'occupied').length;
  const filteredOccupancyRate = filteredTotalSeats > 0 ? ((filteredOccupiedSeats / filteredTotalSeats) * 100).toFixed(1) : '0.0';

  // Filtered Data based on selection
  const { filteredPayments, filteredExpenses } = useMemo(() => {
    const currentMonth = new Date().toLocaleDateString('en-CA').slice(0, 7);
    
    // Filter payments by location
    let locationFilteredPayments = payments;
    if (selectedLocation) {
      locationFilteredPayments = payments.filter((p: any) => {
        // Need to check if payment belongs to subscription at selected location
        const sub = subscriptions.find((s: any) => s.payments?.some((pay: any) => pay._id === p._id));
        return sub?.location?._id === selectedLocation || sub?.location === selectedLocation;
      });
    }
    
    // Filter expenses by location
    let locationFilteredExpenses = expenses;
    if (selectedLocation) {
      locationFilteredExpenses = expenses.filter((e: any) => 
        e.location?._id === selectedLocation || e.location === selectedLocation
      );
    }
    
    if (filterType === 'thisMonth') {
      return {
        filteredPayments: locationFilteredPayments.filter(p => new Date(p.dateTime).toLocaleDateString('en-CA').slice(0, 7) === currentMonth),
        filteredExpenses: locationFilteredExpenses.filter(e => new Date(e.date).toLocaleDateString('en-CA').slice(0, 7) === currentMonth)
      };
    } else if (filterType === 'previousMonth' && selectedMonth) {
      return {
        filteredPayments: locationFilteredPayments.filter(p => new Date(p.dateTime).toLocaleDateString('en-CA').slice(0, 7) === selectedMonth),
        filteredExpenses: locationFilteredExpenses.filter(e => new Date(e.date).toLocaleDateString('en-CA').slice(0, 7) === selectedMonth)
      };
    }
    return { filteredPayments: locationFilteredPayments, filteredExpenses: locationFilteredExpenses };
  }, [payments, expenses, subscriptions, filterType, selectedMonth, selectedLocation]);

  // Previous months options
  const previousMonthsOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toLocaleDateString('en-CA').slice(0, 7);
      const label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      options.push({ value: monthStr, label });
    }
    return options;
  }, []);

  // Display values based on filter
  const displayRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const displayExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const displayProfit = displayRevenue - displayExpenses;

  // Revenue chart data (last 6 months)
  const revenueData = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 4; i >= -1; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7));
    }
    return months.map(month => {
      // Filter payments by location first
      let locationFilteredPayments = payments;
      if (selectedLocation) {
        locationFilteredPayments = payments.filter((p: any) => {
          const sub = subscriptions.find((s: any) => s.payments?.some((pay: any) => pay._id === p._id));
          return sub?.location?._id === selectedLocation || sub?.location === selectedLocation;
        });
      }
      // Filter expenses by location first
      let locationFilteredExpenses = expenses;
      if (selectedLocation) {
        locationFilteredExpenses = expenses.filter((e: any) => 
          e.location?._id === selectedLocation || e.location === selectedLocation
        );
      }
      const rev = locationFilteredPayments.filter(p => new Date(p.dateTime).toISOString().slice(0, 7) === month).reduce((sum, p) => sum + p.amount, 0);
      const exp = locationFilteredExpenses.filter(e => new Date(e.date).toISOString().slice(0, 7) === month).reduce((sum, e) => sum + e.amount, 0);
      return { month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }), revenue: rev, expenses: exp };
    });
  }, [payments, expenses, subscriptions, selectedLocation]);

  // Expense Categories Data
  const expenseCategoryData = useMemo(() => {
    const counts: {[key: string]: number} = {};
    filteredExpenses.forEach(e => {
      const category = e.category || 'Other';
      counts[category] = (counts[category] || 0) + e.amount;
    });
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

  // Recent transactions
  const paymentTxns = filteredPayments.map(p => ({
    name: p.memberName || 'Payment',
    date: new Date(p.dateTime),
    amount: `+₹${p.amount}`,
    type: 'payment',
    detail: 'Subscription'
  }));
  const expenseTxns = filteredExpenses.map(e => ({
    name: e.description,
    date: new Date(e.date),
    amount: `-₹${e.amount}`,
    type: 'expense',
    detail: e.category
  }));
  const allTxns = [...paymentTxns, ...expenseTxns].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 50);
  const transactions = allTxns.map(t => ({
    name: t.name,
    date: t.date.toLocaleDateString('en-GB'),
    amount: t.amount,
    detail: t.detail
  }));

  // Exam preparation distribution
  const examCounts: {[key: string]: number} = {};
  filteredMembers.forEach(m => {
    const prep = m.examPrep || 'Other';
    examCounts[prep] = (examCounts[prep] || 0) + 1;
  });
  const totalExams = filteredMembers.length;
  const examData = Object.entries(examCounts).map(([prep, count]: [string, number]) => ({
    prep,
    percentage: totalExams > 0 ? Math.round((count / totalExams) * 100) : 0
  }));

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    return null; // Redirecting
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header pageTitle="Dashboard" />
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#F2F2F7] via-[#E8E8ED] to-[#F2F2F7]">
        <style jsx global>{`
          /* For Webkit-based browsers (Chrome, Safari) */
          ::-webkit-scrollbar { width: 8px; height: 8px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb {
            background-color: rgba(156, 163, 175, 0.5);
            border-radius: 10px;
            border: 2px solid transparent;
            background-clip: content-box;
          }
          ::-webkit-scrollbar-thumb:hover { background-color: rgba(107, 114, 128, 0.8); }
          /* For Firefox */
          * {
            scrollbar-width: thin;
            scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
          }
        `}</style>
        <div className="p-4 sm:p-5">
        {isMember ? (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800">Seat Map</h2>
              <p className="text-gray-500 text-xs mt-0.5">View current seat availability.</p>
            </div>
            <div className="ios-card-glass p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Occupancy</h2>
              </div>
              {!selectedLocation ? (
                // Show all locations grouped
                locations.filter(loc => loc._id).map(location => {
                  const locationSeats = filteredSeats.filter((s: any) => s.location?._id === location._id || s.location === location._id);
                  if (locationSeats.length === 0) return null;
                  return (
                    <div key={location._id} className="mb-4">
                      <h4 className="text-xs font-medium text-gray-600 mb-2">{location.name}</h4>
                      <div className="grid grid-cols-[repeat(10,minmax(0,1fr))] gap-1">
                        {locationSeats.map((seat: any) => (
                          <div
                            key={seat._id}
                            className={`aspect-square rounded-sm transition-all duration-200 ${
                              seat.status === 'occupied' 
                                ? 'bg-[#FF3B30]' 
                                : 'bg-[#34C759]'
                            }`}
                            title={seat.status === 'occupied' ? 'Occupied' : 'Vacant'}
                          ></div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                // Show single location
                <div className="grid grid-cols-[repeat(10,minmax(0,1fr))] gap-1">
                  {filteredSeats.map((seat: any) => (
                    <div
                      key={seat._id}
                      className={`aspect-square rounded-sm transition-all duration-200 ${
                        seat.status === 'occupied' 
                          ? 'bg-[#FF3B30]' 
                          : 'bg-[#34C759]'
                      }`}
                      title={seat.status === 'occupied' ? 'Occupied' : 'Vacant'}
                    ></div>
                  ))}
                </div>
              )}
              <div className="flex items-center mt-4 gap-4">
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 bg-[#34C759] rounded-full mr-1.5"></div>
                  <span className="text-xs text-gray-600">Vacant ({filteredTotalSeats - filteredOccupiedSeats})</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 bg-[#FF3B30] rounded-full mr-1.5"></div>
                  <span className="text-xs text-gray-600">Occupied ({filteredOccupiedSeats}/{filteredTotalSeats})</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Header Section - iOS Style */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Overview</h2>
                <p className="text-gray-500 text-xs mt-0.5">Track your reading room.</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Location Filter - Shows all locations for admins, and for managers with all locations or multiple specific locations */}
              {!isMember && locations.length > 1 && (isAdmin || !managerLocations || managerLocations.length === 0 || managerLocations.length > 1) && (
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Locations</option>
                    {locations
                      .filter((loc: any) => isAdmin || !managerLocations || managerLocations.length === 0 || managerLocations.includes(loc._id))
                      .map((loc: any) => (
                        <option key={loc._id} value={loc._id}>{loc.name}</option>
                    ))}
                  </select>
                )}
                <div className="flex items-center glass rounded-xl p-1">
              <button
                onClick={() => setFilterType('total')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterType === 'total' ? 'bg-[#007AFF] text-white' : 'text-gray-600 hover:bg-white/50'}`}
              >
                Total
              </button>
              <button
                onClick={() => setFilterType('thisMonth')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterType === 'thisMonth' ? 'bg-[#007AFF] text-white' : 'text-gray-600 hover:bg-white/50'}`}
              >
                This Month
              </button>
              <div className="relative">
                <select
                  value={filterType === 'previousMonth' ? selectedMonth : ""}
                  onChange={(e) => {
                    setFilterType('previousMonth');
                    setSelectedMonth(e.target.value);
                  }}
                  style={{ 
                    color: filterType === 'previousMonth' && selectedMonth ? '#1f2937' : '#4b5563'
                  }}
                  className="px-3 py-1.5 pr-6 rounded-lg text-xs font-medium transition-all outline-none cursor-pointer appearance-none bg-transparent"
                >
                  <option value="" disabled style={{ color: '#6b7280' }}>Previous</option>
                  {previousMonthsOptions.map(option => (
                    <option key={option.value} value={option.value} style={{ color: '#1f2937', backgroundColor: '#ffffff' }}>{option.label}</option>
                  ))}
                </select>
                <svg className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 pointer-events-none text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              </div>
              </div>
            </div>

            {/* Cards - iOS Style with Glassmorphism */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {/* Revenue Card */}
          <div className="ios-card-glass p-4 transition-transform hover:scale-[1.02]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500">Revenue</p>
                <h3 className="text-lg font-bold text-gray-900 mt-1">₹{displayRevenue.toLocaleString()}</h3>
              </div>
              <div className="p-2 bg-emerald-100/70 rounded-lg">
                <IndianRupee className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Occupancy Card */}
          <div className="ios-card-glass p-4 transition-transform hover:scale-[1.02]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500">Occupancy</p>
                <h3 className="text-lg font-bold text-gray-900 mt-1">{filteredOccupancyRate}%</h3>
                <p className="text-xs text-gray-400 mt-0.5">{filteredOccupiedSeats}/{filteredTotalSeats}</p>
              </div>
              <div className="p-2 bg-blue-100/70 rounded-lg">
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Expenses Card */}
          <div className="ios-card-glass p-4 transition-transform hover:scale-[1.02]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500">Expenses</p>
                <h3 className="text-lg font-bold text-gray-900 mt-1">₹{displayExpenses.toLocaleString()}</h3>
              </div>
              <div className="p-2 bg-rose-100/70 rounded-lg">
                <CreditCard className="h-4 w-4 text-rose-600" />
              </div>
            </div>
          </div>

          {/* Profit Card */}
          <div className="ios-card-glass p-4 transition-transform hover:scale-[1.02]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500">Profit</p>
                <h3 className="text-lg font-bold text-gray-900 mt-1">₹{displayProfit.toLocaleString()}</h3>
              </div>
              <div className="p-2 bg-amber-100/70 rounded-lg">
                <Wallet className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          {/* Revenue & Expenses Chart - Glassmorphism */}
          <div className="ios-card-glass p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Financial Overview</h2>
              <p className="text-xs text-gray-500">Last 6 Months</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip
                formatter={(value: number | undefined, name: string | undefined) => value !== undefined ? [`₹${value.toLocaleString('en-IN')}`, (name || '').charAt(0).toUpperCase() + (name || '').slice(1)] : ['', '']}
                contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                itemStyle={{ fontSize: '12px', fontWeight: 500 }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
              <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpenses)" name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
          </div>

          {/* Occupancy Heatmap - iOS Style Glassmorphism */}
          <div className="ios-card-glass p-4 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Occupancy</h2>
            </div>
            {!selectedLocation ? (
              // Show all locations grouped
              locations.filter(loc => loc._id).map(location => {
                const locationSeats = filteredSeats.filter((s: any) => s.location?._id === location._id || s.location === location._id);
                if (locationSeats.length === 0) return null;
                return (
                  <div key={location._id} className="mb-3">
                    <h4 className="text-xs font-medium text-gray-600 mb-1.5">{location.name}</h4>
                    <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-px">
                      {locationSeats.map((seat: any) => (
                        <div
                          key={seat._id}
                          className={`aspect-square rounded-sm ${
                            seat.status === 'occupied' 
                              ? 'bg-[#FF3B30]' 
                              : 'bg-[#34C759]'
                          }`}
                          title={seat.status === 'occupied' ? 'Occupied' : 'Vacant'}
                        ></div>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              // Show single location
              <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-px">
                {filteredSeats.map((seat: any) => (
                  <div
                    key={seat._id}
                    className={`aspect-square rounded-sm ${
                      seat.status === 'occupied' 
                        ? 'bg-[#FF3B30]' 
                        : 'bg-[#34C759]'
                    }`}
                    title={seat.status === 'occupied' ? 'Occupied' : 'Vacant'}
                  ></div>
                ))}
              </div>
            )}
            <div className="flex items-center mt-3 gap-3">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-[#34C759] rounded-full mr-1"></div>
                <span className="text-xs text-gray-500">Vacant ({filteredTotalSeats - filteredOccupiedSeats})</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-[#FF3B30] rounded-full mr-1"></div>
                <span className="text-xs text-gray-500">Occupied ({filteredOccupiedSeats}/{filteredTotalSeats})</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          {/* Expense Categories Chart - Glassmorphism */}
          <div className="ios-card-glass p-4 flex flex-col min-h-[320px]">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Expense Categories</h2>
            <div className="flex-1 w-full min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenseCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number | undefined) => value !== undefined ? `₹${value.toLocaleString('en-IN')}` : ''} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Latest Subscriptions - Glassmorphism */}
          <div className="ios-card-glass p-4 flex flex-col min-h-[320px]">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Latest Subscriptions</h2>
            <div className="flex-1 overflow-auto">
              {subscriptions
                .filter((sub: any) => !selectedLocation || sub.location?._id === selectedLocation || sub.location === selectedLocation)
                .sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                .slice(0, 5)
                .map((sub: any) => (
                  <div key={sub._id} className="py-2.5 border-b border-gray-100 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-7 h-7 rounded-full bg-[#007AFF] flex items-center justify-center text-white text-xs font-semibold mr-2">
                          {sub.member?.name?.charAt(0).toUpperCase() || 'M'}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-900">{sub.member?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{sub.location?.name || 'N/A'} • Seat {sub.seat?.seatNumber || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">{sub.startDate ? new Date(sub.startDate).toLocaleDateString('en-GB') : '-'}</p>
                        <p className="text-xs text-gray-400">to {sub.endDate ? new Date(sub.endDate).toLocaleDateString('en-GB') : '-'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              {subscriptions.filter((sub: any) => !selectedLocation || sub.location?._id === selectedLocation || sub.location === selectedLocation).length === 0 && (
                <p className="text-xs text-gray-500 text-center py-4">No subscriptions yet</p>
              )}
            </div>
          </div>

          {/* Top Expenses Breakdown */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[320px]">
             <h2 className="text-base font-bold text-gray-900 mb-4">Top Expenses</h2>
             <div className="space-y-3 overflow-y-auto flex-1 pr-2 min-h-0">
                {expenseCategoryData.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="font-medium text-gray-700 text-sm">{category.name}</span>
                    </div>
                    <span className="font-bold text-gray-900 text-sm">₹{category.value.toLocaleString()}</span>
                  </div>
                ))}
                {expenseCategoryData.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No expenses found for this period.</p>
                )}
             </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[320px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Transactions</h2>
              <Link href="/reports" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center transition-colors">
                <Eye className="h-4 w-4 mr-1" />
                View
              </Link>
            </div>
            <div className="space-y-3 overflow-y-auto flex-1 pr-2 min-h-0" style={{ maxHeight: '250px' }}>
              {transactions.map((tx, index) => (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${tx.amount.startsWith('+') ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {tx.amount.startsWith('+') ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{tx.name}</p>
                      <p className="text-xs text-gray-500">{tx.detail} • {tx.date}</p>
                    </div>
                  </div>
                  <span className={`font-bold text-sm ${tx.amount.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Student Exam Focus */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[320px]">
            <h2 className="text-base font-bold text-gray-900 mb-4">Exam Focus</h2>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 min-h-0" style={{ maxHeight: '250px' }}>
              {examData.map((exam, index) => (
                <div key={exam.prep}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{exam.prep}</span>
                    <span className="text-sm font-bold text-gray-900">{exam.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 mt-2 overflow-hidden">
                    <div 
                      className={`h-2.5 rounded-full ${
                        index % 4 === 0 ? 'bg-blue-500' : 
                        index % 4 === 1 ? 'bg-purple-500' : 
                        index % 4 === 2 ? 'bg-pink-500' : 'bg-orange-500'
                      }`} 
                      style={{ width: `${exam.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
          </>
        )}
        </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}