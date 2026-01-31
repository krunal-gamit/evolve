'use client';

import Link from 'next/link';
import { Home, Users, CreditCard, BarChart3, MapPin, IndianRupee, BookOpen, User, UserCheck, ClipboardList, Settings } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function Sidebar() {
  const { data: session } = useSession();
  const [projectName, setProjectName] = useState('Evolve');

  useEffect(() => {
    if (session?.user.role === 'Admin') {
      fetchSettings();
    }
  }, [session]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setProjectName(data.projectName || 'Evolve');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };
  return (
    <div className="hidden md:flex flex-col w-64 bg-gray-900 text-white h-full border-r border-gray-800 shadow-xl">
      <div className="p-6 flex items-center space-x-3 border-b border-gray-800">
        <div className="bg-blue-600 p-2 rounded-lg">
          <BookOpen size={24} className="text-white" />
        </div>
        <span className="text-xl font-bold tracking-wide">{projectName}</span>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <Link href="/" className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-800 transition-all duration-200 group">
          <Home size={20} />
          <span className="font-medium">Dashboard</span>
        </Link>
        <Link href="/seats" className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-800 transition-all duration-200 group">
          <MapPin size={20} />
          <span className="font-medium">{session?.user.role === 'Member' ? 'Seats Map' : 'Seats & Subscriptions'}</span>
        </Link>
        {session?.user.role === 'Member' ? (
          <>
            <Link href="/profile" className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-800 transition-all duration-200 group">
              <User size={20} />
              <span className="font-medium">Profile</span>
            </Link>
            <Link href="/reports" className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-800 transition-all duration-200 group">
              <BarChart3 size={20} />
              <span className="font-medium">My Reports</span>
            </Link>
          </>
        ) : (
          <>
            <Link href="/members" className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-800 transition-all duration-200 group">
              <Users size={20} />
              <span className="font-medium">Members</span>
            </Link>
            <Link href="/expenses" className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-800 transition-all duration-200 group">
              <IndianRupee size={20} />
              <span className="font-medium">Expenses</span>
            </Link>
            <Link href="/fees" className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-800 transition-all duration-200 group">
              <CreditCard size={20} />
              <span className="font-medium">Fee Types</span>
            </Link>
            <Link href="/reports" className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-800 transition-all duration-200 group">
              <BarChart3 size={20} />
              <span className="font-medium">Reports</span>
            </Link>
          </>
        )}
        {session?.user.role === 'Admin' && (
          <>
            <Link href="/admin/locations" className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-800 transition-all duration-200 group">
              <MapPin size={20} />
              <span className="font-medium">Locations</span>
            </Link>
            <Link href="/admin/users" className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-800 transition-all duration-200 group">
              <UserCheck size={20} />
              <span className="font-medium">Manager Management</span>
            </Link>
            <Link href="/admin/settings" className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-800 transition-all duration-200 group">
              <Settings size={20} />
              <span className="font-medium">System Settings</span>
            </Link>
            <Link href="/admin/logs" className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-800 transition-all duration-200 group">
              <ClipboardList size={20} />
              <span className="font-medium">System Logs</span>
            </Link>
          </>
        )}
      </nav>
    </div>
  );
}