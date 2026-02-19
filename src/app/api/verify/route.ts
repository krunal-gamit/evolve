import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Member from '@/models/Member';
import Subscription from '@/models/Subscription';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const rawData = searchParams.get('data');

    let targetMemberId = memberId;

    // If data is provided (from QR code), try to parse it
    if (rawData) {
      try {
        const parsed = JSON.parse(decodeURIComponent(rawData));
        if (parsed.memberId) {
          targetMemberId = parsed.memberId;
        }
      } catch {
        // If not JSON, it might be direct memberId
        targetMemberId = rawData;
      }
    }

    if (!targetMemberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find member by memberId
    const member = await Member.findOne({ memberId: targetMemberId });

    if (!member) {
      return NextResponse.json(
        { 
          valid: false,
          member: null,
          subscription: null,
          message: 'Member not found'
        },
        { status: 404 }
      );
    }

    // Find active subscriptions for this member
    const activeSubscription = await Subscription.findOne({
      member: member._id,
      status: 'active'
    })
    .populate('location', 'name address')
    .populate('seat', 'seatNumber')
    .sort({ endDate: -1 });

    const now = new Date();
    
    // Check if subscription is still valid (even if status is active, check dates)
    let isCurrentlyActive = false;
    if (activeSubscription) {
      const endDate = new Date(activeSubscription.endDate);
      endDate.setHours(23, 59, 59, 999); // End of the end date
      isCurrentlyActive = endDate >= now;
    }

    // If no active subscription or expired, check for any subscription
    if (!isCurrentlyActive) {
      const latestSubscription = await Subscription.findOne({
        member: member._id
      })
      .populate('location', 'name address')
      .populate('seat', 'seatNumber')
      .sort({ endDate: -1 });

      if (latestSubscription) {
        return NextResponse.json({
          valid: false,
          member: {
            _id: member._id,
            memberId: member.memberId,
            name: member.name,
            email: member.email,
            phone: member.phone
          },
          subscription: {
            status: latestSubscription.status,
            startDate: latestSubscription.startDate,
            endDate: latestSubscription.endDate,
            location: latestSubscription.location,
            seat: latestSubscription.seat,
            duration: latestSubscription.duration,
            totalAmount: latestSubscription.totalAmount
          },
          message: 'Subscription expired'
        });
      }

      return NextResponse.json({
        valid: false,
        member: {
          _id: member._id,
          memberId: member.memberId,
          name: member.name,
          email: member.email,
          phone: member.phone
        },
        subscription: null,
        message: 'No subscription found'
      });
    }

    // Active and valid subscription found
    return NextResponse.json({
      valid: true,
      member: {
        _id: member._id,
        memberId: member.memberId,
        name: member.name,
        email: member.email,
        phone: member.phone
      },
      subscription: {
        status: activeSubscription.status,
        startDate: activeSubscription.startDate,
        endDate: activeSubscription.endDate,
        location: activeSubscription.location,
        seat: activeSubscription.seat,
        duration: activeSubscription.duration,
        totalAmount: activeSubscription.totalAmount
      },
      message: 'Valid subscription'
    });

  } catch (error) {
    console.error('Error in verify API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
