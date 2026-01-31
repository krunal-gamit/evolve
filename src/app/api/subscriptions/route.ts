import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Subscription from '@/models/Subscription';
import Member from '@/models/Member';
import Seat from '@/models/Seat';
import Payment from '@/models/Payment';
import WaitingList from '@/models/WaitingList';
import Log from '@/models/Log';
import Location from '@/models/Location';

function calculateEndDate(start: Date, duration: string) {
  const startDate = new Date(start);
  if (duration.includes('month')) {
    const months = parseInt(duration.split(' ')[0]);
    startDate.setMonth(startDate.getMonth() + months);
  } else {
    const days = parseInt(duration.split(' ')[0]) || 0;
    startDate.setDate(startDate.getDate() + days);
  }
  return startDate;
}

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    // Update expired subscriptions
    const now = new Date();
    const expiredSubscriptions = await Subscription.find({
      endDate: { $lt: now },
      status: 'active'
    });

    for (const sub of expiredSubscriptions) {
      sub.status = 'expired';
      await sub.save();
      const seat = await Seat.findById(sub.seat);
      if (seat && seat.status === 'occupied') {
        seat.status = 'vacant';
        seat.assignedMember = null;
        seat.subscription = null;
        await seat.save();
      }
    }

    const filter: any = {};
    if (locationId) {
      filter.location = locationId;
    }

    const subscriptions = await Subscription.find(filter)
      .populate('member', 'name email memberId phone address examPrep createdAt')
      .populate('seat', 'seatNumber status')
      .populate('location', 'name address')
      .populate('payments')
      .sort({ createdAt: -1 });

    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error('Error in GET /api/subscriptions:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch subscriptions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user || (session.user.role !== 'Manager' && session.user.role !== 'Admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();
    const { memberId, seatNumber, startDate, duration, amount, paymentMethod, upiCode, dateTime, locationId } = await request.json();

    if (!locationId) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    }

    // Check if location exists
    const location = await Location.findById(locationId);
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const seat = await Seat.findOne({ seatNumber, location: locationId });

    if (!seat) {
      return NextResponse.json({ error: 'Seat not found at this location' }, { status: 404 });
    }

    let shouldAssign = false;

    if (seat.status === 'occupied') {
      const currentSubscription = await Subscription.findById(seat.subscription);
      if (currentSubscription && currentSubscription.endDate < new Date()) {
        currentSubscription.status = 'expired';
        await currentSubscription.save();
        seat.status = 'vacant';
        seat.assignedMember = null;
        seat.subscription = null;
        await seat.save();
        shouldAssign = true;
      } else {
        const waiting = new WaitingList({
          member: memberId,
          location: locationId,
          startDate,
          duration,
          amount,
          paymentMethod,
          upiCode: paymentMethod === 'UPI' ? upiCode : undefined,
          dateTime,
        });
        await waiting.save();
        return NextResponse.json({ message: 'Seat occupied, added to waiting list' });
      }
    } else {
      shouldAssign = true;
    }

    if (shouldAssign) {
      const endDate = calculateEndDate(new Date(startDate), duration);
      const subscription = new Subscription({
        member: memberId,
        location: locationId,
        seat: seat._id,
        startDate: new Date(startDate),
        endDate,
        duration,
        totalAmount: amount,
      });
      await subscription.save();

      // Generate unique code
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const lastPayment = await Payment.findOne().sort({ createdAt: -1 });
      const counter = lastPayment && lastPayment.uniqueCode ? parseInt(lastPayment.uniqueCode.slice(-3)) + 1 : 1;
      const uniqueCode = `EVOLVE${year}${month}${String(counter).padStart(3, '0')}`;

      const payment = new Payment({
        subscription: subscription._id,
        amount,
        method: paymentMethod,
        upiCode: paymentMethod === 'UPI' ? upiCode : undefined,
        dateTime: new Date(dateTime),
        uniqueCode,
      });
      await payment.save();

      subscription.payments.push(payment._id);
      await subscription.save();

      seat.status = 'occupied';
      seat.assignedMember = memberId;
      seat.subscription = subscription._id;
      await seat.save();

      await Log.create({
        action: 'CREATE',
        entity: 'Subscription',
        entityId: subscription._id,
        details: `Created subscription for member ${memberId} on seat ${seatNumber} at ${location.name}`,
        performedBy: session.user.email
      });

      return NextResponse.json(subscription);
    }
  } catch (error) {
    console.error('Error in POST /api/subscriptions:', error);
    const message = error instanceof Error ? error.message : 'Failed to create subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
