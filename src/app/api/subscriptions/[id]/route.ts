import { NextRequest, NextResponse } from 'next/server';

import dbConnect from '@/lib/mongodb';

import Subscription from '@/models/Subscription';

import Seat from '@/models/Seat';

import WaitingList from '@/models/WaitingList';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {

  await dbConnect();

  const { id } = await params;

  const subscription = await Subscription.findById(id);

  if (!subscription) {

    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

  }

  subscription.status = 'expired';

  await subscription.save();

  // free seat

  const seat = await Seat.findById(subscription.seat);

  if (seat) {

    seat.status = 'vacant';

    seat.assignedMember = null;

    seat.subscription = null;

    await seat.save();

  }

  // assign to next in waiting list

  const nextWaiting = await WaitingList.findOne().sort({ requestedDate: 1 });

  if (nextWaiting) {

    // assign the seat to this member

    seat.status = 'occupied';

    seat.assignedMember = nextWaiting.member;

    await seat.save();

    // remove from waiting

    await WaitingList.findByIdAndDelete(nextWaiting._id);

  }

  return NextResponse.json({ message: 'Subscription ended' });

}