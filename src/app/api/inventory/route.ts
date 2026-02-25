import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Inventory from '@/models/Inventory';
import Log from '@/models/Log';

export async function GET() {
  const session = await auth();
  if (!session || !session.user || (session.user.role !== 'Manager' && session.user.role !== 'Admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await dbConnect();

  // If user is a Manager with specific location assignments, restrict to those locations
  let managerLocations: string[] = [];
  if (session?.user?.role === 'Manager' && session.user.locations) {
    managerLocations = session.user.locations;
  }

  const filter: any = {};
  
  // Managers with location assignments can only see inventory at those locations
  if (managerLocations.length > 0) {
    filter.location = { $in: managerLocations };
  }

  const inventory = await Inventory.find(filter).populate('location', 'name').sort({ createdAt: -1 });

  return NextResponse.json(inventory);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user || (session.user.role !== 'Manager' && session.user.role !== 'Admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // If user is a Manager with specific location assignments, validate the location
  let managerLocations: string[] = [];
  if (session?.user?.role === 'Manager' && session.user.locations) {
    managerLocations = session.user.locations;
  }

  try {
    await dbConnect();

    const body = await request.json();

    if (Array.isArray(body)) {
      // Bulk insert - validate all inventory items have valid location
      for (const item of body) {
        if (!item.location) {
          return NextResponse.json({ error: 'Location is required for each inventory item' }, { status: 400 });
        }
        // Managers can only create inventory for their assigned locations
        if (managerLocations.length > 0 && !managerLocations.includes(item.location)) {
          return NextResponse.json({ error: 'You can only create inventory for your assigned locations' }, { status: 403 });
        }
      }
      
      const inventoryItems = body.map(item => new Inventory(item));
      const savedItems = await Inventory.insertMany(inventoryItems);

      for (const item of savedItems) {
        await Log.create({
          action: 'CREATE',
          entity: 'Inventory',
          entityId: item._id,
          details: `Bulk created inventory: ${item.name} (${item.category})`,
          performedBy: session.user.email,
        });
      }

      return NextResponse.json(savedItems);
    } else {
      // Single insert
      const { name, category, location, quantity, amount, status, purchaseDate, lastMaintenanceDate, notes, serialNumber, brand, model } = body;

      if (!location) {
        return NextResponse.json({ error: 'Location is required' }, { status: 400 });
      }

      // Managers can only create inventory for their assigned locations
      if (managerLocations.length > 0 && !managerLocations.includes(location)) {
        return NextResponse.json({ error: 'You can only create inventory for your assigned locations' }, { status: 403 });
      }

      const inventory = new Inventory({
        name,
        category,
        location,
        quantity,
        amount,
        status,
        purchaseDate,
        lastMaintenanceDate,
        notes,
        serialNumber,
        brand,
        model
      });

      await inventory.save();

      await Log.create({
        action: 'CREATE',
        entity: 'Inventory',
        entityId: inventory._id,
        details: `Created inventory: ${name} (${category})`,
        performedBy: session.user.email,
      });

      return NextResponse.json(inventory);
    }
  } catch (error) {
    console.error('Error in POST /api/inventory:', error);
    const message = error instanceof Error ? error.message : 'Failed to create inventory item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
