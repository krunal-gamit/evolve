'use client';

import { useState, useEffect } from 'react';

interface Member {
  _id: string;
  name: string;
  email: string;
}

interface Subscription {
  _id: string;
  member: { name: string; email: string };
  seat: { seatNumber: number };
  startDate: string;
  endDate: string;
  duration: string;
  totalAmount: number;
  status: string;
  payments: any[];
}

export default function SubscriptionManagement() {
  const [members, setMembers] = useState<Member[]>([]);
  const [seats, setSeats] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [form, setForm] = useState({
    memberId: '',
    seatNumber: '',
    startDate: '',
    duration: '',
    amount: '',
    paymentMethod: 'cash',
    upiCode: '',
    dateTime: '',
  });

  useEffect(() => {
    fetchMembers();
    fetchSeats();
    fetchSubscriptions();
  }, []);

  const fetchMembers = async () => {
    const res = await fetch('/api/members');
    const data = await res.json();
    setMembers(data);
  };

  const fetchSeats = async () => {
    const res = await fetch('/api/seats');
    const data = await res.json();
    setSeats(data);
  };

  const fetchSubscriptions = async () => {
    const res = await fetch('/api/subscriptions');
    const data = await res.json();
    setSubscriptions(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        seatNumber: parseInt(form.seatNumber),
        amount: parseFloat(form.amount),
      }),
    });
    const result = await res.json();
    alert(result.message || 'Subscription created');
    fetchSubscriptions();
    fetchSeats();
  };

  const endSubscription = async (id: string) => {
    await fetch(`/api/subscriptions/${id}`, { method: 'PUT' });
    fetchSubscriptions();
    fetchSeats();
  };

  const vacantSeats = seats.filter(s => s.status === 'vacant');

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Subscription Management</h1>
      <form onSubmit={handleSubmit} className="mb-4 grid grid-cols-2 gap-2">
        <select
          value={form.memberId}
          onChange={(e) => setForm({ ...form, memberId: e.target.value })}
          required
          className="border p-2"
        >
          <option value="">Select Member</option>
          {members.map(member => (
            <option key={member._id} value={member._id}>{member.name}</option>
          ))}
        </select>
        <select
          value={form.seatNumber}
          onChange={(e) => setForm({ ...form, seatNumber: e.target.value })}
          required
          className="border p-2"
        >
          <option value="">Select Seat</option>
          {vacantSeats.map(seat => (
            <option key={seat._id} value={seat.seatNumber}>{seat.seatNumber}</option>
          ))}
        </select>
        <input
          type="date"
          value={form.startDate}
          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          required
          className="border p-2"
        />
        <input
          type="text"
          placeholder="Duration (e.g., 30 days)"
          value={form.duration}
          onChange={(e) => setForm({ ...form, duration: e.target.value })}
          required
          className="border p-2"
        />
        <input
          type="number"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
          className="border p-2"
        />
        <select
          value={form.paymentMethod}
          onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
          className="border p-2"
        >
          <option value="cash">Cash</option>
          <option value="UPI">UPI</option>
        </select>
        {form.paymentMethod === 'UPI' && (
          <input
            type="text"
            placeholder="UPI Code"
            value={form.upiCode}
            onChange={(e) => setForm({ ...form, upiCode: e.target.value })}
            className="border p-2"
          />
        )}
        <input
          type="datetime-local"
          value={form.dateTime}
          onChange={(e) => setForm({ ...form, dateTime: e.target.value })}
          required
          className="border p-2"
        />
        <button type="submit" className="p-2 bg-blue-500 text-white col-span-2">Create Subscription</button>
      </form>
      <h2 className="text-xl mb-2">Active Subscriptions</h2>
      <ul>
        {subscriptions.filter(s => s.status === 'active').map(sub => (
          <li key={sub._id} className="border p-2 mb-2 flex justify-between">
            <div>
              {sub.member.name} - Seat {sub.seat.seatNumber} - Ends {new Date(sub.endDate).toLocaleDateString()}
            </div>
            <button onClick={() => endSubscription(sub._id)} className="p-1 bg-red-500 text-white">End</button>
          </li>
        ))}
      </ul>
      <a href="/" className="p-2 bg-gray-500 text-white rounded">Back to Dashboard</a>
    </div>
  );
}