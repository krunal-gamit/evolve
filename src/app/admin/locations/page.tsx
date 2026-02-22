'use client';

import { useState } from 'react';
import Header from '../../../components/Header';
import Sidebar from '../../../components/Sidebar';
import Footer from '../../../components/Footer';
import LocationManagement from '../../../components/LocationManagement';

export default function LocationsPage() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header pageTitle="Locations Management" />
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#F2F2F7] via-[#E8E8ED] to-[#F2F2F7] p-3 md:p-4">
          <div className="p-3 sm:p-4">
            <div className="mb-4 md:mb-5">
              <h2 className="text-base md:text-lg font-semibold text-gray-800">Locations Management</h2>
              <p className="text-gray-500 text-[10px] md:text-xs mt-0.5">Create and manage your reading room facilities</p>
            </div>
            <LocationManagement />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
