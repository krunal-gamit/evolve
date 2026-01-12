import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import dbConnect from '@/lib/mongodb';

import FeeType from '@/models/FeeType';
import Log from '@/models/Log';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !session.user || (session.user.role !== 'Manager' && session.user.role !== 'Admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await dbConnect();

  const { id } = await params;

  const { name, amount, duration } = await request.json();

  const feeType = await FeeType.findByIdAndUpdate(id, { name, amount, duration }, { new: true });

  if (!feeType) {
    return NextResponse.json({ error: 'Fee type not found' }, { status: 404 });
  }

  await Log.create({
    action: 'UPDATE',
    entity: 'FeeType',
    entityId: id,
    details: `Updated fee type: ${feeType.name}`,
    performedBy: session.user.email,
  });

  return NextResponse.json(feeType);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !session.user || (session.user.role !== 'Manager' && session.user.role !== 'Admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await dbConnect();

  const { id } = await params;

  const feeType = await FeeType.findByIdAndDelete(id);

  if (!feeType) {
    return NextResponse.json({ error: 'Fee type not found' }, { status: 404 });
  }

  await Log.create({
    action: 'DELETE',
    entity: 'FeeType',
    entityId: id,
    details: `Deleted fee type: ${feeType.name} for ₹${feeType.amount}`,
    performedBy: session.user.email,
  });

  return NextResponse.json({ message: 'Fee type deleted' });
}