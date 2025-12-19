'use client';

import { useState, useEffect } from 'react';

interface Subscription {
  _id: string;
  member: { name: string };
  seat: { seatNumber: number };
  totalAmount: number;
  payments: { amount: number; method: string; dateTime: string }[];
}

export default function Reports() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    const res = await fetch('/api/subscriptions');
    const data = await res.json();
    setSubscriptions(data);
  };

  const totalRevenue = subscriptions.reduce((sum, sub) => sum + sub.totalAmount, 0);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Reports</h1>
      <p className="mb-4">Total Revenue: ₹{totalRevenue}</p>
      <h2 className="text-xl mb-2">All Subscriptions and Payments</h2>
      <ul>
        {subscriptions.map(sub => (
          <li key={sub._id} className="border p-2 mb-2">
            <div>{sub.member.name} - Seat {sub.seat.seatNumber} - ₹{sub.totalAmount}</div>
            <ul>
              {sub.payments.map((pay, i) => (
                <li key={i} className="ml-4">
                  {pay.method} - ₹{pay.amount} on {new Date(pay.dateTime).toLocaleString()}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <a href="/" className="p-2 bg-gray-500 text-white rounded">Back to Dashboard</a>
    </div>
  );
}