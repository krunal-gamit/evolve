import Link from 'next/link';
import { Home, Users, CreditCard, BarChart3, MapPin, DollarSign } from 'lucide-react';

export default function Sidebar() {
  return (
    <div className="hidden md:block w-64 bg-gray-800 text-white h-full p-4">
      <h2 className="text-xl font-bold mb-8">Reading Room</h2>
      <nav className="space-y-4">
        <Link href="/" className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700">
          <Home size={20} />
          <span>Dashboard</span>
        </Link>
        <Link href="/seats" className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700">
          <MapPin size={20} />
          <span>Seats & Subscriptions</span>
        </Link>
        <Link href="/members" className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700">
          <Users size={20} />
          <span>Members</span>
        </Link>
        <Link href="/expenses" className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700">
          <DollarSign size={20} />
          <span>Expenses</span>
        </Link>
        <Link href="/reports" className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700">
          <BarChart3 size={20} />
          <span>Reports</span>
        </Link>
      </nav>
    </div>
  );
}