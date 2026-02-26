import mongoose from 'mongoose';

// Comprehensive notification types for all roles
export type NotificationType = 
  // Member Notifications - Subscription & Payments
  | 'subscription_expiry_reminder'
  | 'subscription_expiry_3days'
  | 'subscription_expired'
  | 'subscription_renewed'
  | 'payment_received'
  | 'payment_failed'
  | 'invoice_generated'
  // Member Notifications - Seat & Access
  | 'seat_assigned'
  | 'seat_changed'
  | 'seat_available'
  // Member Notifications - Grievances
  | 'grievance_submitted'
  | 'grievance_status_update'
  | 'grievance_resolved'
  // Member Notifications - Account
  | 'profile_updated'
  | 'password_changed'
  | 'account_suspended'
  | 'welcome'
  // Manager Notifications - Member Management
  | 'new_member_registered'
  | 'member_waiting_approval'
  | 'member_subscription_expiring'
  | 'member_subscription_expired'
  | 'member_renewed'
  | 'member_removed'
  // Manager Notifications - Payments
  | 'pending_payments'
  | 'revenue_alert'
  // Manager Notifications - Seats
  | 'seat_became_vacant'
  | 'waiting_list_alert'
  | 'capacity_warning'
  // Manager Notifications - Grievances
  | 'new_grievance'
  | 'high_priority_grievance'
  | 'grievance_unresolved_long'
  // Manager Notifications - Inventory
  | 'inventory_low'
  | 'equipment_broken'
  | 'maintenance_due'
  // Manager Notifications - Reports
  | 'expense_alert'
  | 'monthly_report_ready'
  // Admin Notifications - System & Security
  | 'system_error'
  | 'database_backup'
  | 'user_lockout'
  | 'suspicious_activity'
  // Admin Notifications - User Management
  | 'new_admin_created'
  | 'manager_created'
  | 'role_changed'
  // Admin Notifications - Settings
  | 'settings_changed'
  | 'subscription_plan_changed'
  // Admin Notifications - Financial
  | 'daily_revenue'
  | 'monthly_revenue'
  | 'pending_payments_total'
  // Legacy types (for backward compatibility)
  | 'subscription_expiry'
  | 'payment_overdue'
  | 'seat_available'
  | 'system_alert';

const NotificationSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  type: {
    type: String,
    enum: [
      // Member Notifications - Subscription & Payments
      'subscription_expiry_reminder',
      'subscription_expiry_3days',
      'subscription_expired',
      'subscription_renewed',
      'payment_received',
      'payment_failed',
      'invoice_generated',
      // Member Notifications - Seat & Access
      'seat_assigned',
      'seat_changed',
      'seat_available',
      // Member Notifications - Grievances
      'grievance_submitted',
      'grievance_status_update',
      'grievance_resolved',
      // Member Notifications - Account
      'profile_updated',
      'password_changed',
      'account_suspended',
      'welcome',
      // Manager Notifications - Member Management
      'new_member_registered',
      'member_waiting_approval',
      'member_subscription_expiring',
      'member_subscription_expired',
      'member_renewed',
      'member_removed',
      // Manager Notifications - Payments
      'pending_payments',
      'revenue_alert',
      // Manager Notifications - Seats
      'seat_became_vacant',
      'waiting_list_alert',
      'capacity_warning',
      // Manager Notifications - Grievances
      'new_grievance',
      'high_priority_grievance',
      'grievance_unresolved_long',
      // Manager Notifications - Inventory
      'inventory_low',
      'equipment_broken',
      'maintenance_due',
      // Manager Notifications - Reports
      'expense_alert',
      'monthly_report_ready',
      // Admin Notifications - System & Security
      'system_error',
      'database_backup',
      'user_lockout',
      'suspicious_activity',
      // Admin Notifications - User Management
      'new_admin_created',
      'manager_created',
      'role_changed',
      // Admin Notifications - Settings
      'settings_changed',
      'subscription_plan_changed',
      // Admin Notifications - Financial
      'daily_revenue',
      'monthly_revenue',
      'pending_payments_total',
      // Legacy types
      'subscription_expiry',
      'payment_overdue',
      'seat_available',
      'system_alert'
    ],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: {
    memberId: String,
    memberName: String,
    subscriptionId: String,
    seatId: String,
    seatNumber: Number,
    amount: Number,
    date: Date,
    locationId: String,
    locationName: String,
    grievanceId: String,
    grievanceTitle: String,
    inventoryId: String,
    inventoryName: String,
    category: String,
    status: String,
    previousValue: String,
    newValue: String,
    actionUrl: String,
    // Additional metadata
    memberEmail: String,
    memberPhone: String,
    paymentId: String,
    invoiceId: String,
    expenseId: String,
    userId: String,
    userName: String,
    count: Number
  },
  priority: { 
    type: String, 
    enum: ['critical', 'high', 'medium', 'low'], 
    default: 'medium' 
  },
  read: { type: Boolean, default: false },
  readAt: Date,
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date,
  // For bulk notifications/role-based
  isForRole: { 
    type: Boolean, 
    default: false 
  },
  targetRole: {
    type: String,
    enum: ['Admin', 'Manager', 'Member', 'All'],
    default: null
  },
  // Notification category for grouping
  category: {
    type: String,
    enum: [
      'subscription', 
      'payment', 
      'seat', 
      'grievance', 
      'member', 
      'inventory', 
      'system', 
      'security',
      'report',
      'account',
      'settings'
    ],
    default: 'system'
  }
});

// Index for efficient querying
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ targetRole: 1, isForRole: 1 });
NotificationSchema.index({ read: 1, createdAt: -1 });
NotificationSchema.index({ category: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
