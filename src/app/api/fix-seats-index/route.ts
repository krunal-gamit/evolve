import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Seat from '@/models/Seat';

// This endpoint drops the old unique index on seatNumber 
// and ensures the new compound index works correctly

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();
    
    // Drop the old unique index on seatNumber
    try {
      await Seat.collection.dropIndex('seatNumber_1');
      console.log('Dropped old index: seatNumber_1');
    } catch (error: any) {
      if (error.code === 26) {
        console.log('Index seatNumber_1 does not exist');
      } else {
        console.log('Error dropping index:', error.message);
      }
    }
    
    // Create the compound index if it doesn't exist
    try {
      await Seat.collection.createIndex({ location: 1, seatNumber: 1 }, { unique: true });
      console.log('Created compound index: location_1_seatNumber_1');
    } catch (error: any) {
      if (error.code === 85 || error.code === 86) {
        console.log('Compound index already exists');
      } else {
        console.log('Error creating index:', error.message);
      }
    }
    
    // Update existing seats without location to have a default location
    // First, check if there's a default location
    const Location = (await import('@/models/Location')).default;
    const defaultLocation = await Location.findOne();
    
    if (defaultLocation) {
      const updateResult = await Seat.updateMany(
        { location: { $exists: false } },
        { $set: { location: defaultLocation._id } }
      );
      console.log(`Updated ${updateResult.modifiedCount} seats with default location`);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Indexes fixed. Please refresh and try adding seats again.' 
    });
  } catch (error) {
    console.error('Error fixing indexes:', error);
    const message = error instanceof Error ? error.message : 'Failed to fix indexes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
