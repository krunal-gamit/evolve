# Notification System Analysis - Evolve Coworking Space Management

## Current State
The system currently has a basic notification system with:
- 4 notification types: `subscription_expiry`, `payment_overdue`, `seat_available`, `system_alert`
- Only sent to Admin/Manager roles
- Basic read/unread functionality

---

## Comprehensive Notification Requirements by Role

### 1. MEMBER Notifications
Members are the end-users of the coworking space. They need notifications about:

#### Subscription & Payments
| Notification Type | Trigger | Priority | Description |
|------------------|---------|----------|-------------|
| `subscription_expiry_reminder` | 7 days before subscription ends | High | "Your subscription expires in 7 days. Please renew to continue using the space." |
| `subscription_expiry_3days` | 3 days before subscription ends | High | "Urgent: Your subscription expires in 3 days!" |
| `subscription_expired` | After subscription expires | High | "Your subscription has expired. Please renew to regain access." |
| `subscription_renewed` | After successful renewal | Medium | "Your subscription has been successfully renewed!" |
| `payment_received` | After payment is recorded | Medium | "Payment of ₹X received. Thank you!" |
| `payment_failed` | If payment fails | High | "Payment failed. Please contact support or retry." |
| `invoice_generated` | After invoice is created | Low | "Your invoice is ready for download." |

#### Seat & Access
| Notification Type | Trigger | Priority | Description |
|------------------|---------|----------|-------------|
| `seat_assigned` | When seat is assigned | High | "Your seat (Seat #X) has been assigned at [Location]" |
| `seat_changed` | When seat is reassigned | Medium | "Your seat has been changed to Seat #X" |
| `seat_available` | When member is on waiting list and seat opens | High | "A seat is now available! Please confirm within 24 hours." |

#### Grievances & Support
| Notification Type | Trigger | Priority | Description |
|------------------|---------|----------|-------------|
| `grievance_submitted` | After grievance is submitted | Low | "Your grievance has been submitted. Ticket #XXXX" |
| `grievance_status_update` | When grievance status changes | Medium | "Your grievance status updated to: [In Progress/Resolved]" |
| `grievance_resolved` | When grievance is resolved | Medium | "Your grievance has been resolved. Thank you for your patience." |

#### Account & Profile
| Notification Type | Trigger | Priority | Description |
|------------------|---------|----------|-------------|
| `profile_updated` | After profile changes | Low | "Your profile has been updated successfully." |
| `password_changed` | After password change | High | "Your password has been changed successfully." |
| `account_suspended` | If account is suspended | Critical | "Your account has been suspended. Please contact support." |
| `welcome` | After account creation | Low | "Welcome to Evolve! We're glad to have you." |

---

### 2. MANAGER Notifications
Managers handle day-to-day operations. They need notifications about:

#### Member Management
| Notification Type | Trigger | Priority | Description |
|------------------|---------|----------|-------------|
| `new_member_registered` | New member signup | High | "New member [Name] has registered. Requires approval." |
| `member_waiting_approval` | Member pending approval | High | "[Name] is waiting for membership approval." |
| `member_subscription_expiring` | Member subscription expires in 3 days | High | "[Name]'s subscription expires on [Date]" |
| `member_subscription_expired` | Member subscription expired | High | "[Name]'s subscription has expired." |
| `member_renewed` | Member renewed subscription | Medium | "[Name] has renewed their subscription." |
| `member_removed` | Member removed/cancelled | Medium | "[Name] has been removed from the system." |

#### Payments & Finance
| Notification Type | Trigger | Priority | Description |
|------------------|---------|----------|-------------|
| `payment_received` | Payment recorded | Medium | "Payment of ₹X received from [Member]" |
| `payment_overdue` | Member hasn't paid after expiry | High | "Payment overdue for [Member] since [Date]" |
| `pending_payments` | Daily summary of pending | Medium | "X payments pending for today." |
| `revenue_alert` | Revenue threshold | Medium | "Monthly revenue target achieved!" |

#### Seats & Capacity
| Notification Type | Trigger | Priority | Description |
|------------------|---------|----------|-------------|
| `seat_became_vacant` | Seat freed up | Medium | "Seat #X has become vacant at [Location]" |
| `waiting_list_alert` | New member on waiting list | Medium | "X members added to waiting list." |
| `capacity_warning` | Seats running low | Medium | "Only X seats remaining at [Location]" |

