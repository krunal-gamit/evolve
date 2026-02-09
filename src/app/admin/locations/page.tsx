'use client';

import { useState } from 'react';
import Header from '../../../components/Header';
import Sidebar from '../../../components/Sidebar';
import LocationManagement from '../../../components/LocationManagement';
import Footer from '../../../components/Footer';

export default function LocationsPage() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header pageTitle="Locations Management" />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Manage Locations</h1>
            <p className="text-gray-600 mt-1">Create and manage your reading room facilities</p>
          </div>
          <LocationManagement />
          <Footer />
        </main>
      </div>
    </div>
  );
}
