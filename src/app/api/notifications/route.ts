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

export async function GET() {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const notifications = await Notification.find({ user: session.user.id })
      .sort({ priority: -1, createdAt: -1 })
      .limit(50);
    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

async function generateNotifications() {
  await dbConnect();

  const managers = await User.find({ role: { $in: ['Admin', 'Manager'] } });

  // Subscription expiring in 3 days
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const expiringSubscriptions = await Subscription.find({
    endDate: { $lte: threeDaysFromNow, $gte: new Date() },
    status: 'active'
  }).populate('member');

  for (const sub of expiringSubscriptions) {
    for (const manager of managers) {
      const existing = await Notification.findOne({
        user: manager._id,
        type: 'subscription_expiry',
        'data.subscriptionId': sub._id
      });
      if (!existing) {
        await Notification.create({
          user: manager._id,
          type: 'subscription_expiry',
          title: 'Subscription Expiring Soon',
          message: `${sub.member.name}'s subscription expires on ${sub.endDate.toDateString()}`,
          data: { memberId: sub.member._id, subscriptionId: sub._id, date: sub.endDate },
          priority: 'high'
        });
      }
    }
  }

  // Payment overdue - subscriptions expired without payments
  const expiredSubs = await Subscription.find({
    endDate: { $lt: new Date() },
    status: 'expired'
  }).populate('member payments');

  for (const sub of expiredSubs) {
    if (sub.payments.length === 0) {
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
            message: `Payment overdue for ${sub.member.name} since ${sub.endDate.toDateString()}`,
            data: { memberId: sub.member._id, subscriptionId: sub._id, amount: sub.totalAmount },
            priority: 'high'
          });
        }
      }
    }
  }

  // Seat available - if vacant seats and waiting list
  const vacantSeats = await Seat.find({ status: 'vacant' });
  const waitingCount = await WaitingList.countDocuments();

  if (vacantSeats.length > 0 && waitingCount > 0) {
    for (const manager of managers) {
      const existing = await Notification.findOne({
        user: manager._id,
        type: 'seat_available',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // last 24h
      });
      if (!existing) {
        await Notification.create({
          user: manager._id,
          type: 'seat_available',
          title: 'Seats Available',
          message: `${vacantSeats.length} seats vacant, ${waitingCount} members waiting`,
          data: { seatCount: vacantSeats.length, waitingCount },
          priority: 'medium'
        });
      }
    }
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await generateNotifications();
    return NextResponse.json({ message: 'Notifications generated' });
  } catch (error) {
    console.error('Error generating notifications:', error);
    return NextResponse.json({ error: 'Failed to generate notifications' }, { status: 500 });
  }
}