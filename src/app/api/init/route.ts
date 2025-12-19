import { NextResponse } from 'next/server';

import dbConnect from '@/lib/mongodb';

import Seat from '@/models/Seat';

export async function POST() {

  await dbConnect();

  const existing = await Seat.countDocuments();

  if (existing > 0) {

    return NextResponse.json({ message: 'Seats already initialized' });

  }

  const seats = [];

  for (let i = 1; i <= 46; i++) {

    seats.push({ seatNumber: i, status: 'vacant' });

  }

  await Seat.insertMany(seats);

  return NextResponse.json({ message: 'Seats initialized' });

}