import { NextResponse } from 'next/server';

import dbConnect from '@/lib/mongodb';

import WaitingList from '@/models/WaitingList';

import Member from '@/models/Member';

export async function GET() {
  try {
    await dbConnect();

    const waiting = await WaitingList.find().populate('member', 'name email memberId').sort({ requestedDate: -1 });

    return NextResponse.json(waiting);
  } catch (error) {
    console.error('Error in GET /api/waiting:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch waiting list';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    
    if (!body.memberId) {
      return NextResponse.json({ error: 'Member is required' }, { status: 400 });
    }
    
    // Check if member is already on waiting list for this location
    const existing = await WaitingList.findOne({ 
      member: body.memberId,
      location: body.locationId || null
    });
    
    if (existing) {
      return NextResponse.json({ error: 'Member is already on the waiting list for this location' }, { status: 400 });
    }

    const waitingEntry = await WaitingList.create({
      member: body.memberId,
      location: body.locationId || null,
      startDate: body.startDate || new Date().toISOString().split('T')[0],
      duration: body.duration || '30 days',
      amount: body.amount || 0,
      paymentMethod: body.paymentMethod || 'cash',
      upiCode: body.upiCode || '',
      dateTime: body.dateTime || new Date().toISOString(),
    });

    const populated = await WaitingList.findById(waitingEntry._id).populate('member', 'name email memberId');

    return NextResponse.json({ message: 'Added to waiting list successfully', data: populated }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/waiting:', error);
    const message = error instanceof Error ? error.message : 'Failed to add to waiting list';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}