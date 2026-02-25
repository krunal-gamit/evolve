import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Inventory from '@/models/Inventory';
import Log from '@/models/Log';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !session.user || (session.user.role !== 'Manager' && session.user.role !== 'Admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const inventory = await Inventory.findById(id).populate('location', 'name');
    
    if (!inventory) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    return NextResponse.json(inventory);
  } catch (error) {
    console.error('Error in GET /api/inventory/[id]:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch inventory item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !session.user || (session.user.role !== 'Manager' && session.user.role !== 'Admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const inventory = await Inventory.findById(id);
    
    if (!inventory) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    // If user is a Manager with specific location assignments, validate the location
    let managerLocations: string[] = [];
    if (session?.user?.role === 'Manager' && session.user.locations) {
      managerLocations = session.user.locations;
    }

    // Managers can only update inventory for their assigned locations
    if (managerLocations.length > 0 && !managerLocations.includes(inventory.location.toString())) {
      return NextResponse.json({ error: 'You can only update inventory for your assigned locations' }, { status: 403 });
    }

    const updatedInventory = await Inventory.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true }
    ).populate('location', 'name');

    if (!updatedInventory) {
      return NextResponse.json({ error: 'Failed to update inventory item' }, { status: 500 });
    }

    await Log.create({
      action: 'UPDATE',
      entity: 'Inventory',
      entityId: updatedInventory._id,
      details: `Updated inventory: ${updatedInventory.name} (${updatedInventory.category})`,
      performedBy: session.user.email,
    });

    return NextResponse.json(updatedInventory);
  } catch (error) {
    console.error('Error in PUT /api/inventory/[id]:', error);
    const message = error instanceof Error ? error.message : 'Failed to update inventory item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !session.user || (session.user.role !== 'Manager' && session.user.role !== 'Admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();
    const { id } = await params;

    const inventory = await Inventory.findById(id);
    
    if (!inventory) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    // If user is a Manager with specific location assignments, validate the location
    let managerLocations: string[] = [];
    if (session?.user?.role === 'Manager' && session.user.locations) {
      managerLocations = session.user.locations;
    }

    // Managers can only delete inventory for their assigned locations
    if (managerLocations.length > 0 && !managerLocations.includes(inventory.location.toString())) {
      return NextResponse.json({ error: 'You can only delete inventory for your assigned locations' }, { status: 403 });
    }

    await Inventory.findByIdAndDelete(id);

    await Log.create({
      action: 'DELETE',
      entity: 'Inventory',
      entityId: id,
      details: `Deleted inventory: ${inventory.name} (${inventory.category})`,
      performedBy: session.user.email,
    });

    return NextResponse.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/inventory/[id]:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete inventory item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
