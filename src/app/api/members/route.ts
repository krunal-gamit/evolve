import { NextRequest, NextResponse } from 'next/server';

import dbConnect from '@/lib/mongodb';

import Member from '@/models/Member';

export async function GET() {

  await dbConnect();

  const members = await Member.find();

  return NextResponse.json(members);

}

export async function POST(request: NextRequest) {

  await dbConnect();

  const { name, email, phone, address } = await request.json();

  const member = new Member({ name, email, phone, address });

  await member.save();

  return NextResponse.json(member);

}