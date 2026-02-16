import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import dbConnect from '@/lib/mongodb';

import User from '@/models/User';
import bcrypt from 'bcryptjs';
import Log from '@/models/Log';

export async function GET() {
  const session = await auth();
  if (!session || !session.user || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await dbConnect();

  const users = await User.find().populate('locations', 'name'); // Include locations details
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await dbConnect();

  const { email, name, password, role, locations } = await request.json();

  if (!email || !name || !password || !role) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  if (!['Admin', 'Manager', 'Member'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  // Validate locations if provided
  if (locations && Array.isArray(locations)) {
    const Location = (await import('@/models/Location')).default;
    for (const locId of locations) {
      const locationExists = await Location.findById(locId);
      if (!locationExists) {
        return NextResponse.json({ error: `Invalid location: ${locId}` }, { status: 400 });
      }
    }
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return NextResponse.json({ error: 'User already exists' }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({
    email,
    name,
    password: hashedPassword,
    role,
    locations: locations || [], // Empty array means all locations for managers
  });

  await newUser.save();

  await Log.create({
    action: 'CREATE',
    entity: 'User',
    entityId: newUser._id,
    details: `Created user: ${name} (${email}) with role ${role}${locations && locations.length > 0 ? ' at locations: ' + locations.join(', ') : ' (all locations)'}`,
    performedBy: session.user.email,
  });

  return NextResponse.json({ message: 'User created successfully' }, { status: 201 });
}