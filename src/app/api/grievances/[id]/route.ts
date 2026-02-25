import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Grievance from '@/models/Grievance';
import Log from '@/models/Log';

// GET - Fetch single grievance
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await dbConnect();
    const grievance = await Grievance.findById(id)
      .populate('location', 'name')
      .populate('reportedBy', 'name email')
      .populate('resolvedBy', 'name email');

    if (!grievance) {
      return NextResponse.json({ error: 'Grievance not found' }, { status: 404 });
    }

    // Members can only view their own grievances
    if (session.user.role === 'Member' && grievance.reportedBy._id.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Managers can only view grievances for their assigned locations
    if (session.user.role === 'Manager' && session.user.locations && session.user.locations.length > 0) {
      const grievanceLocation = grievance.location._id.toString();
      if (!session.user.locations.includes(grievanceLocation)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(grievance);
  } catch (error) {
    console.error('Error fetching grievance:', error);
    return NextResponse.json({ error: 'Failed to fetch grievance' }, { status: 500 });
  }
}

// PUT - Update grievance (resolve/reject/in-progress)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !session.user || (session.user.role !== 'Manager' && session.user.role !== 'Admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    await dbConnect();

    const body = await request.json();
    const { status, resolution } = body;

    const grievance = await Grievance.findById(id);
    if (!grievance) {
      return NextResponse.json({ error: 'Grievance not found' }, { status: 404 });
    }

    // Managers can only update grievances for their assigned locations
    if (session.user.role === 'Manager' && session.user.locations && session.user.locations.length > 0) {
      const grievanceLocation = grievance.location.toString();
      if (!session.user.locations.includes(grievanceLocation)) {
        return NextResponse.json({ error: 'You can only update grievances for your assigned locations' }, { status: 403 });
      }
    }

    // Update fields
    if (status) {
      grievance.status = status;
      if (status === 'Resolved' || status === 'Rejected') {
        grievance.resolvedBy = session.user.id;
        grievance.resolvedAt = new Date();
      }
    }
    if (resolution) {
      grievance.resolution = resolution;
    }

    await grievance.save();

    await Log.create({
      action: 'UPDATE',
      entity: 'Grievance',
      entityId: grievance._id,
      details: `Updated grievance status to: ${status}${resolution ? `, Resolution: ${resolution}` : ''}`,
      performedBy: session.user.email,
    });

    const updatedGrievance = await Grievance.findById(id)
      .populate('location', 'name')
      .populate('reportedBy', 'name email')
      .populate('resolvedBy', 'name email');

    return NextResponse.json(updatedGrievance);
  } catch (error) {
    console.error('Error updating grievance:', error);
    return NextResponse.json({ error: 'Failed to update grievance' }, { status: 500 });
  }
}

// DELETE - Delete a grievance (only by Admin or the person who created it)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await dbConnect();

    const grievance = await Grievance.findById(id);
    if (!grievance) {
      return NextResponse.json({ error: 'Grievance not found' }, { status: 404 });
    }

    // Only Admin or the person who created the grievance can delete it
    if (session.user.role !== 'Admin' && grievance.reportedBy.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await Grievance.findByIdAndDelete(id);

    await Log.create({
      action: 'DELETE',
      entity: 'Grievance',
      entityId: id,
      details: `Deleted grievance: ${grievance.title}`,
      performedBy: session.user.email,
    });

    return NextResponse.json({ message: 'Grievance deleted successfully' });
  } catch (error) {
    console.error('Error deleting grievance:', error);
    return NextResponse.json({ error: 'Failed to delete grievance' }, { status: 500 });
  }
}
