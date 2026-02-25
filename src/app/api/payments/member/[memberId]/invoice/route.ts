import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Subscription from '@/models/Subscription';
import Member from '@/models/Member';
import Location from '@/models/Location';
import Settings from '@/models/Settings';

// GET: Generate invoice for a specific payment
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
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');
    const invoiceType = searchParams.get('type') || 'single'; // 'single' or 'all'

    // Check if member exists
    const member = await Member.findOne({ memberId });
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get settings for organization details
    const settings = await Settings.findOne();
    
    // Find subscriptions for this member
    const subscriptions = await Subscription.find({ member: member._id })
      .populate('location', 'name address phone')
      .sort({ createdAt: -1 });

    // Get payments to include in invoice
    let paymentsToInclude = [];
    
    if (invoiceType === 'single' && paymentId) {
      // Single payment invoice
      for (const subscription of subscriptions) {
        const payment = subscription.payments?.find((p: any) => p.toString() === paymentId);
        if (payment) {
          const fullPayment = await Payment.findById(payment);
          if (fullPayment) {
            paymentsToInclude.push({
              payment: fullPayment,
              subscription,
              location: subscription.location
            });
          }
        }
      }
    } else {
      // All payments invoice - generate consolidated invoice
      for (const subscription of subscriptions) {
        for (const paymentId of subscription.payments || []) {
          const fullPayment = await Payment.findById(paymentId);
          if (fullPayment) {
            paymentsToInclude.push({
              payment: fullPayment,
              subscription,
              location: subscription.location
            });
          }
        }
      }
    }

    if (paymentsToInclude.length === 0) {
      return NextResponse.json({ error: 'No payments found' }, { status: 404 });
    }

    // Generate invoice data
    const invoiceNumber = `INV-${Date.now()}`;
    const invoiceDate = new Date().toISOString().split('T')[0];
    
    // Calculate totals
    const totalAmount = paymentsToInclude.reduce((sum, p) => sum + p.payment.amount, 0);

    // Return invoice data (frontend will generate PDF)
    const invoiceData = {
      invoiceNumber,
      invoiceDate,
      dueDate: invoiceDate,
      organization: {
        name: settings?.gymName || 'Evolve Gym Management',
        address: settings?.address || '',
        phone: settings?.phone || ''
      },
      member: {
        memberId: member.memberId,
        name: member.name,
        email: member.email,
        phone: member.phone,
        address: member.address
      },
      payments: paymentsToInclude.map(p => ({
        paymentId: p.payment._id,
        uniqueCode: p.payment.uniqueCode,
        dateTime: p.payment.dateTime,
        method: p.payment.method,
        upiCode: p.payment.upiCode,
        subscriptionDetails: {
          duration: p.subscription.duration,
          startDate: p.subscription.startDate,
          endDate: p.subscription.endDate,
          totalAmount: p.subscription.totalAmount
        },
        location: p.location ? {
          name: p.location.name,
          address: p.location.address,
          phone: p.location.phone
        } : null,
        amount: p.payment.amount
      })),
      summary: {
        subtotal: totalAmount,
        tax: 0,
        discount: 0,
        total: totalAmount
      }
    };

    return NextResponse.json(invoiceData);
  } catch (error) {
    console.error('Error generating invoice:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate invoice';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
