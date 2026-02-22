'use client';

import { useRouter } from 'next/navigation';
import Header from './Header';
import Sidebar from './Sidebar';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import QRCodeModal from './QRCodeModal';
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, Bell, MapPin, IdCard } from 'lucide-react';

interface Subscription {
  _id: string;
  location: { name: string };
  seat: { seatNumber: number };
  startDate: string;
  endDate: string;
  duration: string;
  totalAmount: number;
  status: string;
  payments: any[];
}

interface Payment {
  _id: string;
  amount: number;
  dateTime: string;
  method: string;
}

interface Member {
  _id: string;
  memberId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  examPrep?: string;
  qrCode?: string;
}

interface Seat {
  _id: string;
  seatNumber: number;
  status: string;
  location?: { _id: string; name: string };
}

interface Location {
  _id: string;
  name: string;
}

export default function MemberDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    const fetchMemberData = async () => {
      if (!session?.user?.id) return;

      try {
        const memberRes = await fetch(`/api/members/${session.user.id}`);
        if (memberRes.ok) {
          const memberData = await memberRes.json();
          setMember(memberData);
        }

        const subsRes = await fetch(`/api/subscriptions/member/${session.user.id}`);
        if (subsRes.ok) {
          const subsData = await subsRes.json();
          console.log('Subscriptions fetched:', subsData);
          setSubscriptions(subsData);
        } else {
          console.error('Failed to fetch subscriptions', subsRes.status, subsRes.statusText);
          // Try fetching by email as fallback
          const subsResByEmail = await fetch(`/api/subscriptions/member?email=${encodeURIComponent(session.user.email || '')}`);
          if (subsResByEmail.ok) {
            const subsDataByEmail = await subsResByEmail.json();
            console.log('Subscriptions fetched by email:', subsDataByEmail);
            setSubscriptions(subsDataByEmail);
          }
        }

        // Fetch seats and locations for heat map
        const seatsRes = await fetch('/api/seats');
        if (seatsRes.ok) {
          const seatsData = await seatsRes.json();
          setSeats(seatsData);
        }

        const locationsRes = await fetch('/api/locations');
        if (locationsRes.ok) {
          const locationsData = await locationsRes.json();
          setLocations(locationsData || []);
        }
      } catch (error) {
        console.error('Error fetching member data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchMemberData();
    }
  }, [session]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const getDaysRemaining = (endDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    const diff = end.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getLatestPayment = (payments: Payment[]) => {
    if (!payments || payments.length === 0) return null;
    return payments.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())[0];
  };

  // Filter seats by selected location
  const filteredSeats = selectedLocation
    ? seats.filter((seat: any) => seat.location?._id === selectedLocation || seat.location === selectedLocation)
    : seats;

  const filteredTotalSeats = filteredSeats.length;
  const filteredOccupiedSeats = filteredSeats.filter((seat: any) => seat.status === 'occupied').length;

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header pageTitle="My Dashboard" />
        <main className="flex-1 overflow-y-auto bg-gray-50/50">
          <style jsx global>{`
            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb {
              background-color: rgba(156, 163, 175, 0.5);
              border-radius: 10px;
              border: 2px solid transparent;
              background-clip: content-box;
            }
            ::-webkit-scrollbar-thumb:hover { background-color: rgba(107, 114, 128, 0.8); }
            * { scrollbar-width: thin; scrollbar-color: rgba(156, 163, 175, 0.5) transparent; }
          `}</style>
          
          <div className="p-6">
            {/* Welcome Section - Compact */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-4 mb-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold">Welcome back, {member?.name || session.user.name || 'Member'}!</h1>
                    <p className="text-blue-100 text-xs">Member ID: {member?.memberId || session.user.id || 'N/A'}</p>
                  </div>
                </div>
                {member && (
                  <button
                    onClick={() => setShowQRModal(true)}
                    className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition-colors"
                  >
                    <IdCard className="w-5 h-5" />
                    <span className="text-sm font-medium">View ID Card</span>
                  </button>
                )}
              </div>
            </div>

            {/* Seat Heat Map - Compact */}
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-800 mb-2">Seat Map</h2>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Occupancy Heatmap</h3>
                  {locations.length > 1 && (
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Locations</option>
                      {locations.map((loc: any) => (
                        <option key={loc._id} value={loc._id}>{loc.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {filteredSeats.map((seat: any) => (
                    <div
                      key={seat._id}
                      className={`w-[18px] h-[18px] rounded-sm ${seat.status === 'occupied' ? 'bg-red-500' : 'bg-emerald-400'}`}
                      title={seat.status === 'occupied' ? 'Occupied' : 'Vacant'}
                    ></div>
                  ))}
                </div>
                <div className="flex items-center mt-2 space-x-4 text-xs">
                  <div className="flex items-center">
                    <div className="w-2.5 h-2.5 bg-emerald-400 rounded-sm mr-1"></div>
                    <span className="text-gray-600">Vacant ({filteredTotalSeats - filteredOccupiedSeats})</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-sm mr-1"></div>
                    <span className="text-gray-600">Occupied ({filteredOccupiedSeats}/{filteredTotalSeats})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Subscription Status Cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Active</p>
                    <p className="text-xl font-bold text-gray-900">{subscriptions.filter(s => s.status === 'active').length}</p>
                  </div>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Expired</p>
                    <p className="text-xl font-bold text-gray-900">{subscriptions.filter(s => s.status === 'expired').length}</p>
                  </div>
                  <div className="p-2 bg-red-50 rounded-lg">
                    <XCircle className="h-4 w-4 text-red-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Expiring Soon Alert */}
            {subscriptions.filter(s => s.status === 'active' && getDaysRemaining(s.endDate) >= 0 && getDaysRemaining(s.endDate) <= 5).length > 0 && (
              <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Bell className="w-4 h-4 text-orange-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-orange-800">Expiring Soon!</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {subscriptions.filter(s => s.status === 'active' && getDaysRemaining(s.endDate) >= 0 && getDaysRemaining(s.endDate) <= 5).map(sub => (
                        <span key={sub._id} className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs">
                          {sub.location?.name} - {getDaysRemaining(sub.endDate)} days
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* All Subscriptions - Compact Grid */}
            {subscriptions.length > 0 && (
              <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-800 mb-3">My Subscriptions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {subscriptions.map((sub) => {
                    const daysRemaining = getDaysRemaining(sub.endDate);
                    const latestPayment = getLatestPayment(sub.payments);
                    const isExpired = sub.status === 'expired' || daysRemaining < 0;
                    
                    return (
                      <div key={sub._id} className={`rounded-lg p-3 border ${isExpired ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm">{sub.location?.name || 'Unknown'}</h3>
                            <p className="text-xs text-gray-500">Seat: {sub.seat?.seatNumber || 'N/A'}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isExpired ? 'bg-red-100 text-red-700' : daysRemaining <= 5 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                            {isExpired ? 'Expired' : daysRemaining <= 5 ? 'Expiring Soon' : 'Active'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <div className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            <span>{new Date(sub.startDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>{new Date(sub.endDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                          <span className={`text-sm font-medium ${isExpired ? 'text-red-600' : daysRemaining <= 5 ? 'text-orange-500' : 'text-green-600'}`}>
                            {isExpired ? 'Expired' : daysRemaining > 0 ? `${daysRemaining} days` : 'Today'}
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            ₹{(sub.totalAmount || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No Subscriptions */}
            {subscriptions.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 text-center">
                <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-gray-900 mb-1">No Subscriptions Found</h3>
                <p className="text-xs text-gray-500">Contact the administrator to get started.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* QR Code Modal */}
      <QRCodeModal 
        isOpen={showQRModal} 
        onClose={() => setShowQRModal(false)} 
        member={member} 
      />
    </div>
  );
}
