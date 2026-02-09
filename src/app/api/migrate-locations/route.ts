import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Location from '@/models/Location';
import Seat from '@/models/Seat';
import Subscription from '@/models/Subscription';
import mongoose from 'mongoose';

// This is a one-time migration script to add location support to existing data
// Run this once after deploying the multi-location feature

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();

    // Check if migration already done
    const existingLocations = await Location.countDocuments();
    if (existingLocations > 0) {
      return NextResponse.json({ 
        message: 'Migration already completed',
        locationsCount: existingLocations
      });
    }

    // Create a default "Main Building" location
    const defaultLocation = await Location.create({
      name: 'Main Building',
      address: 'Default Location',
      totalSeats: 46,
      isActive: true
    });

    console.log('Created default location:', defaultLocation._id);

    // Update all existing seats to have the location reference
    const seatsResult = await Seat.updateMany(
      { location: { $exists: false } },
      { $set: { location: defaultLocation._id } }
    );

    console.log('Updated seats:', seatsResult.modifiedCount);

    // Update all existing subscriptions to have the location reference
    const subscriptionsResult = await Subscription.updateMany(
      { location: { $exists: false } },
      { $set: { location: defaultLocation._id } }
    );

    console.log('Updated subscriptions:', subscriptionsResult.modifiedCount);

    // Verify the migration
    const migratedSeats = await Seat.countDocuments({ location: defaultLocation._id });
    const migratedSubscriptions = await Subscription.countDocuments({ location: defaultLocation._id });

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      migration: {
        locationCreated: {
          _id: defaultLocation._id,
          name: defaultLocation.name
        },
        seatsMigrated: migratedSeats,
        subscriptionsMigrated: migratedSubscriptions
      }
    });
  } catch (error) {
    console.error('Migration error:', error);
    const message = error instanceof Error ? error.message : 'Migration failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET to check migration status
export async function GET() {
  try {
    await dbConnect();

    const locationsCount = await Location.countDocuments();
    const seatsWithoutLocation = await Seat.countDocuments({ location: { $exists: false } });
    const subscriptionsWithoutLocation = await Subscription.countDocuments({ location: { $exists: false } });

    return NextResponse.json({
      migrationNeeded: locationsCount === 0,
      locationsCount,
      seatsWithoutLocation,
      subscriptionsWithoutLocation,
      instructions: locationsCount === 0 
        ? 'POST to this endpoint to run the migration'
        : 'Migration already completed'
    });
  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json({ error: 'Failed to check migration status' }, { status: 500 });
  }
}
