'use client';

import { useState, useEffect } from 'react';

interface Member {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export default function MemberManagement() {
  const [members, setMembers] = useState<Member[]>([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const res = await fetch('/api/members');
    const data = await res.json();
    setMembers(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ name: '', email: '', phone: '', address: '' });
      fetchMembers();
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Member Management</h1>
      <form onSubmit={handleSubmit} className="mb-4">
        <input
          type="text"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          className="border p-2 mr-2"
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          className="border p-2 mr-2"
        />
        <input
          type="text"
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="border p-2 mr-2"
        />
        <input
          type="text"
          placeholder="Address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="border p-2 mr-2"
        />
        <button type="submit" className="p-2 bg-blue-500 text-white">Add Member</button>
      </form>
      <ul>
        {members.map(member => (
          <li key={member._id} className="border p-2 mb-2">
            {member.name} - {member.email}
          </li>
        ))}
      </ul>
      <a href="/" className="p-2 bg-gray-500 text-white rounded">Back to Dashboard</a>
    </div>
  );
}