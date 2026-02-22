'use client';

import Link from 'next/link';
import { Home, Users, CreditCard, BarChart3, MapPin, IndianRupee, BookOpen, User, UserCheck, ClipboardList, Settings, Calendar, Search } from 'lucide-react';
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

  const isMember = session?.user.role === 'Member';

  return (
    <div className="hidden lg:flex flex-col w-48 md:w-56 bg-[#1C1C1E] text-white h-full border-r border-[#38383A]">
      <div className="p-3 md:p-4 flex items-center space-x-2 md:space-x-3 border-b border-[#38383A]">
        <div className="bg-[#007AFF] p-1 md:p-1.5 rounded-lg">
          <BookOpen size={16} className="text-white md:text-lg" />
        </div>
        <span className="text-base md:text-lg font-semibold">{projectName}</span>
      </div>
      <nav className="flex-1 px-2 md:px-3 py-3 md:py-4 space-y-0.5 md:space-y-1 overflow-y-auto">
        <Link href="/" className="flex items-center space-x-2 md:space-x-3 px-2 md:px-3 py-2 md:py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 text-xs md:text-sm">
          <Home size={16} className="md:hidden" />
          <Home size={18} className="hidden md:block" />
          <span>Dashboard</span>
        </Link>

        {isMember ? (
          <>
            <Link href="/profile" className="flex items-center space-x-2 md:space-x-3 px-2 md:px-3 py-2 md:py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 text-xs md:text-sm">
              <User size={16} className="md:hidden" />
              <User size={18} className="hidden md:block" />
              <span>Profile</span>
            </Link>
          </>
        ) : (
          <>
            <Link href="/members" className="flex items-center space-x-2 md:space-x-3 px-2 md:px-3 py-2 md:py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 text-xs md:text-sm">
              <Users size={16} className="md:hidden" />
              <Users size={18} className="hidden md:block" />
              <span>Members</span>
            </Link>
            <Link href="/seats" className="flex items-center space-x-2 md:space-x-3 px-2 md:px-3 py-2 md:py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 text-xs md:text-sm">
              <Calendar size={16} className="md:hidden" />
              <Calendar size={18} className="hidden md:block" />
              <span>Subscriptions</span>
            </Link>
            <Link href="/expenses" className="flex items-center space-x-2 md:space-x-3 px-2 md:px-3 py-2 md:py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 text-xs md:text-sm">
              <IndianRupee size={16} className="md:hidden" />
              <IndianRupee size={18} className="hidden md:block" />
              <span>Expenses</span>
            </Link>
            <Link href="/reports" className="flex items-center space-x-2 md:space-x-3 px-2 md:px-3 py-2 md:py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 text-xs md:text-sm">
              <BarChart3 size={16} className="md:hidden" />
              <BarChart3 size={18} className="hidden md:block" />
              <span>Reports</span>
            </Link>
            <Link href="/fees" className="flex items-center space-x-2 md:space-x-3 px-2 md:px-3 py-2 md:py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 text-xs md:text-sm">
              <CreditCard size={16} className="md:hidden" />
              <CreditCard size={18} className="hidden md:block" />
              <span>Fee Types</span>
            </Link>
          </>
        )}

        {session?.user.role === 'Admin' && (
          <>
            <Link href="/admin/settings" className="flex items-center space-x-2 md:space-x-3 px-2 md:px-3 py-2 md:py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 text-xs md:text-sm">
              <Settings size={16} className="md:hidden" />
              <Settings size={18} className="hidden md:block" />
              <span>Settings</span>
            </Link>
            <Link href="/admin/logs" className="flex items-center space-x-2 md:space-x-3 px-2 md:px-3 py-2 md:py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 text-xs md:text-sm">
              <ClipboardList size={16} className="md:hidden" />
              <ClipboardList size={18} className="hidden md:block" />
              <span>Logs</span>
            </Link>
          </>
        )}
      </nav>
    </div>
  );
}
