import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import dbConnect from '@/lib/mongodb';

import FeeType from '@/models/FeeType';
import Log from '@/models/Log';

export async function GET() {
  const session = await auth();
  if (!session || !session.user || (session.user.role !== 'Manager' && session.user.role !== 'Admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await dbConnect();

  const feeTypes = await FeeType.find().sort({ createdAt: -1 });

  return NextResponse.json(feeTypes);

}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user || (session.user.role !== 'Manager' && session.user.role !== 'Admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();

    const { name, amount, duration } = await request.json();

    const feeType = new FeeType({ name, amount, duration });

    await feeType.save();

    await Log.create({
      action: 'CREATE',
      entity: 'FeeType',
      entityId: feeType._id,
      details: `Created fee type: ${name} for ₹${amount}`,
      performedBy: session.user.email,
    });

    return NextResponse.json(feeType);
  } catch (error) {
    console.error('Error in POST /api/fees:', error);
    const message = error instanceof Error ? error.message : 'Failed to create fee type';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}