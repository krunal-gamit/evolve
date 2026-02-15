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
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#F2F2F7] via-[#E8E8ED] to-[#F2F2F7]">
          <div className="p-4 sm:p-5">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800">Locations Management</h2>
              <p className="text-gray-500 text-xs mt-0.5">Create and manage your reading room facilities</p>
            </div>
            <LocationManagement />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
