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
  category: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    fetchNotifications();
  }, [session, status, router, filter]);

  const fetchNotifications = async () => {
    const params = new URLSearchParams();
    if (filter === 'unread') {
      params.set('unread', 'true');
    }
    
    const res = await fetch(`/api/notifications?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    }
  };

  const markAsRead = async (id: string) => {
    const res = await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
    });
    if (res.ok) {
      setNotifications(notifications.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    for (const n of notifications.filter(n => !n.read)) {
      await markAsRead(n._id);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      subscription_expiry_reminder: '📅',
      subscription_expiry_3days: '⚠️',
      subscription_expired: '❌',
      subscription_renewed: '✅',
      payment_received: '💰',
      payment_failed: '❌',
      invoice_generated: '📄',
      seat_assigned: '💺',
      seat_changed: '🔄',
      seat_available: '🎉',
      grievance_submitted: '📝',
      grievance_status_update: '🔔',
      grievance_resolved: '✅',
      profile_updated: '👤',
      password_changed: '🔐',
      account_suspended: '🚫',
      welcome: '👋'
    };
    return icons[type] || '🔔';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      subscription: 'bg-blue-100 text-blue-800',
      payment: 'bg-green-100 text-green-800',
      seat: 'bg-purple-100 text-purple-800',
      grievance: 'bg-orange-100 text-orange-800',
      account: 'bg-gray-100 text-gray-800',
      system: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (status === 'loading') {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header pageTitle="My Notifications" />
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#F2F2F7] via-[#E8E8ED] to-[#F2F2F7] p-3 md:p-4">
          <div className="p-3 md:p-4 sm:p-5">
            {/* Header Section */}
            <div className="mb-4 md:mb-5">
              <h2 className="text-base md:text-lg font-semibold text-gray-800">My Notifications</h2>
              <p className="text-gray-500 text-[10px] md:text-xs mt-0.5">
                {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'No unread notifications'}
              </p>
            </div>

            {/* Filter and Actions */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  filter === 'all' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  filter === 'unread' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Unread
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="ml-auto px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-medium transition-colors"
                >
                  Mark All as Read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🔔</div>
                  <p className="text-gray-500 text-sm">
                    {filter === 'unread' 
                      ? 'No unread notifications' 
                      : 'No notifications yet'}
                  </p>
                  {filter === 'unread' && (
                    <button
                      onClick={() => setFilter('all')}
                      className="mt-2 text-blue-500 text-sm underline"
                    >
                      View all notifications
                    </button>
                  )}
                </div>
              ) : (
                notifications.map(notification => (
                  <div 
                    key={notification._id} 
                    className={`p-3 md:p-4 border rounded-lg transition-all ${
                      !notification.read 
                        ? 'bg-blue-50 border-blue-200 shadow-sm' 
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm md:text-base">{notification.title}</h3>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-gray-700 text-xs md:text-sm">{notification.message}</p>
                          <div className="mt-2 flex items-center gap-3 flex-wrap">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(notification.category)}`}>
                              {notification.category}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              notification.priority === 'critical' ? 'bg-red-100 text-red-800' :
                              notification.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                              notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {notification.priority}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(notification.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {notification.actionUrl && !notification.read && (
                            <button
                              onClick={() => markAsRead(notification._id)}
                              className="mt-2 text-blue-600 hover:text-blue-800 text-xs underline"
                            >
                              View Details →
                            </button>
                          )}
                        </div>
                      </div>
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification._id)}
                          className="text-blue-600 hover:text-blue-800 text-xs underline shrink-0"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
