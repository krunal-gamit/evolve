'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import SubscriptionManagement from '../../components/SubscriptionManagement';
import Footer from '../../components/Footer';
import { Toaster } from 'react-hot-toast';
import { Plus, X } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface Seat {
  _id: string;
  seatNumber: number;
  status: string;
  location?: { _id: string; name: string; address: string };
  assignedMember?: { name: string };
  subscription?: { endDate: string; status: string };
}

interface Location {
  _id: string;
  name: string;
  address: string;
  totalSeats: number;
}

export default function SeatsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isMember = session?.user.role === 'Member';
  const isManager = session?.user.role === 'Manager';
  const managerLocations = session?.user.locations as string[] | undefined;

  // Redirect members to dashboard
  useEffect(() => {
    if (status === 'loading') return;
    if (session && isMember) {
      router.push('/');
    }
  }, [session, status, router, isMember]);

  const [seats, setSeats] = useState<Seat[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [waitingCount, setWaitingCount] = useState(0);
  const [totalCapacity, setTotalCapacity] = useState(46);
  const [isSubscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [prefillSeat, setPrefillSeat] = useState('');
  const [prefillLocation, setPrefillLocation] = useState<string | undefined>(undefined);
  const [isLocationLocked, setIsLocationLocked] = useState(false);
  const [showOccupiedDetails, setShowOccupiedDetails] = useState(false);

  // Show loading or redirecting
  const showLoading = status === 'loading' || (session && isMember);

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations');
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
        
        // If manager has specific location assignments, show them grouped by default
        if (managerLocations && managerLocations.length > 0) {
          if (managerLocations.length === 1) {
            // Single location - show that location
            setSelectedLocation(managerLocations[0]);
          } else {
            // Multiple locations - show all grouped (empty = all)
            setSelectedLocation('');
          }
          setIsLocationLocked(true);
        } else {
          // Ensure "All" is selected by default for admins/managers without location restriction
          setSelectedLocation('');
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [managerLocations]);

  const fetchSeats = async () => {
    try {
      const url = selectedLocation ? `/api/seats?locationId=${selectedLocation}` : '/api/seats';
      const res = await fetch(url);
      if (res.ok) {
        let data = await res.json();
        if (data.length === 0) {
          // Initialize seats for this location if none exist
          if (selectedLocation) {
            await fetch('/api/init', { method: 'POST' });
            const newRes = await fetch(url);
            if (newRes.ok) {
              data = await newRes.json();
            }
          }
        }
        setSeats(data);
        setTotalCapacity(data.length);
      } else {
        console.error('Failed to fetch seats');
      }
    } catch (error) {
      console.error('Error fetching seats:', error);
    }
  };

  const fetchWaiting = async () => {
    try {
      const res = await fetch('/api/waiting');
      if (res.ok) {
        const data = await res.json();
        setWaitingCount(data.length);
      } else {
        console.error('Failed to fetch waiting list');
      }
    } catch (error) {
      console.error('Error fetching waiting list:', error);
    }
  };

  const fetchSettings = async () => {
    // Not needed since we're using actual seat count
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedLocation !== undefined) {
      fetchSeats();
      fetchWaiting();
    }
  }, [selectedLocation]);

  const handleDataUpdate = () => {
    fetchSeats();
    fetchWaiting();
  };

  const vacant = seats.filter(s => s.status === 'vacant').length;
  const occupied = seats.filter(s => s.status === 'occupied').length;

  const handleSeatDoubleClick = (seat: Seat) => {
    if (seat.status === 'vacant') {
      setPrefillSeat(seat.seatNumber.toString());
      setPrefillLocation(seat.location?._id);
      setSelectedLocation(seat.location?._id || '');
      setSubscriptionModalOpen(true);
    } else {
      setSelectedSeat(seat);
      setShowOccupiedDetails(true);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header pageTitle="Subscriptions" />
        <style jsx global>{`
          /* For Webkit-based browsers (Chrome, Safari) */
          ::-webkit-scrollbar { width: 8px; height: 8px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb {
            background-color: rgba(156, 163, 175, 0.5);
            border-radius: 4px;
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
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#F2F2F7] via-[#E8E8ED] to-[#F2F2F7] p-3 md:p-4">
          {showLoading ? null : (
            <>
            <div className="flex justify-end mb-4 md:mb-6 gap-3 md:gap-4 mt-3 md:mt-4">
            {locations.length > 0 && !isLocationLocked && (
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Locations</option>
                {locations.filter(loc => loc._id).map((loc) => (
                  <option key={loc._id} value={loc._id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            )}
            {isLocationLocked && locations.length > 0 && managerLocations && managerLocations.length > 1 && (
              <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 font-medium">
                📍 Managing {managerLocations.length} Locations
              </div>
            )}
            {isLocationLocked && locations.length > 0 && (!managerLocations || managerLocations.length === 1) && selectedLocation && (
              <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 font-medium">
                📍 {locations.find(loc => loc._id === selectedLocation)?.name}
              </div>
            )}
            {!isMember && <button
              onClick={() => setSubscriptionModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-105"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Subscription
            </button>}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="rounded-md bg-green-100 p-3">
                      <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Vacant Seats</dt>
                      <dd className="text-3xl font-semibold text-gray-900">{vacant}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="rounded-md bg-red-100 p-3">
                      <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Occupied Seats</dt>
                      <dd className="text-3xl font-semibold text-gray-900">{occupied}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="rounded-md bg-yellow-100 p-3">
                      <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Waiting List</dt>
                      <dd className="text-3xl font-semibold text-gray-900">{waitingCount}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="rounded-md bg-blue-100 p-3">
                      <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Capacity</dt>
                      <dd className="text-3xl font-semibold text-gray-900">{totalCapacity}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seating Map */}
          <div className="bg-white shadow rounded-lg mb-8 border border-gray-200">
            <div className="px-4 py-4 sm:p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Live Seating Map</h3>
                {selectedLocation && locations.find(l => l._id === selectedLocation) && (
                  <span className="text-sm text-gray-500">
                    {locations.find(l => l._id === selectedLocation)?.name} - {locations.find(l => l._id === selectedLocation)?.address}
                  </span>
                )}
              </div>
              
              {/* Group seats by location if showing all */}
              {!selectedLocation ? (
                // Show all locations grouped (or manager's assigned locations if locked)
                (isLocationLocked && managerLocations ? managerLocations : locations.filter(loc => loc._id).map(loc => loc._id)).map(locationId => {
                  const location = locations.find(l => l._id === locationId);
                  const locationSeats = seats.filter(s => s.location?._id === locationId);
                  if (locationSeats.length === 0 || !location) return null;
                  return (
                    <div key={locationId} className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">{location.name} - {location.address}</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                        {locationSeats.map(seat => (
                          <div 
                            key={seat._id} 
                            onDoubleClick={() => handleSeatDoubleClick(seat)}
                            className={`relative p-2 border rounded-xl flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer select-none ${
                              seat.status === 'vacant' 
                                ? 'bg-green-50 border-green-200 hover:shadow-md hover:border-green-300' 
                                : 'bg-white border-red-200 shadow-sm hover:shadow-md'
                            }`}
                          >
                            <div className={`text-xl font-bold mb-1 ${seat.status === 'vacant' ? 'text-green-600' : 'text-gray-800'}`}>
                              {seat.seatNumber}
                            </div>
                            {seat.status === 'vacant' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                Available
                              </span>
                            ) : (
                              <div className="w-full">
                                <div className="text-sm font-medium text-gray-900 truncate w-full" title={seat.assignedMember?.name}>
                                  {seat.assignedMember?.name || 'Occupied'}
                                </div>
                                {seat.subscription && (
                                  <div className="text-xs text-gray-500 mt-1">
                                  Exp: {new Date(seat.subscription.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                                  </div>
                                )}
                              </div>
                            )}
                            {seat.status === 'occupied' && (
                              <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500"></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                // Show single location
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                  {seats.map(seat => (
                    <div 
                      key={seat._id} 
                      onDoubleClick={() => handleSeatDoubleClick(seat)}
                      className={`relative p-2 border rounded-xl flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer select-none ${
                        seat.status === 'vacant' 
                          ? 'bg-green-50 border-green-200 hover:shadow-md hover:border-green-300' 
                          : 'bg-white border-red-200 shadow-sm hover:shadow-md'
                      }`}
                    >
                      <div className={`text-xl font-bold mb-1 ${seat.status === 'vacant' ? 'text-green-600' : 'text-gray-800'}`}>
                        {seat.seatNumber}
                      </div>
                      {seat.status === 'vacant' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Available
                        </span>
                      ) : (
                        <div className="w-full">
                          <div className="text-sm font-medium text-gray-900 truncate w-full" title={seat.assignedMember?.name}>
                            {seat.assignedMember?.name || 'Occupied'}
                          </div>
                          {seat.subscription && (
                            <div className="text-xs text-gray-500 mt-1">
                            Exp: {new Date(seat.subscription.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                            </div>
                          )}
                        </div>
                      )}
                      {seat.status === 'occupied' && (
                        <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500"></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Subscription Management Section */}
          <div className="mt-8">
            <SubscriptionManagement 
              isOpen={isSubscriptionModalOpen} 
              onClose={() => {
                setSubscriptionModalOpen(false);
                setPrefillSeat('');
                setPrefillLocation(undefined);
              }}
              onUpdate={handleDataUpdate}
              initialSeatNumber={prefillSeat}
              initialLocationId={prefillLocation}
              initialMemberId={undefined}
              selectedLocation={selectedLocation}
              onLocationChange={setSelectedLocation}
            />
          </div>

          {/* Occupied Seat Details Modal */}
          {showOccupiedDetails && selectedSeat && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowOccupiedDetails(false)} />
              <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden z-10 transform scale-100">
                {/* Header with gradient */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 pt-4 pb-4 relative">
                  {/* Close button */}
                  <button
                    onClick={() => setShowOccupiedDetails(false)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-2 rounded-2xl bg-white/10 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white">Seat #{selectedSeat.seatNumber}</h3>
                    <p className="text-slate-300 text-sm">{selectedSeat.assignedMember?.name || 'Occupied'}</p>
                    
                    {/* Status Badge */}
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full mt-3 ${selectedSeat.subscription?.status === 'active' ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                      {selectedSeat.subscription?.status === 'active' ? (
                        <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      <span className={`text-xs font-semibold ${selectedSeat.subscription?.status === 'active' ? 'text-green-400' : 'text-gray-400'}`}>
                        {selectedSeat.subscription?.status === 'active' ? 'Active' : selectedSeat.subscription?.status || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="px-5 py-3 -mt-3 relative">
                  <div className="space-y-2">
                    {/* End Date */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-medium">End Date</p>
                          <p className="text-sm font-semibold text-slate-800">
                            {selectedSeat.subscription?.endDate ? new Date(selectedSeat.subscription.endDate).toLocaleDateString('en-GB') : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Location */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-medium">Location</p>
                          <p className="text-sm font-semibold text-slate-800">{selectedSeat.location?.name || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Days Remaining */}
                    {selectedSeat.subscription?.endDate && (
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${Math.ceil((new Date(selectedSeat.subscription.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) > 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                            <svg className={`w-5 h-5 ${Math.ceil((new Date(selectedSeat.subscription.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) > 0 ? 'text-emerald-600' : 'text-red-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-medium">Days Left</p>
                            <p className={`text-sm font-bold ${Math.ceil((new Date(selectedSeat.subscription.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {Math.ceil((new Date(selectedSeat.subscription.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Close indicator */}
                <div className="pb-4 text-center">
                  <p className="text-xs text-slate-400">Tap outside to close</p>
                </div>
              </div>
            </div>
          )}
          </>)}
        </main>
        <Footer />
      </div>
    </div>
  );
}