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

  const [members, setMembers] = useState<any[]>([]);
  const [seats, setSeats] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<'total' | 'thisMonth' | 'previousMonth'>('total');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

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
        const [membersRes, seatsRes, subsRes, expensesRes] = await Promise.all([
          fetch('/api/members'),
          fetch('/api/seats'),
          fetch('/api/subscriptions'),
          fetch('/api/expenses')
        ]);
        const m = await membersRes.json();
        const s = await seatsRes.json();
        const subs = await subsRes.json();
        const exp = await expensesRes.json();
        setMembers(m);
        setSeats(s);
        setSubscriptions(subs);
        setExpenses(exp);
        // Extract and sort payments
        const allPayments = subs.flatMap((sub: any) =>
          (sub.payments || []).map((p: any) => ({ ...p, memberName: sub.member?.name || 'Unknown Member' }))
        ).sort((a: any, b: any) => +new Date(b.dateTime) - +new Date(a.dateTime));
        setPayments(allPayments);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    if (session) fetchData();
  }, [session]);

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

  // Filtered Data based on selection
  const { filteredPayments, filteredExpenses } = useMemo(() => {
    const currentMonth = new Date().toLocaleDateString('en-CA').slice(0, 7);
    if (filterType === 'thisMonth') {
      return {
        filteredPayments: payments.filter(p => new Date(p.dateTime).toLocaleDateString('en-CA').slice(0, 7) === currentMonth),
        filteredExpenses: expenses.filter(e => new Date(e.date).toLocaleDateString('en-CA').slice(0, 7) === currentMonth)
      };
    } else if (filterType === 'previousMonth' && selectedMonth) {
      return {
        filteredPayments: payments.filter(p => new Date(p.dateTime).toLocaleDateString('en-CA').slice(0, 7) === selectedMonth),
        filteredExpenses: expenses.filter(e => new Date(e.date).toLocaleDateString('en-CA').slice(0, 7) === selectedMonth)
      };
    }
    return { filteredPayments: payments, filteredExpenses: expenses };
  }, [payments, expenses, filterType, selectedMonth]);

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
      const rev = payments.filter(p => new Date(p.dateTime).toISOString().slice(0, 7) === month).reduce((sum, p) => sum + p.amount, 0);
      const exp = expenses.filter(e => new Date(e.date).toISOString().slice(0, 7) === month).reduce((sum, e) => sum + e.amount, 0);
      return { month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }), revenue: rev, expenses: exp };
    });
  }, [payments, expenses]);

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
    date: t.date.toLocaleDateString(),
    amount: t.amount,
    detail: t.detail
  }));

  // Exam preparation distribution
  const examCounts: {[key: string]: number} = {};
  members.forEach(m => {
    const prep = m.examPrep || 'Other';
    examCounts[prep] = (examCounts[prep] || 0) + 1;
  });
  const totalExams = members.length;
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
        <main className="flex-1 overflow-y-auto bg-gray-50/50">
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
        <div className="p-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Overview</h2>
            <p className="text-gray-500 text-sm mt-1">Track your reading room performance.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center bg-gradient-to-r from-gray-50 to-gray-100 p-2 rounded-2xl border border-gray-200/60 shadow-sm">
          <button
            onClick={() => setFilterType('total')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterType === 'total' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Total
          </button>
          <button
            onClick={() => setFilterType('thisMonth')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterType === 'thisMonth' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
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
              className={`px-4 py-2 pr-8 rounded-lg text-sm font-medium transition-all outline-none cursor-pointer appearance-none ${
                filterType === 'previousMonth' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50 bg-transparent'
              }`}
            >
              <option value="" disabled>Previous Months</option>
              {previousMonthsOptions.map(option => (
                <option key={option.value} value={option.value} className="text-gray-900 bg-white hover:bg-gray-100">{option.label}</option>
              ))}
            </select>
            <svg className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          {/* Revenue Card */}
          <div className="bg-white p-5 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 transition-transform hover:-translate-y-1">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Revenue</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">₹{displayRevenue.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl">
                <IndianRupee className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Occupancy Card */}
          <div className="bg-white p-5 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 transition-transform hover:-translate-y-1">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Occupancy</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{occupancyRate}%</h3>
                <p className="text-xs text-gray-500 mt-1">{occupiedSeats}/{totalSeats} Seats</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Active Members Card */}
          <div className="bg-white p-5 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 transition-transform hover:-translate-y-1">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Members</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{activeMembers}</h3>
              </div>
              <div className="p-3 bg-violet-50 rounded-xl">
                <Users className="h-6 w-6 text-violet-600" />
              </div>
            </div>
          </div>

          {/* Expenses Card */}
          <div className="bg-white p-5 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 transition-transform hover:-translate-y-1">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Expenses</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">₹{displayExpenses.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl">
                <CreditCard className="h-6 w-6 text-rose-600" />
              </div>
            </div>
          </div>

          {/* Profit Card */}
          <div className="bg-white p-5 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 transition-transform hover:-translate-y-1">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Profit</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">₹{displayProfit.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl">
                <Wallet className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue & Expenses Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Financial Overview</h2>
              <p className="text-sm text-gray-500">Revenue vs Expenses (Last 6 Months)</p>
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

          {/* Occupancy Heatmap */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Occupancy Heatmap</h2>
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
              {seats.map(seat => (
                <div
                  key={seat._id}
                  className={`aspect-square rounded-md transition-all duration-300 hover:scale-110 cursor-pointer ${
                    seat.status === 'occupied' 
                      ? 'bg-red-500 shadow-sm shadow-red-200' 
                      : 'bg-emerald-400 shadow-sm shadow-emerald-200'
                  }`}
                  title={seat.status === 'occupied' ? 'Occupied' : 'Vacant'}
                ></div>
              ))}
            </div>
            <div className="flex items-center mt-6 space-x-6">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-emerald-400 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600 font-medium">Vacant</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600 font-medium">Occupied</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
          {/* Expense Categories Chart */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
            <h2 className="text-base font-bold text-gray-900 mb-4">Expense Categories</h2>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenseCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number | undefined) => value !== undefined ? `₹${value.toLocaleString('en-IN')}` : ''} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Expenses Breakdown */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
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

          {/* Student Exam Focus */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
            <h2 className="text-base font-bold text-gray-900 mb-4">Exam Focus</h2>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 min-h-0">
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

          {/* Recent Transactions */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Transactions</h2>
              <Link href="/reports" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center transition-colors">
                <Eye className="h-4 w-4 mr-1" />
                View
              </Link>
            </div>
            <div className="space-y-3 overflow-y-auto flex-1 pr-2 min-h-0">
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
        </div>
        </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}