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

    const { name, email, phone, address, examPrep, joinDate, memberId } = await request.json();

    // Validate required fields
    if (!name || !email || !phone || !address) {
      return NextResponse.json({ error: 'Name, email, phone, and address are required' }, { status: 400 });
    }

    // Parse join date if provided
    let createdAt = new Date();
    if (joinDate) {
      const parsedDate = new Date(joinDate);
      if (!isNaN(parsedDate.getTime())) {
        createdAt = parsedDate;
      }
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

    // Use provided memberId or generate a new one
    let finalMemberId = memberId;
    
    // If memberId provided, check if it already exists
    if (finalMemberId) {
      const existingWithMemberId = await Member.findOne({ memberId: finalMemberId });
      if (existingWithMemberId) {
        return NextResponse.json({ error: 'Member ID already exists' }, { status: 400 });
      }
    } else {
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
      finalMemberId = `${monthPrefix}${nextNumber.toString().padStart(3, '0')}`;
    }

    const member = new Member({ memberId: finalMemberId, name, email, phone, address, examPrep, createdAt });

    await member.save();

    // Create user account for member with default password
    const defaultPassword = 'password123'; // TODO: Send email to set password
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    // Generate QR code with verification URL containing memberId
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verifyUrl = `${appUrl}/api/verify?memberId=${finalMemberId}`;
    const qrCodeData = JSON.stringify({
      memberId: finalMemberId,
      name,
      email,
      verifyUrl
    });
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