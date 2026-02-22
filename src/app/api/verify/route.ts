import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Member from '@/models/Member';
import Subscription from '@/models/Subscription';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');
    const name = searchParams.get('name');
    const rawData = searchParams.get('data');
    const hintsOnly = searchParams.get('hints') === 'true';
    const q = searchParams.get('q'); // Unified search query

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

    // Check if any search parameter is provided
    const hasMemberId = targetMemberId && targetMemberId.trim();
    const hasEmail = email && email.trim();
    const hasPhone = phone && phone.trim();
    const hasName = name && name.trim();
    const hasQ = q && q.trim();

    if (!hasMemberId && !hasEmail && !hasPhone && !hasName && !hasQ) {
      return NextResponse.json(
        { error: 'Please provide Member ID, Email, Phone Number, or Name' },
        { status: 400 }
      );
    }

    // If hintsOnly=true, return autocomplete suggestions (searches across all fields)
    if (hintsOnly) {
      const searchTerm = (q || targetMemberId || '').trim();
      if (!searchTerm) {
        return NextResponse.json({ hints: [] });
      }
      
      const partialMembers = await Member.find({
        $or: [
          { memberId: { $regex: new RegExp(searchTerm, 'i') } },
          { email: { $regex: new RegExp(searchTerm, 'i') } },
          { phone: { $regex: new RegExp(searchTerm, 'i') } },
          { name: { $regex: new RegExp(searchTerm, 'i') } }
        ]
      })
      .select('memberId name email phone')
      .limit(10);

      const hints = partialMembers.map(m => ({
        memberId: m.memberId,
        name: m.name,
        email: m.email,
        phone: m.phone,
        displayText: `${m.memberId} - ${m.name} (${m.email})`
      }));

      return NextResponse.json({ hints });
    }

    await dbConnect();

    // Build search query based on provided parameters
    let member;
    const searchQuery: Record<string, unknown> = {};
    
    // Priority: memberId > email > phone > name
    if (targetMemberId && targetMemberId.trim()) {
      searchQuery.memberId = targetMemberId.trim();
    } else if (email && email.trim()) {
      // Case-insensitive exact email search
      searchQuery.email = email.trim().toLowerCase();
    } else if (phone && phone.trim()) {
      // Phone search - remove any spaces/dashes and search
      const cleanPhone = phone.trim().replace(/[\s-]/g, '');
      searchQuery.phone = { $regex: new RegExp(cleanPhone, 'i') };
    } else if (name && name.trim()) {
      searchQuery.name = { $regex: name.trim(), $options: 'i' };
    }

    console.log('Verify search query:', JSON.stringify(searchQuery));

    // Find member by any of the search criteria
    member = await Member.findOne(searchQuery);

    console.log('Found member:', member ? member.memberId : 'none');

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
