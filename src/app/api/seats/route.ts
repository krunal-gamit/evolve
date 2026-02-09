import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Seat from '@/models/Seat';
import Location from '@/models/Location';
import Subscription from '@/models/Subscription';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    const filter: any = {};
    if (locationId) {
      filter.location = locationId;
    }

    const seats = await Seat.find(filter)
      .sort({ seatNumber: 1 })
      .populate('assignedMember', 'name')
      .populate('subscription', 'endDate status')
      .populate('location', 'name address');

    return NextResponse.json(seats);
  } catch (error) {
    console.error('Error in GET /api/seats:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch seats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user || (session.user.role !== 'Manager' && session.user.role !== 'Admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();
    const { locationId, seatNumbers, totalSeats } = await request.json();

    if (!locationId) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    }

    // Check if location exists
    const location = await Location.findById(locationId);
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const seats = [];

    if (seatNumbers && Array.isArray(seatNumbers)) {
      // Create specific seats
      for (const seatNumber of seatNumbers) {
        seats.push({
          seatNumber: parseInt(seatNumber, 10),
          location: locationId,
          status: 'vacant'
        });
      }
    } else if (totalSeats) {
      // Create sequential seats
      const existingSeats = await Seat.find({ location: locationId }).select('seatNumber');
      const existingNumbers = new Set(existingSeats.map(s => s.seatNumber));
      const existingCount = existingSeats.length;
      
      for (let i = 1; i <= parseInt(totalSeats, 10); i++) {
        const seatNum = existingCount + i;
        if (!existingNumbers.has(seatNum)) {
          seats.push({
            seatNumber: seatNum,
            location: locationId,
            status: 'vacant'
          });
        }
      }
    }

    if (seats.length > 0) {
      try {
        await Seat.insertMany(seats, { ordered: false });
      } catch (error: any) {
        // Handle duplicate key errors gracefully
        if (error.code !== 11000) {
          throw error;
        }
      }
    }

    const newSeats = await Seat.find({ location: locationId }).sort({ seatNumber: 1 });
    return NextResponse.json(newSeats, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/seats:', error);
    const message = error instanceof Error ? error.message : 'Failed to create seats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}