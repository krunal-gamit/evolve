import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Grievance from '@/models/Grievance';
import Log from '@/models/Log';

// GET - Fetch grievances based on user role
export async function GET() {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  // Members can only see their own grievances
  const filter: any = {};
  
  if (session.user.role === 'Member') {
    filter.reportedBy = session.user.id;
  }
  // Managers can only see grievances for their assigned locations
  else if (session.user.role === 'Manager' && session.user.locations && session.user.locations.length > 0) {
    filter.location = { $in: session.user.locations };
  }
  // Admins can see all grievances (no filter)

  const grievances = await Grievance.find(filter)
    .populate('location', 'name')
    .populate('reportedBy', 'name email')
    .populate('resolvedBy', 'name email')
    .sort({ createdAt: -1 });

  return NextResponse.json(grievances);
}

// POST - Create a new grievance
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Any authenticated user can create a grievance
  try {
    await dbConnect();

    const body = await request.json();
    const { title, description, category, location, priority } = body;

    if (!title || !description || !category || !location) {
      return NextResponse.json({ error: 'Title, description, category, and location are required' }, { status: 400 });
    }

    const grievance = new Grievance({
      title,
      description,
      category,
      location,
      priority: priority || 'Medium',
      reportedBy: session.user.id,
      status: 'Pending',
    });

    await grievance.save();

    await Log.create({
      action: 'CREATE',
      entity: 'Grievance',
      entityId: grievance._id,
      details: `Created grievance: ${title} (${category})`,
      performedBy: session.user.email,
    });

    // Populate the response
    const populatedGrievance = await Grievance.findById(grievance._id)
      .populate('location', 'name')
      .populate('reportedBy', 'name email');

    return NextResponse.json(populatedGrievance, { status: 201 });
  } catch (error) {
    console.error('Error creating grievance:', error);
    const message = error instanceof Error ? error.message : 'Failed to create grievance';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
