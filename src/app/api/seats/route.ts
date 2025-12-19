import { NextResponse } from 'next/server';

import dbConnect from '@/lib/mongodb';

import Seat from '@/models/Seat';

export async function GET() {

  await dbConnect();

  const seats = await Seat.find()

    .sort({ seatNumber: 1 })

    .populate('assignedMember', 'name')

    .populate({

      path: 'subscription',

      select: 'endDate status',

      populate: { path: 'member', select: 'name' }

    });

  return NextResponse.json(seats);

}