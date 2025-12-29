import { NextRequest, NextResponse } from 'next/server';

import dbConnect from '@/lib/mongodb';

import Expense from '@/models/Expense';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();

  const { id } = await params;

  const { description, amount, category, paidTo, method, date } = await request.json();

  const expense = await Expense.findByIdAndUpdate(id, { description, amount, category, paidTo, method, date }, { new: true });

  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  return NextResponse.json(expense);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();

  const { id } = await params;

  const expense = await Expense.findByIdAndDelete(id);

  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  return NextResponse.json({ message: 'Expense deleted' });
}