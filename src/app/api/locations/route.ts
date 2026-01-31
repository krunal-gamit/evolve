import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Location from '@/models/Location';

export async function GET() {
  try {
    await dbConnect();
    const locations = await Location.find({ isActive: true }).sort({ createdAt: -1 });
    return NextResponse.json(locations);
  } catch (error) {
    console.error('Error in GET /api/locations:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch locations';
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
    const { name, address, totalSeats } = await request.json();

    if (!name || !address || totalSeats === undefined) {
      return NextResponse.json({ error: 'Name, address, and totalSeats are required' }, { status: 400 });
    }

    const location = await Location.create({
      name,
      address,
      totalSeats: parseInt(totalSeats, 10),
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/locations:', error);
    const message = error instanceof Error ? error.message : 'Failed to create location';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
