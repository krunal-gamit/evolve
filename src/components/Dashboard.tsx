'use client';

import Header from './Header';
import Sidebar from './Sidebar';
import { DollarSign, Users, TrendingUp, BarChart3, Eye, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect, useMemo } from 'react';

export default function Dashboard() {

  const [members, setMembers] = useState<any[]>([]);
  const [seats, setSeats] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<'total' | 'thisMonth' | 'previousMonth'>('total');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

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
        const allPayments = subs.flatMap((sub: any) => sub.payments || []).sort((a: any, b: any) => +new Date(b.dateTime) - +new Date(a.dateTime));
        setPayments(allPayments);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

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

  // Current month revenue and expenses
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyRevenue = payments.filter(p => new Date(p.dateTime).toISOString().slice(0, 7) === currentMonth).reduce((sum, p) => sum + p.amount, 0);
  const monthlyExpenses = expenses.filter(e => new Date(e.date).toISOString().slice(0, 7) === currentMonth).reduce((sum, e) => sum + e.amount, 0);
  const netProfit = monthlyRevenue - monthlyExpenses;

  // Previous months revenue and expenses
  const previousRevenue = payments.filter(p => new Date(p.dateTime).toISOString().slice(0, 7) !== currentMonth).reduce((sum, p) => sum + p.amount, 0);
  const previousExpenses = expenses.filter(e => new Date(e.date).toISOString().slice(0, 7) !== currentMonth).reduce((sum, e) => sum + e.amount, 0);

  // Previous months options
  const previousMonthsOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      options.push({ value: monthStr, label });
    }
    return options;
  }, []);

  // Display values based on filter
  let displayRevenue = 0;
  let displayExpenses = 0;
  if (filterType === 'total') {
    displayRevenue = monthlyRevenue + previousRevenue;
    displayExpenses = monthlyExpenses + previousExpenses;
  } else if (filterType === 'thisMonth') {
    displayRevenue = monthlyRevenue;
    displayExpenses = monthlyExpenses;
  } else if (filterType === 'previousMonth' && selectedMonth) {
    displayRevenue = payments.filter(p => new Date(p.dateTime).toISOString().slice(0, 7) === selectedMonth).reduce((sum, p) => sum + p.amount, 0);
    displayExpenses = expenses.filter(e => new Date(e.date).toISOString().slice(0, 7) === selectedMonth).reduce((sum, e) => sum + e.amount, 0);
  }
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

  // Recent transactions
  const paymentTxns = payments.map(p => ({
    name: p.uniqueCode,
    date: new Date(p.dateTime),
    amount: `+₹${p.amount}`,
    type: 'payment'
  }));
  const expenseTxns = expenses.map(e => ({
    name: e.description,
    date: new Date(e.date),
    amount: `-₹${e.amount}`,
    type: 'expense'
  }));
  const allTxns = [...paymentTxns, ...expenseTxns].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 3);
  const transactions = allTxns.map(t => ({
    name: t.name,
    date: t.date.toLocaleDateString(),
    amount: t.amount
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

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header pageTitle="Dashboard" />
        <div className="flex-1 p-6 overflow-auto bg-gray-50">

        {/* Filter */}
        <div className="mb-6 flex space-x-2 items-center">
          <button
            onClick={() => setFilterType('total')}
            className={`px-4 py-2 rounded-lg font-medium ${filterType === 'total' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Total
          </button>
          <button
            onClick={() => setFilterType('thisMonth')}
            className={`px-4 py-2 rounded-lg font-medium ${filterType === 'thisMonth' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            This Month
          </button>
          <button
            onClick={() => setFilterType('previousMonth')}
            className={`px-4 py-2 rounded-lg font-medium ${filterType === 'previousMonth' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Previous Months
          </button>
          {filterType === 'previousMonth' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border rounded-lg ml-2"
            >
              <option value="">Select Month</option>
              {previousMonthsOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenue</p>
                <p className="text-2xl font-semibold">₹{displayRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Occupancy</p>
                <p className="text-2xl font-semibold">{occupancyRate}%</p>
                <p className="text-xs text-gray-500">{occupiedSeats}/{totalSeats} Seats</p>
                <p className="text-xs text-green-600">+3 this week</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Members</p>
                <p className="text-2xl font-semibold">{activeMembers}</p>
                <p className="text-xs text-red-600">-₹500 vs last m</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expenses</p>
                <p className="text-2xl font-semibold">₹{displayExpenses.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Profit</p>
                <p className="text-2xl font-semibold">₹{displayProfit.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Revenue & Expenses Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
          <h2 className="text-xl font-light mb-4">Revenue & Expenses</h2>
          <p className="text-sm text-gray-600 mb-4">Last 6 Months</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Student Exam Focus */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-light mb-4">Student Exam Focus</h2>
            <div className="space-y-2">
              {examData.map((exam, index) => (
                <div key={exam.prep}>
                  <div className="flex items-center justify-between">
                    <span>{exam.prep}</span>
                    <span className="text-sm text-gray-500">{exam.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${exam.percentage}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-light">Recent Transactions</h2>
              <button className="text-blue-600 hover:text-blue-800 flex items-center">
                <Eye className="h-4 w-4 mr-1" />
                View All
              </button>
            </div>
            <div className="space-y-3">
              {transactions.map((tx, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{tx.name}</p>
                    <p className="text-sm text-gray-500">{tx.date}</p>
                  </div>
                  <span className={`font-semibold ${tx.amount.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {/* Occupancy Heatmap */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-light mb-4">Occupancy Heatmap</h2>
            <div className="grid grid-cols-8 gap-1">
              {seats.map(seat => (
                <div
                  key={seat._id}
                  className={`w-6 h-6 rounded ${seat.status === 'occupied' ? 'bg-red-200' : 'bg-green-200'}`}
                  title={seat.status === 'occupied' ? 'Occupied' : 'Vacant'}
                ></div>
              ))}
            </div>
            <div className="flex items-center mt-4 space-x-4">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-200 rounded mr-2"></div>
                <span className="text-sm">Vac</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-200 rounded mr-2"></div>
                <span className="text-sm">Occ</span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}