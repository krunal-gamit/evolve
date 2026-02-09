import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

export async function POST() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    
    const Seat = (await import('@/models/Seat')).default;
    
    // Reset all seats to vacant
    const result = await Seat.updateMany(
      {},
      { 
        $set: { 
          status: 'vacant',
          assignedMember: null,
          subscription: null
        }
      }
    );
    
    return NextResponse.json({ 
      message: 'Seat statuses reset successfully',
      modifiedCount: result.modifiedCount
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
