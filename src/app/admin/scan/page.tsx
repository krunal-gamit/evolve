'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import { Search, CheckCircle, XCircle, AlertCircle, User, Calendar, IdCard } from 'lucide-react';

interface SearchHint {
  memberId: string;
  name: string;
  email: string;
  phone: string;
  displayText: string;
}

interface VerificationResult {
  valid: boolean;
  member: {
    _id: string;
    memberId: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  subscription: {
    status: string;
    startDate: string;
    endDate: string;
    location: { name: string; address: string };
    seat: { seatNumber: number };
    duration: string;
    totalAmount: number;
  } | null;
  message: string;
}

export default function QRScannerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [hints, setHints] = useState<SearchHint[]>([]);
  const [showHints, setShowHints] = useState(false);
  const [selectedHint, setSelectedHint] = useState<SearchHint | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const hintsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
    } else if (session.user.role === 'Member') {
      router.push('/');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (hintsRef.current && !hintsRef.current.contains(event.target as Node)) {
        setShowHints(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchHints = async () => {
      if (searchInput.trim().length < 2) {
        setHints([]);
        return;
      }

      try {
        const response = await fetch(`/api/verify/search?q=${encodeURIComponent(searchInput.trim())}`);
        const data = await response.json();
        if (response.ok) {
          setHints(data.hints || []);
        }
      } catch {
        console.error('Error fetching hints:');
      }
    };

    const debounceTimer = setTimeout(fetchHints, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchInput]);

  const verifyMember = async (value: string) => {
    if (!value.trim()) {
      setError('Please enter a Member ID, Email, Phone, or Name');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setShowHints(false);

    try {
      const response = await fetch(`/api/verify?q=${encodeURIComponent(value.trim())}`);
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to verify member');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyMember(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (selectedHint) {
        verifyMember(selectedHint.memberId);
      } else {
        verifyMember(searchInput);
      }
    }
  };

  const handleHintSelect = (hint: SearchHint) => {
    setSelectedHint(hint);
    setSearchInput(hint.displayText);
    setShowHints(false);
    verifyMember(hint.memberId);
  };

  if (status === 'loading' || !session) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (session.user.role === 'Member') {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header pageTitle="Verify Member" />
        <main className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6">
          <div className="max-w-3xl mx-auto">
            
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
              <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center">
                  <IdCard className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg md:text-2xl font-bold text-gray-800">Verify Member</h1>
                  <p className="text-xs md:text-sm text-gray-500">Search by ID, Email, Phone, or Name to verify a subscription.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="relative">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={searchInput || ''}
                      onChange={(e) => { setSearchInput(e.target.value); setSelectedHint(null); setShowHints(true); }}
                      onFocus={() => setShowHints(true)}
                      onKeyDown={handleKeyDown}
                      placeholder="Enter Member ID, Email, Phone, or Name..."
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      autoFocus
                    />
                    {showHints && hints.length > 0 && (
                      <div ref={hintsRef} className="absolute z-20 w-full left-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                        {hints.map((hint, index) => (
                          <button key={index} type="button" onClick={() => handleHintSelect(hint)} className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-base font-medium text-gray-800">{hint.name}</p>
                                <p className="text-sm text-gray-500">ID: {hint.memberId}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">{hint.phone}</p>
                                <p className="text-sm text-gray-400 truncate max-w-[150px]">{hint.email}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2 text-base font-semibold transition-all shadow-md hover:shadow-lg"
                  >
                    {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Search className="w-5 h-5" />}
                    <span>Verify</span>
                  </button>
                </div>

              </form>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-800 font-medium">{error}</p>
                </div>
              )}
            </div>

            {result && (
              <div className={`rounded-2xl shadow-lg border-2 p-6 ${result.valid ? 'bg-white border-green-300' : 'bg-white border-red-300'}`}>
                <div className="flex items-center gap-4 mb-4">
                  {result.valid ? (
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                  )}
                  <h2 className={`text-2xl font-bold ${result.valid ? 'text-green-700' : 'text-red-700'}`}>
                    {result.valid ? 'Valid Subscription' : result.message}
                  </h2>
                </div>

                {result.member && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2"><User className="w-5 h-5 text-gray-500" /> Member Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">Name</p>
                          <p className="text-base font-semibold text-gray-900">{result.member.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">Member ID</p>
                          <p className="text-base font-mono font-semibold text-gray-900">{result.member.memberId}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">Phone</p>
                          <p className="text-base text-gray-800">{result.member.phone}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">Email</p>
                          <p className="text-base text-gray-800 truncate">{result.member.email}</p>
                        </div>
                      </div>
                    </div>

                    {result.subscription && (
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2"><IdCard className="w-5 h-5 text-gray-500" /> Subscription Details</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="bg-white p-3 rounded-lg border">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Status</p>
                            <p className={`text-base font-bold ${result.subscription.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                              {result.subscription.status.charAt(0).toUpperCase() + result.subscription.status.slice(1)}
                            </p>
                          </div>
                          <div className="bg-white p-3 rounded-lg border col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Location</p>
                            <p className="text-base font-medium text-gray-900 truncate">{result.subscription.location?.name || 'N/A'}</p>
                          </div>
                          <div className="bg-white p-3 rounded-lg border">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Seat</p>
                            <p className="text-base font-medium text-gray-900">Seat {result.subscription.seat?.seatNumber || 'N/A'}</p>
                          </div>
                          <div className="bg-white p-3 rounded-lg border">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Duration</p>
                            <p className="text-base font-medium text-gray-900">{result.subscription.duration}</p>
                          </div>
                           <div className="bg-white p-3 rounded-lg border">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Amount</p>
                            <p className="text-base font-bold text-gray-900">₹{result.subscription.totalAmount.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-gray-400" />
                                <p className="text-sm text-gray-600">Start Date:</p>
                                <p className="text-sm font-medium text-gray-800">
                                  {new Date(result.subscription.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-gray-400" />
                                <p className="text-sm text-gray-600">End Date:</p>
                                <p className={`text-sm font-bold ${result.valid ? 'text-green-600' : 'text-red-600'}`}>
                                  {new Date(result.subscription.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => { setResult(null); setSearchInput(''); setSelectedHint(null); setHints([]); inputRef.current?.focus(); }}
                  className="w-full mt-6 bg-gray-200 text-gray-800 py-3 px-4 rounded-xl hover:bg-gray-300 text-base font-semibold transition-all"
                >
                  Verify Another Member
                </button>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
