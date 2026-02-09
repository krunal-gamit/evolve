import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Location from '@/models/Location';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !session.user || (session.user.role !== 'Manager' && session.user.role !== 'Admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const { name, address, totalSeats, isActive } = await request.json();

    const location = await Location.findById(id);
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    if (name !== undefined) location.name = name;
    if (address !== undefined) location.address = address;
    if (totalSeats !== undefined) location.totalSeats = parseInt(totalSeats, 10);
    if (isActive !== undefined) location.isActive = isActive;

    await location.save();
    return NextResponse.json(location);
  } catch (error) {
    console.error('Error in PUT /api/locations/[id]:', error);
    const message = error instanceof Error ? error.message : 'Failed to update location';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !session.user || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();
    const { id } = await params;

    const location = await Location.findById(id);
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Soft delete - set isActive to false
    location.isActive = false;
    await location.save();

    return NextResponse.json({ message: 'Location deactivated successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/locations/[id]:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete location';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
