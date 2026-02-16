import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import dbConnect from '@/lib/mongodb';

import Expense from '@/models/Expense';
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
  
  // Managers with location assignments can only see expenses at those locations
  if (managerLocations.length > 0) {
    filter.location = { $in: managerLocations };
  }

  const expenses = await Expense.find(filter).populate('location', 'name').sort({ date: -1 });

  return NextResponse.json(expenses);

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
      // Bulk insert - validate all expenses have valid location
      for (const exp of body) {
        if (!exp.location) {
          return NextResponse.json({ error: 'Location is required for each expense' }, { status: 400 });
        }
        // Managers can only create expenses for their assigned locations
        if (managerLocations.length > 0 && !managerLocations.includes(exp.location)) {
          return NextResponse.json({ error: 'You can only create expenses for your assigned locations' }, { status: 403 });
        }
      }
      
      const expenses = body.map(exp => new Expense(exp));
      const savedExpenses = await Expense.insertMany(expenses);

      for (const expense of savedExpenses) {
        await Log.create({
          action: 'CREATE',
          entity: 'Expense',
          entityId: expense._id,
          details: `Bulk created expense: ${expense.description} for ₹${expense.amount}`,
          performedBy: session.user.email,
        });
      }

      return NextResponse.json(savedExpenses);
    } else {
      // Single insert
      const { description, amount, category, paidTo, method, date, location } = body;

      if (!location) {
        return NextResponse.json({ error: 'Location is required' }, { status: 400 });
      }

      // Managers can only create expenses for their assigned locations
      if (managerLocations.length > 0 && !managerLocations.includes(location)) {
        return NextResponse.json({ error: 'You can only create expenses for your assigned locations' }, { status: 403 });
      }

      const expense = new Expense({ description, amount, category, paidTo, method, date, location });

      await expense.save();

      await Log.create({
        action: 'CREATE',
        entity: 'Expense',
        entityId: expense._id,
        details: `Created expense: ${description} for ₹${amount}`,
        performedBy: session.user.email,
      });

      return NextResponse.json(expense);
    }
  } catch (error) {
    console.error('Error in POST /api/expenses:', error);
    const message = error instanceof Error ? error.message : 'Failed to create expense';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}