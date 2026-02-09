import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Subscription from '@/models/Subscription';
import WaitingList from '@/models/WaitingList';

export async function POST() {
  const session = await auth();
  if (!session || !session.user || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();

    // Delete all subscriptions
    const subscriptionsResult = await Subscription.deleteMany({});
    
    // Delete all waiting list entries
    const waitingResult = await WaitingList.deleteMany({});

    return NextResponse.json({
      success: true,
      message: 'Subscriptions and waiting list cleared',
      deletedSubscriptions: subscriptionsResult.deletedCount,
      deletedWaitingList: waitingResult.deletedCount
    });
  } catch (error) {
    console.error('Error deleting data:', error);
    const message = error instanceof Error ? error.message : 'Delete failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
