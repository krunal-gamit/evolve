import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import dbConnect from '@/lib/mongodb';

import Member from '@/models/Member';
import User from '@/models/User';
import Log from '@/models/Log';

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