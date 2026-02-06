import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import qrcode from 'qrcode';

import dbConnect from '@/lib/mongodb';

import Member from '@/models/Member';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import Log from '@/models/Log';

export async function GET() {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  // Members can only see their own profile, managers/admins can see all
  if (session.user.role === 'Member') {
    // Assuming member email matches user email
    const member = await Member.findOne({ email: session.user.email });
    return NextResponse.json(member ? [member] : []);
  }

  const members = await Member.find();
  return NextResponse.json(members);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user || (session.user.role !== 'Manager' && session.user.role !== 'Admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();

    const { name, email, phone, address, examPrep } = await request.json();

    // Validate required fields
    if (!name || !email || !phone || !address) {
      return NextResponse.json({ error: 'Name, email, phone, and address are required' }, { status: 400 });
    }

    // Check if member with this email already exists
    const existingMember = await Member.findOne({ email });
    if (existingMember) {
      return NextResponse.json({ error: 'Member with this email already exists' }, { status: 400 });
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'User account with this email already exists' }, { status: 400 });
    }

    // Generate memberId: EVOLVE[4digit year][2digit month][001]
    // Sequence resets each month
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `EVOLVE${year}${month}`;
    
    // Find last member from current month only
    const lastMemberOfMonth = await Member.findOne({
      memberId: { $regex: `^${monthPrefix}` }
    }).sort({ memberId: -1 });
    
    let nextNumber = 1;
    if (lastMemberOfMonth && lastMemberOfMonth.memberId) {
      const lastNum = parseInt(lastMemberOfMonth.memberId.slice(-3));
      nextNumber = lastNum + 1;
    }
    const memberId = `${monthPrefix}${nextNumber.toString().padStart(3, '0')}`;

    const member = new Member({ memberId, name, email, phone, address, examPrep });

    await member.save();

    // Create user account for member with default password
    const defaultPassword = 'password123'; // TODO: Send email to set password
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const qrCodeData = `Member ID: ${memberId}\nName: ${name}\nEmail: ${email}`;
    const qrCode = await qrcode.toDataURL(qrCodeData);

    const user = new User({
      email,
      password: hashedPassword,
      name,
      role: 'Member',
      qrCode,
    });

    await user.save();

    await Log.create({
      action: 'CREATE',
      entity: 'Member',
      entityId: member._id,
      details: `Created new member: ${name} (${email})`,
      performedBy: session.user.email,
    });

    return NextResponse.json(member);
  } catch (error) {
    console.error('Error in POST /api/members:', error);
    const message = error instanceof Error ? error.message : 'Failed to create member';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}