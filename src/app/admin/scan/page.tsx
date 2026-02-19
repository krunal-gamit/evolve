'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import { Search, CheckCircle, XCircle, AlertCircle, User, Calendar, Clock, IdCard } from 'lucide-react';

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
  const [memberIdInput, setMemberIdInput] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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

  const verifyMember = async (memberId: string) => {
    if (!memberId.trim()) {
      setError('Please enter a Member ID');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`/api/verify?memberId=${encodeURIComponent(memberId.trim())}`);
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to verify member');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyMember(memberIdInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      verifyMember(memberIdInput);
    }
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
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header pageTitle="Verify Member" />
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#F2F2F7] via-[#E8E8ED] to-[#F2F2F7] p-4">
          <div className="max-w-2xl mx-auto">
            
            {/* Search Section - Compact */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <IdCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Verify Member</h1>
                  <p className="text-xs text-gray-500">Enter member ID to check subscription</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={memberIdInput}
                    onChange={(e) => setMemberIdInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter Member ID"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    autoFocus
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span>Verify</span>
                </button>
              </form>

              {error && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}
            </div>

            {/* Result Section - Compact */}
            {result && (
              <div className={`rounded-xl shadow-md border-2 p-4 ${result.valid ? 'bg-white border-green-200' : 'bg-white border-red-200'}`}>
                <div className="flex items-center gap-3 mb-3">
                  {result.valid ? (
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-600" />
                    </div>
                  )}
                  <h2 className={`text-base font-bold ${result.valid ? 'text-green-700' : 'text-red-700'}`}>
                    {result.valid ? '✓ Valid Subscription' : '✗ ' + result.message}
                  </h2>
                </div>

                {result.member && (
                  <div className="space-y-3">
                    {/* Member Info */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">Name</p>
                          <p className="text-sm font-semibold text-gray-900">{result.member.name}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">Member ID</p>
                          <p className="text-sm font-mono font-semibold text-gray-900">{result.member.memberId}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">Phone</p>
                          <p className="text-xs text-gray-900">{result.member.phone}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">Email</p>
                          <p className="text-xs text-gray-900 truncate">{result.member.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Subscription Info */}
                    {result.subscription && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-white p-2 rounded">
                            <p className="text-[10px] text-gray-500">Status</p>
                            <p className={`text-xs font-semibold ${result.subscription.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                              {result.subscription.status.charAt(0).toUpperCase() + result.subscription.status.slice(1)}
                            </p>
                          </div>
                          <div className="bg-white p-2 rounded">
                            <p className="text-[10px] text-gray-500">Location</p>
                            <p className="text-xs font-medium text-gray-900 truncate">{result.subscription.location?.name || 'N/A'}</p>
                          </div>
                          <div className="bg-white p-2 rounded">
                            <p className="text-[10px] text-gray-500">Seat</p>
                            <p className="text-xs font-medium text-gray-900">Seat {result.subscription.seat?.seatNumber || 'N/A'}</p>
                          </div>
                          <div className="bg-white p-2 rounded">
                            <p className="text-[10px] text-gray-500">Duration</p>
                            <p className="text-xs font-medium text-gray-900">{result.subscription.duration}</p>
                          </div>
                          <div className="bg-white p-2 rounded">
                            <p className="text-[10px] text-gray-500">Amount</p>
                            <p className="text-xs font-bold text-gray-900">₹{result.subscription.totalAmount.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <p className="text-[10px] text-gray-500">End:</p>
                            <p className={`text-xs font-medium ${result.valid ? 'text-green-600' : 'text-red-600'}`}>
                              {new Date(result.subscription.endDate).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => {
                    setResult(null);
                    setMemberIdInput('');
                    inputRef.current?.focus();
                  }}
                  className="w-full mt-3 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 text-xs font-medium"
                >
                  Verify Another
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