#### Grievances
| Notification Type | Trigger | Priority | Description |
|------------------|---------|----------|-------------|
| `new_grievance` | New grievance submitted | High | "New grievance: [Title] from [Member]" |
| `high_priority_grievance` | Critical grievance submitted | Critical | "CRITICAL: [Title] - Priority: [Priority]" |
| `grievance_unresolved_long` | Grievance pending >3 days | Medium | "Grievance [ID] pending for 3+ days" |

#### Inventory & Maintenance
| Notification Type | Trigger | Priority | Description |
|------------------|---------|----------|-------------|
| `inventory_low` | Inventory quantity low | Medium | "[Item] running low. Current qty: X" |
| `equipment_broken` | Item marked as broken | High | "[Item] at [Location] reported broken" |
| `maintenance_due` | Item needs maintenance | Medium | "[Item] maintenance due on [Date]" |

#### Reports & Compliance
| Notification Type | Trigger | Priority | Description |
|------------------|---------|----------|-------------|
| `expense_alert` | Unusual expense | Medium | "Unusual expense of ₹X recorded." |
| `monthly_report_ready` | Monthly report generated | Low | "Monthly report for [Month] is ready." |

---

### 3. ADMIN Notifications
Admins need oversight of everything plus system-level alerts:

#### All Manager Notifications (as Admin sees everything)

#### System & Security
| Notification Type | Trigger | Priority | Description |
|------------------|---------|----------|-------------|
| `system_error` | System error occurs | Critical | "System error: [Error description]" |
| `database_backup` | Backup completed | Low | "Database backup completed successfully." |
| `user_lockout` | Multiple failed logins | High | "User [Name] locked out after failed attempts" |
| `suspicious_activity` | Unusual activity detected | Critical | "Suspicious activity detected: [Details]" |

#### User Management
| Notification Type | Trigger | Priority | Description |
|------------------|---------|----------|-------------|
| `new_admin_created` | New admin user created | Critical | "New admin [Name] created by [Admin]" |
| `manager_created` | New manager created | High | "New manager [Name] created by [Admin]" |
| `role_changed` | User role changed | High | "[Name]'s role changed to [Role]" |

#### Settings & Configuration
| Notification Type | Trigger | Priority | Description |
|------------------|---------|----------|-------------|
| `settings_changed` | Critical settings changed | High | "[Setting] changed by [User]" |
| `subscription_plan_changed` | Plan pricing changed | Medium | "Subscription plans have been updated." |

#### Financial Overview
| Notification Type | Trigger | Priority | Description |
|------------------|---------|----------|-------------|
| `daily_revenue` | Daily revenue summary | Low | "Today's revenue: ₹X | Members: X" |
| `monthly_revenue` | Monthly summary | Low | "Monthly revenue: ₹X | Growth: X%" |
| `pending_payments_total` | Total overdue amount | High | "Total overdue payments: ₹X across X members" |

---

## Implementation Plan

### Phase 1: Update Notification Model
- Add role field to target specific roles
- Add action links for navigation
- Add recipient field (user ID or role-based)
- Expand notification types enum

### Phase 2: Enhance Notifications API
- Add role-based filtering
- Add notification creation endpoints for each trigger
- Implement notification preferences/settings

### Phase 3: Member Notifications
- Create member-facing notification panel
- Add notification preferences for members
- Link notifications to relevant pages

### Phase 4: Manager/Admin Expansion
- Add more automated triggers
- Add daily/weekly digest option
- Add bulk notification capability

---

## Notification Categories Summary

| Category | Member | Manager | Admin |
|----------|--------|---------|-------|
| Subscription & Payments | ✅ | ✅ | ✅ |
| Seat Management | ✅ | ✅ | - |
| Grievances | ✅ | ✅ | - |
| Member Management | - | ✅ | ✅ |
| Inventory & Maintenance | - | ✅ | ✅ |
| System & Security | - | ✅ | ✅ |
| Reports | - | ✅ | ✅ |
| User Management | - | - | ✅ |