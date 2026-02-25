import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Subscription from '@/models/Subscription';
import Member from '@/models/Member';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search') || '';
    const locationId = searchParams.get('locationId') || '';
    const method = searchParams.get('method') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const monthFilter = searchParams.get('month') || ''; // Can be YYYY-MM for specific month or preset like 'this_month'

    // Build member filter
    let memberFilter = {};
    if (search) {
      memberFilter = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { memberId: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      };
    }

    let memberIds: string[] = [];
    if (search) {
      const members = await Member.find(memberFilter).select('_id');
      memberIds = members.map((m: any) => m._id.toString());
    }

    // Build subscription filter
    let subscriptionFilter: Record<string, any> = {};
    if (memberIds.length > 0) {
      subscriptionFilter.member = { $in: memberIds };
    }
    if (locationId) {
      subscriptionFilter.location = locationId;
    }

    const subscriptions = await Subscription.find(subscriptionFilter)
      .populate('member', 'name email memberId phone')
      .populate('location', 'name')
      .sort({ createdAt: -1 })
      .limit(limit);

    // Get all payments from subscriptions
    const paymentIds: any[] = [];
    const subscriptionMap = new Map();

    for (const sub of subscriptions) {
      for (const paymentId of sub.payments || []) {
        paymentIds.push(paymentId);
        subscriptionMap.set(paymentId.toString(), {
          subscription: sub,
          member: sub.member,
          location: sub.location
        });
      }
    }

    // Build payment filter
    let paymentFilter: Record<string, any> = { _id: { $in: paymentIds } };
    if (method) {
      paymentFilter.method = method;
    }
    if (startDate || endDate) {
      paymentFilter.dateTime = {};
      if (startDate) {
        paymentFilter.dateTime.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set end date to end of day (23:59:59.999) to include all payments on that day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        paymentFilter.dateTime.$lte = end;
      }
    }

    // Apply month filter
    if (monthFilter) {
      // Check if it's a specific month (YYYY-MM format)
      if (monthFilter.match(/^\d{4}-\d{2}$/)) {
        const [year, month] = monthFilter.split('-').map(Number);
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
        paymentFilter.dateTime = { $gte: monthStart, $lte: monthEnd };
      } else {
        // Preset filters
        const now = new Date();
        let monthStart: Date;
        
        switch (monthFilter) {
          case 'this_month':
            monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            paymentFilter.dateTime = { $gte: monthStart };
            break;
          case 'last_month':
            monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            paymentFilter.dateTime = { $gte: monthStart, $lte: monthEnd };
            break;
          case 'last_3_months':
            monthStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            paymentFilter.dateTime = { $gte: monthStart };
            break;
          case 'last_6_months':
            monthStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);
            paymentFilter.dateTime = { $gte: monthStart };
            break;
          case 'last_year':
            monthStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
            paymentFilter.dateTime = { $gte: monthStart };
            break;
        }
      }
    }

    const payments = await Payment.find(paymentFilter)
      .sort({ dateTime: -1 })
      .limit(limit);

    // Format payments
    const formattedPayments = payments.map((payment: any) => {
      const subData = subscriptionMap.get(payment._id.toString());
      return {
        _id: payment._id,
        amount: payment.amount,
        method: payment.method,
        upiCode: payment.upiCode,
        dateTime: payment.dateTime,
        uniqueCode: payment.uniqueCode,
        createdAt: payment.createdAt,
        member: subData?.member ? {
          _id: subData.member._id,
          memberId: subData.member.memberId,
          name: subData.member.name,
          email: subData.member.email,
          phone: subData.member.phone
        } : null,
        subscription: subData?.subscription ? {
          _id: subData.subscription._id,
          duration: subData.subscription.duration,
          startDate: subData.subscription.startDate,
          endDate: subData.subscription.endDate,
          totalAmount: subData.subscription.totalAmount
        } : null,
        location: subData?.location ? {
          _id: subData.location._id,
          name: subData.location.name
        } : null
      };
    });

    const totalAmount = formattedPayments.reduce((sum: number, p: any) => sum + p.amount, 0);

    return NextResponse.json({
      payments: formattedPayments,
      summary: {
        totalPayments: formattedPayments.length,
        totalAmount
      }
    });
  } catch (error) {
    console.error('Error fetching recent payments:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch payments';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
