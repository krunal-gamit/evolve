'use client';

import { useState, useEffect } from 'react';
import { X, Mail, Phone, MapPin, Calendar, IdCard, BookOpen } from 'lucide-react';
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
        width: 200,
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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* ID Card */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Close button */}
        <div className="absolute -top-10 right-0">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Card Container */}
        <div
          className="bg-white rounded-2xl shadow-2xl overflow-hidden transform rotate-1 hover:rotate-0 transition-transform duration-300"
        >
          {/* Top Color Bar */}
          <div className="h-3 bg-gradient-to-r from-[#10B981] via-[#34C759] to-[#6EE7B7]" />
          
          {/* Card Body */}
          <div className="p-4">
            {/* Header with Logo/Icon */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[#10B981] to-[#34C759] rounded-lg flex items-center justify-center shadow-md">
                  <BookOpen size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-tight">EVOLVE</h3>
                  <p className="text-[11px] text-gray-500">Reading Room</p>
                </div>
              </div>
              <span className="bg-gradient-to-r from-[#10B981] to-[#34C759] text-white text-[11px] font-semibold px-2 py-1 rounded-full">
                MEMBER
              </span>
            </div>

            {/* Main Content - Avatar & Details */}
            <div className="flex gap-3 mb-3">
              {/* Avatar - QR Code */}
              <div className="flex-shrink-0">
                {qrCodeDataUrl ? (
                  <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center shadow-md border-2 border-[#10B981]/30 p-1">
                    <img 
                      src={qrCodeDataUrl} 
                      alt="Member QR Code" 
                      className="w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-[#10B981] via-[#34C759] to-[#10B981] rounded-xl flex items-center justify-center shadow-md border-2 border-white ring-2 ring-[#10B981]/30">
                    <span className="text-4xl font-bold text-white drop-shadow-md">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-900 truncate">{member.name}</h2>
                
                {/* Member ID Badge */}
                <div className="inline-flex items-center gap-1 bg-gradient-to-r from-[#10B981]/10 to-[#34C759]/10 text-[#10B981] px-2 py-1 rounded-lg mt-1 border border-[#10B981]/20">
                  <IdCard className="w-3 h-3" />
                  <span className="text-sm font-mono font-bold">{member.memberId}</span>
                </div>

                {/* Status */}
                <div className="flex items-center gap-1 mt-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-sm text-green-600 font-medium">Active</span>
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0" />
                <span className="text-sm text-gray-700">{member.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0" />
                <span className="text-sm text-gray-700 truncate">{member.email}</span>
              </div>
              {member.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{member.address}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-3 pt-2 border-t border-dashed border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-gray-400" />
                <span className="text-[11px] text-gray-500">
                  Since {member.createdAt ? new Date(member.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'N/A'}
                </span>
              </div>
              <span className="text-[11px] text-gray-400">Valid until 2026</span>
            </div>
          </div>

          {/* Bottom Color Bar */}
          <div className="h-2 bg-gradient-to-r from-[#10B981] via-[#34C759] to-[#6EE7B7]" />
        </div>
      </div>
    </div>
  );
}
