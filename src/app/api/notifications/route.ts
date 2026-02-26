import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import Subscription from '@/models/Subscription';
import Member from '@/models/Member';
import Payment from '@/models/Payment';
import Seat from '@/models/Seat';
import WaitingList from '@/models/WaitingList';
import User from '@/models/User';
import Grievance from '@/models/Grievance';
import Inventory from '@/models/Inventory';
import Expense from '@/models/Expense';

// GET notifications for current user (supports all roles)
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    // Build query based on user role
    const query: any = { 
      $or: [
        { user: session.user.id },
        // For role-based notifications
        { isForRole: true, targetRole: session.user.role }
      ]
    };

    if (unreadOnly) {
      query.read = false;
    }

    if (category) {
      query.category = category;
    }

    const notifications = await Notification.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ ...query, read: false });

    return NextResponse.json({
      notifications,
      totalCount,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST - Generate notifications (Admin only) or create custom notification
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();
    const body = await request.json();
    const { action } = body;

    if (action === 'generate') {
      // Run all notification generation functions
      await generateAllNotifications();
      return NextResponse.json({ message: 'Notifications generated successfully' });
    } else if (action === 'create') {
      // Create custom notification
      const { userId, type, title, message, priority, category, data, targetRole, isForRole } = body;
      
      if (!type || !title || !message) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      if (isForRole && targetRole) {
        // Send to all users with the target role
        const users = await User.find({ role: targetRole });
        const notifications = users.map(user => ({
          user: user._id,
          type,
          title,
          message,
          priority: priority || 'medium',
          category: category || 'system',
          data: data || {},
          isForRole: true,
          targetRole
        }));
        
        await Notification.insertMany(notifications);
        return NextResponse.json({ message: `Created ${notifications.length} notifications` });
      } else if (userId) {
        const notification = await Notification.create({
          user: userId,
          type,
          title,
          message,
          priority: priority || 'medium',
          category: category || 'system',
          data: data || {}
        });
        return NextResponse.json(notification);
      } else {
        return NextResponse.json({ error: 'Must specify userId or targetRole' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in notifications POST:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

// DELETE - Clear all notifications (Admin)
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const olderThan = searchParams.get('olderThan');
    
    let query: any = {};
    if (olderThan) {
      const date = new Date(olderThan);
      query.createdAt = { $lt: date };
    }

    const result = await Notification.deleteMany(query);
    return NextResponse.json({ deleted: result.deletedCount });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 });
  }
}

// Master function to generate all notifications
async function generateAllNotifications() {
  await generateSubscriptionNotifications();
  await generatePaymentNotifications();
  await generateSeatNotifications();
  await generateGrievanceNotifications();
  await generateInventoryNotifications();
  await generateMemberNotifications();
}

// Generate subscription-related notifications
async function generateSubscriptionNotifications() {
  const managers = await User.find({ role: { $in: ['Admin', 'Manager'] } });

  // Subscription expiring in 7 days (for member notification)
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const expiringIn7Days = await Subscription.find({
    endDate: { $lte: sevenDaysFromNow, $gte: new Date() },
    status: 'active'
  }).populate('member');

  for (const sub of expiringIn7Days) {
    // Notify member
    if (sub.member?.userId) {
      const existing = await Notification.findOne({
        user: sub.member.userId,
        type: 'subscription_expiry_reminder',
        'data.subscriptionId': sub._id
      });
      if (!existing) {
        await Notification.create({
          user: sub.member.userId,
          type: 'subscription_expiry_reminder',
          title: 'Subscription Expiring Soon',
          message: `Your subscription expires on ${sub.endDate.toDateString()}. Please renew to continue using the space.`,
          data: { memberId: sub.member._id, subscriptionId: sub._id, date: sub.endDate },
          priority: 'high',
          category: 'subscription',
          actionUrl: '/profile'
        });
      }
    }

    // Notify managers
    for (const manager of managers) {
      const existing = await Notification.findOne({
        user: manager._id,
        type: 'member_subscription_expiring',
        'data.subscriptionId': sub._id
      });
      if (!existing) {
        await Notification.create({
          user: manager._id,
          type: 'member_subscription_expiring',
          title: 'Member Subscription Expiring',
          message: `${sub.member?.name}'s subscription expires on ${sub.endDate.toDateString()}`,
          data: { memberId: sub.member?._id, memberName: sub.member?.name, subscriptionId: sub._id, date: sub.endDate },
          priority: 'high',
          category: 'subscription'
        });
      }
    }
  }

  // Subscription expiring in 3 days (urgent)
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const expiringIn3Days = await Subscription.find({
    endDate: { $lte: threeDaysFromNow, $gte: new Date() },
    status: 'active'
  }).populate('member');

  for (const sub of expiringIn3Days) {
    if (sub.member?.userId) {
      const existing = await Notification.findOne({
        user: sub.member.userId,
        type: 'subscription_expiry_3days',
        'data.subscriptionId': sub._id
      });
      if (!existing) {
        await Notification.create({
          user: sub.member.userId,
          type: 'subscription_expiry_3days',
          title: '⚠️ Urgent: Subscription Expiring in 3 Days',
          message: `Your subscription will expire on ${sub.endDate.toDateString()}. Please renew immediately!`,
          data: { memberId: sub.member._id, subscriptionId: sub._id, date: sub.endDate },
          priority: 'critical',
          category: 'subscription',
          actionUrl: '/profile'
        });
      }
    }
  }

  // Expired subscriptions
  const expiredSubs = await Subscription.find({
    endDate: { $lt: new Date() },
    status: 'active'
  }).populate('member');

  for (const sub of expiredSubs) {
    // Update status to expired
    await Subscription.findByIdAndUpdate(sub._id, { status: 'expired' });

    // Notify member
    if (sub.member?.userId) {
      const existing = await Notification.findOne({
        user: sub.member.userId,
        type: 'subscription_expired',
        'data.subscriptionId': sub._id
      });
      if (!existing) {
        await Notification.create({
          user: sub.member.userId,
          type: 'subscription_expired',
          title: 'Subscription Expired',
          message: `Your subscription has expired. Please renew to regain access to the coworking space.`,
          data: { memberId: sub.member._id, subscriptionId: sub._id, date: sub.endDate },
          priority: 'critical',
          category: 'subscription',
          actionUrl: '/profile'
        });
      }
    }

    // Notify managers
    for (const manager of managers) {
      const existing = await Notification.findOne({
        user: manager._id,
        type: 'member_subscription_expired',
        'data.subscriptionId': sub._id
      });
      if (!existing) {
        await Notification.create({
          user: manager._id,
          type: 'member_subscription_expired',
          title: 'Member Subscription Expired',
          message: `${sub.member?.name}'s subscription has expired.`,
          data: { memberId: sub.member?._id, memberName: sub.member?.name, subscriptionId: sub._id },
          priority: 'high',
          category: 'subscription'
        });
      }
    }
  }
}

// Generate payment-related notifications
async function generatePaymentNotifications() {
  const managers = await User.find({ role: { $in: ['Admin', 'Manager'] } });

  // Payment overdue - subscriptions expired without payments
  const expiredSubs = await Subscription.find({
    endDate: { $lt: new Date() },
    status: 'expired'
  }).populate('member');

  for (const sub of expiredSubs) {
    if (!sub.payments || sub.payments.length === 0) {
      for (const manager of managers) {
        const existing = await Notification.findOne({
          user: manager._id,
          type: 'payment_overdue',
          'data.subscriptionId': sub._id
        });
        if (!existing) {
          await Notification.create({
            user: manager._id,
            type: 'payment_overdue',
            title: 'Payment Overdue',
            message: `Payment overdue for ${sub.member?.name} since ${sub.endDate.toDateString()}`,
            data: { memberId: sub.member?._id, memberName: sub.member?.name, subscriptionId: sub._id, amount: sub.totalAmount },
            priority: 'high',
            category: 'payment'
          });
        }
      }
    }
  }

  // Check for pending payments - notify managers daily
  const pendingCount = await Payment.countDocuments({});
  if (pendingCount > 0) {
    for (const manager of managers) {
      const existingToday = await Notification.findOne({
        user: manager._id,
        type: 'pending_payments',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      if (!existingToday) {
        await Notification.create({
          user: manager._id,
          type: 'pending_payments',
          title: 'Pending Payments Summary',
          message: `There are ${pendingCount} payment records in the system.`,
          data: { count: pendingCount },
          priority: 'medium',
          category: 'payment'
        });
      }
    }
  }
}

// Generate seat-related notifications
async function generateSeatNotifications() {
  const managers = await User.find({ role: { $in: ['Admin', 'Manager'] } });
  
  // Get all waiting list members
  const waitingList = await WaitingList.find().populate('member');
  
  // Check for vacant seats
  const vacantSeats = await Seat.find({ status: 'vacant' }).populate('location');

  if (vacantSeats.length > 0) {
    // Notify managers
    for (const manager of managers) {
      const existing = await Notification.findOne({
        user: manager._id,
        type: 'seat_became_vacant',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      if (!existing) {
        await Notification.create({
          user: manager._id,
          type: 'seat_became_vacant',
          title: 'Seats Available',
          message: `${vacantSeats.length} seats are now vacant across all locations.`,
          data: { seatCount: vacantSeats.length, count: waitingList.length },
          priority: 'medium',
          category: 'seat'
        });
      }
    }

    // Notify waiting list members
    for (const waiting of waitingList) {
      if (waiting.member?.userId) {
        const existing = await Notification.findOne({
          user: waiting.member.userId,
          type: 'seat_available',
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // one per week
        });
        if (!existing) {
          await Notification.create({
            user: waiting.member.userId,
            type: 'seat_available',
            title: '🎉 A Seat is Now Available!',
            message: `A seat has become available. Please confirm within 24 hours to secure your spot.`,
            data: { memberId: waiting.member._id, waitingListId: waiting._id },
            priority: 'high',
            category: 'seat',
            actionUrl: '/seats'
          });
        }
      }
    }
  }

  // Capacity warning for managers
  const totalSeats = await Seat.countDocuments();
  const occupiedSeats = await Seat.countDocuments({ status: 'occupied' });
  const occupancyRate = totalSeats > 0 ? (occupiedSeats / totalSeats) * 100 : 0;

  if (occupancyRate >= 90 && totalSeats > 0) {
    for (const manager of managers) {
      const existing = await Notification.findOne({
        user: manager._id,
        type: 'capacity_warning',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      if (!existing) {
        await Notification.create({
          user: manager._id,
          type: 'capacity_warning',
          title: 'Capacity Warning',
          message: `Seats are ${occupancyRate.toFixed(1)}% occupied (${occupiedSeats}/${totalSeats}). Consider expanding capacity.`,
          data: { totalSeats, occupiedSeats, occupancyRate: occupancyRate.toFixed(1) },
          priority: 'high',
          category: 'seat'
        });
      }
    }
  }
}

// Generate grievance-related notifications
async function generateGrievanceNotifications() {
  const managers = await User.find({ role: { $in: ['Admin', 'Manager'] } });
  
  // New grievances
  const recentGrievances = await Grievance.find({
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    status: 'Pending'
  }).populate('reportedBy');

  for (const grievance of recentGrievances) {
    for (const manager of managers) {
      const existing = await Notification.findOne({
        user: manager._id,
        type: 'new_grievance',
        'data.grievanceId': grievance._id.toString()
      });
      if (!existing) {
        const isHighPriority = grievance.priority === 'High' || grievance.priority === 'Critical';
        await Notification.create({
          user: manager._id,
          type: isHighPriority ? 'high_priority_grievance' : 'new_grievance',
          title: isHighPriority ? `⚠️ High Priority Grievance: ${grievance.title}` : `New Grievance: ${grievance.title}`,
          message: `${grievance.category} - ${grievance.priority} priority grievance reported.`,
          data: { 
            grievanceId: grievance._id.toString(), 
            grievanceTitle: grievance.title,
            category: grievance.category,
            priority: grievance.priority,
            locationId: grievance.location
          },
          priority: isHighPriority ? 'critical' : 'high',
          category: 'grievance'
        });
      }
    }

    // Notify the member who submitted
    if (grievance.reportedBy) {
      const existing = await Notification.findOne({
        user: grievance.reportedBy._id,
        type: 'grievance_submitted',
        'data.grievanceId': grievance._id.toString()
      });
      if (!existing) {
        await Notification.create({
          user: grievance.reportedBy._id,
          type: 'grievance_submitted',
          title: 'Grievance Submitted',
          message: `Your grievance "${grievance.title}" has been submitted. We'll address it soon.`,
          data: { grievanceId: grievance._id.toString(), grievanceTitle: grievance.title, category: grievance.category },
          priority: 'medium',
          category: 'grievance'
        });
      }
    }
  }

  // Long-pending grievances (>3 days)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  const unresolvedGrievances = await Grievance.find({
    createdAt: { $lt: threeDaysAgo },
    status: { $in: ['Pending', 'In Progress'] }
  });

  for (const grievance of unresolvedGrievances) {
    for (const manager of managers) {
      const existing = await Notification.findOne({
        user: manager._id,
        type: 'grievance_unresolved_long',
        'data.grievanceId': grievance._id.toString()
      });
      if (!existing) {
        await Notification.create({
          user: manager._id,
          type: 'grievance_unresolved_long',
          title: 'Grievance Pending Too Long',
          message: `Grievance "${grievance.title}" pending for more than 3 days.`,
          data: { grievanceId: grievance._id.toString(), grievanceTitle: grievance.title },
          priority: 'medium',
          category: 'grievance'
        });
      }
    }
  }
}

// Generate inventory-related notifications
async function generateInventoryNotifications() {
  const managers = await User.find({ role: { $in: ['Admin', 'Manager'] } });
  
  // Check for broken equipment
  const brokenItems = await Inventory.find({ status: 'Broken' }).populate('location');
  
  for (const item of brokenItems) {
    for (const manager of managers) {
      const existing = await Notification.findOne({
        user: manager._id,
        type: 'equipment_broken',
        'data.inventoryId': item._id.toString()
      });
      if (!existing) {
        await Notification.create({
          user: manager._id,
          type: 'equipment_broken',
          title: 'Equipment Reported Broken',
          message: `${item.name} at ${(item.location as any)?.name || 'Unknown Location'} is marked as broken.`,
          data: { inventoryId: item._id.toString(), inventoryName: item.name, category: item.category },
          priority: 'high',
          category: 'inventory'
        });
      }
    }
  }

  // Low inventory items
  const lowItems = await Inventory.find({ quantity: { $lte: 2 } });
  
  for (const item of lowItems) {
    for (const manager of managers) {
      const existing = await Notification.findOne({
        user: manager._id,
        type: 'inventory_low',
        'data.inventoryId': item._id.toString()
      });
      if (!existing) {
        await Notification.create({
          user: manager._id,
          type: 'inventory_low',
          title: 'Low Inventory Alert',
          message: `${item.name} running low. Current quantity: ${item.quantity}`,
          data: { inventoryId: item._id.toString(), inventoryName: item.name, quantity: item.quantity },
          priority: 'medium',
          category: 'inventory'
        });
      }
    }
  }
}

// Generate member management notifications
async function generateMemberNotifications() {
  const managers = await User.find({ role: { $in: ['Admin', 'Manager'] } });
  
  // Check for new members (members registered in last 24 hours without notification)
  // This would require tracking notification history
  // For now, we'll handle this in the member creation endpoint
}
