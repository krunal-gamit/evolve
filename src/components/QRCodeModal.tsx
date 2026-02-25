'use client';

import { useState, useEffect } from 'react';
import { X, Mail, Phone, MapPin, Calendar, IdCard, BookOpen, Sparkles } from 'lucide-react';
import QRCode from 'qrcode';

interface MemberData {
  _id: string;
  memberId: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  qrCode?: string;
  createdAt?: string;
}

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberData | null;
}

export default function QRCodeModal({ isOpen, onClose, member }: QRCodeModalProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    if (member?.memberId) {
      QRCode.toDataURL(member.memberId, {
        width: 300,
        margin: 1,
        color: {
          dark: '#10B981',
          light: '#ffffff'
        }
      }).then(setQrCodeDataUrl).catch(console.error);
    }
  }, [member?.memberId]);

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* ID Card */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Close button */}
        <div className="absolute -top-12 right-0 flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Card Container */}
        <div
          className="bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-3xl shadow-2xl overflow-hidden hover:scale-[1.02] transition-transform duration-300"
          style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(16, 185, 129, 0.1)' }}
        >
              {/* Decorative Background Pattern */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-[#10B981]/20 to-transparent rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-tr from-[#34C759]/20 to-transparent rounded-full blur-3xl" />
              </div>

              {/* Top Header with Gradient */}
              <div className="relative bg-gradient-to-r from-[#10B981] via-[#34C759] to-[#10B981] px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <BookOpen size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white tracking-wide">EVOLVE</h3>
                      <p className="text-xs text-white/70">Reading Room</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <Sparkles size={12} className="text-white" />
                    <span className="text-xs font-semibold text-white">MEMBER</span>
                  </div>
                </div>
                
                {/* Decorative line */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              </div>
          
              {/* Card Body */}
              <div className="relative p-5">
                {/* Main Content */}
                <div className="flex gap-4 items-start">
                  {/* QR Code Container */}
                  <div className="flex-shrink-0">
                    {qrCodeDataUrl ? (
                      <div className="relative">
                        <div className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-[#10B981]/20 p-1.5">
                          <img 
                            src={qrCodeDataUrl} 
                            alt="Member QR Code" 
                            className="w-full h-full rounded-lg"
                          />
                        </div>
                        {/* Decorative corner accents */}
                        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[#10B981] rounded-tl-lg" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#10B981] rounded-tr-lg" />
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[#10B981] rounded-bl-lg" />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#10B981] rounded-br-lg" />
                      </div>
                    ) : (
                      <div className="w-28 h-28 bg-gradient-to-br from-[#10B981] via-[#34C759] to-[#10B981] rounded-2xl flex items-center justify-center shadow-lg border-2 border-white">
                        <span className="text-5xl font-bold text-white drop-shadow-md">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Member Info */}
                  <div className="flex-1 min-w-0 pt-1">
                    <h2 className="text-xl font-bold text-gray-900 truncate leading-tight">{member.name}</h2>
                    
                    {/* Member ID Badge */}
                    <div className="inline-flex items-center gap-1.5 bg-[#10B981]/10 text-[#10B981] px-3 py-1.5 rounded-lg mt-2 border border-[#10B981]/20">
                      <IdCard className="w-3.5 h-3.5" />
                      <span className="text-sm font-mono font-bold">{member.memberId}</span>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse"></span>
                      <span className="text-sm text-[#10B981] font-medium">Active Member</span>
                    </div>
                  </div>
                </div>

                {/* Contact Details Card */}
                <div className="mt-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3.5 space-y-2.5 border border-gray-200/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-[#10B981]/10 rounded-lg flex items-center justify-center">
                      <Phone className="w-3.5 h-3.5 text-[#10B981]" />
                    </div>
                    <span className="text-sm text-gray-700 font-medium">{member.phone}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-[#10B981]/10 rounded-lg flex items-center justify-center">
                      <Mail className="w-3.5 h-3.5 text-[#10B981]" />
                    </div>
                    <span className="text-sm text-gray-700 truncate flex-1">{member.email}</span>
                  </div>
                  {member.address && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-[#10B981]/10 rounded-lg flex items-center justify-center">
                        <MapPin className="w-3.5 h-3.5 text-[#10B981]" />
                      </div>
                      <span className="text-sm text-gray-700 truncate flex-1">{member.address}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-dashed border-gray-300 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500 font-medium">
                      Member since {member.createdAt ? new Date(member.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400 font-medium">Valid through</span>
                    <span className="text-xs font-bold text-[#10B981]">2026</span>
                  </div>
                </div>
              </div>

              {/* Bottom Accent */}
              <div className="h-1.5 bg-gradient-to-r from-[#10B981] via-[#34C759] to-[#6EE7B7]" />
        </div>

        {/* Hint text */}
        <p className="text-center text-white/60 text-xs mt-4">
          Show this QR code at the entrance
        </p>
      </div>
    </div>
  );
}
