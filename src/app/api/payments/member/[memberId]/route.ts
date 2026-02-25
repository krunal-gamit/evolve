import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Subscription from '@/models/Subscription';
import Member from '@/models/Member';
import Location from '@/models/Location';

// GET: Fetch all payments for a specific member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { memberId } = await params;

    // Check if member exists
    const member = await Member.findOne({ memberId });
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Find all subscriptions for this member and populate payments
    const subscriptions = await Subscription.find({ member: member._id })
      .populate({
        path: 'payments',
        populate: [
          { path: 'subscription', select: 'startDate endDate duration totalAmount' }
        ]
      })
      .populate('location', 'name address')
      .sort({ createdAt: -1 });

    // Flatten all payments from all subscriptions with subscription details
    const paymentHistory = [];
    
    for (const subscription of subscriptions) {
      for (const payment of subscription.payments || []) {
        paymentHistory.push({
          _id: payment._id,
          amount: payment.amount,
          method: payment.method,
          upiCode: payment.upiCode,
          dateTime: payment.dateTime,
          uniqueCode: payment.uniqueCode,
          createdAt: payment.createdAt,
          subscription: {
            _id: subscription._id,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            duration: subscription.duration,
            totalAmount: subscription.totalAmount,
            location: subscription.location
          }
        });
      }
    }

    // Sort by payment date descending
    paymentHistory.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

    // Calculate totals
    const totalPaid = paymentHistory.reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      member: {
        _id: member._id,
        memberId: member.memberId,
        name: member.name,
        email: member.email,
        phone: member.phone
      },
      payments: paymentHistory,
      summary: {
        totalPayments: paymentHistory.length,
        totalPaid
      }
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch payment history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
