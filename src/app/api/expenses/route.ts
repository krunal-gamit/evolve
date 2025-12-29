import { NextRequest, NextResponse } from 'next/server';

import dbConnect from '@/lib/mongodb';

import Expense from '@/models/Expense';

export async function GET() {

  await dbConnect();

  const expenses = await Expense.find().sort({ date: -1 });

  return NextResponse.json(expenses);

}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { description, amount, category, paidTo, method, date } = await request.json();

    const expense = new Expense({ description, amount, category, paidTo, method, date });

    await expense.save();

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error in POST /api/expenses:', error);
    const message = error instanceof Error ? error.message : 'Failed to create expense';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}