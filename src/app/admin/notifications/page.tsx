'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'Admin') {
      router.push('/');
      return;
    }
    fetchNotifications();
  }, [session, status, router]);

  const fetchNotifications = async () => {
    const res = await fetch('/api/notifications');
    if (res.ok) {
      const data = await res.json();
      setNotifications(data);
    }
  };

  const markAsRead = async (id: string) => {
    const res = await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
    });
    if (res.ok) {
      setNotifications(notifications.map(n => n._id === id ? { ...n, read: true } : n));
    }
  };

  const markAllAsRead = async () => {
    for (const n of notifications.filter(n => !n.read)) {
      await markAsRead(n._id);
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session || session.user.role !== 'Admin') {
    return null;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header pageTitle="All Notifications" />
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#F2F2F7] via-[#E8E8ED] to-[#F2F2F7]">
          <div className="p-4 sm:p-5">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800">All Notifications</h2>
              <p className="text-gray-500 text-xs mt-0.5">View and manage notifications.</p>
            </div>
            <div className="mb-4">
              <button
                onClick={markAllAsRead}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Mark All as Read
              </button>
            </div>
            <div className="space-y-4">
              {notifications.map(notification => (
                <div key={notification._id} className={`p-4 border rounded-lg ${!notification.read ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{notification.title}</h3>
                      <p className="text-gray-700">{notification.message}</p>
                      <div className="mt-2 flex items-center gap-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          notification.priority === 'high' ? 'bg-red-100 text-red-800' :
                          notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {notification.priority}
                        </span>
                        <span className="text-sm text-gray-500">{new Date(notification.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification._id)}
                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {notifications.length === 0 && <p className="text-center text-gray-500">No notifications found.</p>}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}