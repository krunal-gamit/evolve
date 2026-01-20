import { NextResponse } from 'next/server';

import dbConnect from '@/lib/mongodb';

import Seat from '@/models/Seat';

import Member from '@/models/Member';

import Subscription from '@/models/Subscription';

export async function GET() {
  try {
    await dbConnect();

    const seats = await Seat.find()
      .sort({ seatNumber: 1 })
      .populate('assignedMember', 'name')
      .populate('subscription', 'endDate status');

    return NextResponse.json(seats);
  } catch (error) {
    console.error('Error in GET /api/seats:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch seats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}