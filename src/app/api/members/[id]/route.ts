import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import dbConnect from '@/lib/mongodb';

import Member from '@/models/Member';
import User from '@/models/User';
import Log from '@/models/Log';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const { id } = await params;

  // Check if the user is requesting their own data or is an admin/manager
  const isOwnData = session.user.id === id || session.user.role === 'Admin' || session.user.role === 'Manager';
  
  if (!isOwnData) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Try to find member by different methods
  let member = null;

  // First try: Find by Member's _id
  try {
    member = await Member.findOne({ _id: id });
  } catch (e) {
    // Invalid ObjectId, try other methods
  }

  // Second try: Find by memberId field
  if (!member) {
    member = await Member.findOne({ memberId: id });
  }

  // Third try: Find by User's _id - need to find user first, then get member by email
  if (!member) {
    const user = await User.findById(id);
    if (user) {
      member = await Member.findOne({ email: user.email });
    }
  }

  // Fourth try: Find by session user's email (most reliable for current user)
  if (!member) {
    member = await Member.findOne({ email: session.user.email });
  }
  
  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  return NextResponse.json(member);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !session.user || (session.user.role !== 'Manager' && session.user.role !== 'Admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await dbConnect();

  const { id } = await params;

  const { name, email, phone, address, examPrep } = await request.json();

  const member = await Member.findByIdAndUpdate(id, { name, email, phone, address, examPrep }, { new: true });

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  await Log.create({
    action: 'UPDATE',
    entity: 'Member',
    entityId: id,
    details: `Updated member: ${member.name}`,
    performedBy: session.user.email,
  });

  return NextResponse.json(member);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !session.user || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await dbConnect();

  const { id } = await params;

  const member = await Member.findById(id);
  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  // Delete member and corresponding user account
  await Member.findByIdAndDelete(id);
  await User.findOneAndDelete({ email: member.email });

  await Log.create({
    action: 'DELETE',
    entity: 'Member',
    entityId: id,
    details: `Deleted member: ${member.name} (${member.email}) and associated user account`,
    performedBy: session.user.email,
  });

  return NextResponse.json({ message: 'Member and user account deleted' });
}
