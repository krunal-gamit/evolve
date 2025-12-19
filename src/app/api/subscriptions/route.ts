import { NextRequest, NextResponse } from 'next/server';

import dbConnect from '@/lib/mongodb';

import Subscription from '@/models/Subscription';

import Seat from '@/models/Seat';

import Payment from '@/models/Payment';

import WaitingList from '@/models/WaitingList';

function calculateEndDate(start: Date, duration: string) {

  const startDate = new Date(start);

  if (duration.includes('days')) {

    const days = parseInt(duration.split(' ')[0]);

    startDate.setDate(startDate.getDate() + days);

  } else if (duration.includes('month')) {

    const months = parseInt(duration.split(' ')[0]);

    startDate.setMonth(startDate.getMonth() + months);

  }

  return startDate;

}

export async function GET() {

  await dbConnect();

  const subscriptions = await Subscription.find()

    .populate('member', 'name email')

    .populate('seat', 'seatNumber')

    .populate('payments');

  return NextResponse.json(subscriptions);

}

export async function POST(request: NextRequest) {

  await dbConnect();

  const { memberId, seatNumber, startDate, duration, amount, paymentMethod, upiCode, dateTime } = await request.json();

  const seat = await Seat.findOne({ seatNumber });

  if (!seat) {

    return NextResponse.json({ error: 'Seat not found' }, { status: 404 });

  }

  let shouldAssign = false;

  if (seat.status === 'occupied') {

    // check if current subscription has expired

    const currentSubscription = await Subscription.findById(seat.subscription);

    if (currentSubscription && currentSubscription.endDate < new Date()) {

      // expire old subscription and free seat

      currentSubscription.status = 'expired';

      await currentSubscription.save();

      seat.status = 'vacant';

      seat.assignedMember = null;

      seat.subscription = null;

      await seat.save();

      shouldAssign = true;

    } else {

      // add to waiting list

      const waiting = new WaitingList({ member: memberId });

      await waiting.save();

      return NextResponse.json({ message: 'Seat occupied, added to waiting list' });

    }

  } else {

    shouldAssign = true;

  }

  if (shouldAssign) {

    // assign seat

    const endDate = calculateEndDate(new Date(startDate), duration);

    const subscription = new Subscription({

      member: memberId,

      seat: seat._id,

      startDate: new Date(startDate),

      endDate,

      duration,

      totalAmount: amount,

    });

    await subscription.save();

    const payment = new Payment({

      subscription: subscription._id,

      amount,

      method: paymentMethod,

      upiCode: paymentMethod === 'UPI' ? upiCode : undefined,

      dateTime: new Date(dateTime),

    });

    await payment.save();

    subscription.payments.push(payment._id);

    await subscription.save();

    seat.status = 'occupied';

    seat.assignedMember = memberId;

    seat.subscription = subscription._id;

    await seat.save();

    return NextResponse.json(subscription);

  }

}