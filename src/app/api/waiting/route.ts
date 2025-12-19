import { NextResponse } from 'next/server';

import dbConnect from '@/lib/mongodb';

import WaitingList from '@/models/WaitingList';

export async function GET() {

  await dbConnect();

  const waiting = await WaitingList.find().populate('member', 'name email').sort({ requestedDate: 1 });

  return NextResponse.json(waiting);

}