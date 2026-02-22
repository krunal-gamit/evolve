import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Subscription from '@/models/Subscription';
import Member from '@/models/Member';
import User from '@/models/User';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email'); // Support fetching by email via query param
    
    console.log('Fetching subscriptions for ID:', id, 'Email:', email);
    
    // If email is provided in query params, use it directly
    if (email) {
      const member = await Member.findOne({ email });
      if (!member) {
        console.log('No member found for email:', email);
        return NextResponse.json([]);
      }
      
      const subscriptions = await Subscription.find({ member: member._id })
        .populate('location', 'name')
        .populate('seat', 'seatNumber')
        .populate('payments')
        .sort({ createdAt: -1 });
      
      console.log('Found subscriptions by email:', subscriptions.length);
      return NextResponse.json(subscriptions);
    }
    
    // Otherwise, try to find member by ID using multiple methods
    
    // Try to find the member
    let member = null;

    // Method 1: Find by Member's _id
    try {
      member = await Member.findOne({ _id: id });
      if (member) console.log('Found member by _id:', member._id);
    } catch (e) {
      console.log('Method 1 failed (invalid ObjectId)');
    }

    // Method 2: Find by memberId field
    if (!member) {
      member = await Member.findOne({ memberId: id });
      if (member) console.log('Found member by memberId:', member.memberId);
    }

    // Method 3: Find by User's _id - get user first, then member by email
    if (!member) {
      const user = await User.findById(id);
      if (user) {
        console.log('Found user by _id:', user.email);
        member = await Member.findOne({ email: user.email });
        if (member) console.log('Found member by user email:', member.email);
      }
    }

    // Method 4: Find by member's email directly
    if (!member) {
      member = await Member.findOne({ email: id });
      if (member) console.log('Found member by email:', member.email);
    }

    if (!member) {
      console.log('No member found for ID:', id);
      return NextResponse.json([]);
    }

    // Find subscriptions for this member with populated location, seat, and payments
    const subscriptions = await Subscription.find({ member: member._id })
      .populate('location', 'name')
      .populate('seat', 'seatNumber')
      .populate('payments')
      .sort({ createdAt: -1 });

    console.log('Found subscriptions:', subscriptions.length);
    return NextResponse.json(subscriptions);
  } catch (err) {
    console.error('Error fetching member subscriptions:', err);
    const error = err as Error;
    return NextResponse.json({ error: 'Failed to fetch subscriptions', details: error.message }, { status: 500 });
  }
}
