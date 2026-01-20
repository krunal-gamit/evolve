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