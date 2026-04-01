# Real-time Notifications System

## Overview

Replybase now includes a real-time notification system that keeps users informed about important events happening in their account. The system uses **polling** (5-second intervals) to check for new notifications, with a polished dropdown UI in the dashboard header.

## Architecture

### Components

1. **Notification Bell Component** (`/components/notification-bell.tsx`)
   - Bell icon with unread count badge
   - Dropdown menu showing recent notifications
   - Click-to-read functionality
   - "Mark all as read" action

2. **Notification Hook** (`/lib/use-notifications.ts`)
   - `useNotifications(pollingIntervalMs)` - Main hook for notifications
   - Polls every 5 seconds for new notifications
   - Manages notification state, polling, mark as read
   - Can be paused/resumed with `startPolling()` / `stopPolling()`

3. **Notification Service** (`/apps/api/src/notifications/service.ts`)
   - `NotificationEvents` object with event emitters
   - Creates notifications in database
   - Never throws (non-blocking)

4. **tRPC Router** (`/apps/api/src/trpc/routers/notifications.ts`)
   - `getRecent(limit)` - Fetch recent notifications
   - `getUnreadCount()` - Get badge count
   - `markAsRead(notificationId)` - Mark single as read
   - `markAllAsRead()` - Mark all as read

5. **Database Model** (`Notification` in Prisma)
   - `id` - Unique identifier
   - `merchantId` - Link to merchant (FK)
   - `title` - Notification headline
   - `description` - Optional details
   - `type` - Event type (sync_complete, new_chat, payment_failed, etc.)
   - `read` - Read status
   - `actionUrl` - URL to navigate to (e.g., `/dashboard/sync`)
   - `createdAt/updatedAt` - Timestamps
   - Indexed on `merchantId` and `read` for fast queries

## Notification Types

### Currently Supported

```typescript
// Sync completed successfully
NotificationEvents.syncComplete(merchantId, ticketCount)
// UI: "Sync Complete ✅" → /dashboard/sync

// Payment processing failed
NotificationEvents.paymentFailed(merchantId, amountInCents)
// UI: "Payment Failed ⚠️" → /dashboard/billing

// New chat message arrived
NotificationEvents.newChat(merchantId, visitorName)
// UI: "New Chat Message" → /dashboard/conversations

// Widget installed on store
NotificationEvents.widgetInstalled(merchantId)
// UI: "Widget Installed 🚀" → /dashboard/widget

// Sync job failed
NotificationEvents.syncFailed(merchantId, errorMessage)
// UI: "Sync Failed ❌" → /dashboard/sync

// Integration disconnected
NotificationEvents.integrationDisconnected(merchantId, "shopify")
// UI: "Shopify Disconnected" → /dashboard/settings
```

## Integration Points

### 1. Stripe Webhooks (Payment Events)

**File**: `/apps/api/src/routes/webhooks.ts`

```typescript
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // ... existing code ...
  
  // NEW: Notify merchant of payment failure
  await NotificationEvents.paymentFailed(
    merchant.id,
    invoice.amount_due
  );
}
```

### 2. Sync Job Completion

**File**: `/apps/api/src/workers/syncWorker.ts` (not created yet, but this is where it goes)

```typescript
// When sync job completes successfully
await NotificationEvents.syncComplete(merchantId, ticketsCreated);

// When sync job fails
await NotificationEvents.syncFailed(merchantId, errorMessage);
```

### 3. Chat Message Received

**File**: `/apps/api/src/routes/webhooks.ts` (Gorgias webhook)

```typescript
async function handleChatMessage(message: GorgiasMessage) {
  // ... existing code ...
  
  // NEW: Notify merchant of new chat
  await NotificationEvents.newChat(merchantId, visitorName);
}
```

## Usage in Frontend

### Basic Setup

The notification bell is automatically integrated into the dashboard layout. No additional setup needed!

```typescript
// In /apps/dashboard/app/(dashboard)/layout.tsx
import { NotificationBell } from "@/components/notification-bell";

<header>
  <div className="flex items-center gap-4">
    <NotificationBell />
    {/* User avatar, etc. */}
  </div>
</header>
```

### Using the Hook in Custom Components

```typescript
import { useNotifications } from "@/lib/use-notifications";

export function MyComponent() {
  const { 
    notifications,          // Array of notification objects
    unreadCount,           // Number of unread notifications
    isPolling,             // Boolean - is polling active?
    markAsRead,            // (notificationId) => Promise
    markAllAsRead,         // () => Promise
    startPolling,          // () => void
    stopPolling,           // () => void
    isLoading,             // Boolean - is query loading?
  } = useNotifications(5000); // Poll every 5 seconds

  return (
    <div>
      <p>Unread: {unreadCount}</p>
      {notifications.map(notif => (
        <div 
          key={notif.id}
          onClick={() => markAsRead(notif.id)}
        >
          {notif.title}
        </div>
      ))}
    </div>
  );
}
```

### Custom Polling Interval

```typescript
// Poll every 10 seconds instead of default 5
const { notifications } = useNotifications(10000);

// Poll every 30 seconds for bandwidth-constrained users
const { notifications } = useNotifications(30000);
```

## Database Migration

To set up notifications in your database:

```bash
# Generate migration
cd packages/db
npx prisma migrate dev --name add-notifications

# This will:
# 1. Create notifications table
# 2. Add index on (merchantId, read)
# 3. Add foreign key to merchants
# 4. Add index on merchantId
```

## Backend Integration (Checklist)

- [x] Database model created
- [x] tRPC router with 4 procedures
- [x] Notification service with event emitters
- [x] Frontend hook for polling
- [x] Bell component with dropdown UI
- [ ] Integrate with Stripe webhook (paymentFailed event)
- [ ] Integrate with sync worker (syncComplete/syncFailed events)
- [ ] Integrate with Gorgias webhook (newChat event)
- [ ] Widget installation tracking

## Performance Considerations

### Polling vs WebSockets

**Current Approach: Polling** (5-second intervals)
- ✅ Simple to implement and debug
- ✅ Works behind firewalls/proxies
- ✅ No persistent connections needed
- ❌ Slight latency (up to 5 seconds)
- ❌ More HTTP requests than WebSocket

**Future: WebSocket** (for larger scale)
- ✅ Real-time delivery (<100ms latency)
- ✅ Fewer HTTP requests
- ✅ Better for high-frequency updates
- ❌ More complex to implement
- ❌ Requires connection management

### Optimization Tips

1. **Pause polling when not visible**
   ```typescript
   useEffect(() => {
     const handleVisibilityChange = () => {
       if (document.hidden) {
         stopPolling();
       } else {
         startPolling();
       }
     };
     document.addEventListener('visibilitychange', handleVisibilityChange);
     return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
   }, [startPolling, stopPolling]);
   ```

2. **Increase polling interval during off-peak hours**
   ```typescript
   const interval = isOfficeHours() ? 5000 : 30000;
   const { notifications } = useNotifications(interval);
   ```

3. **Database indexes** (already added)
   - Index on `(merchantId, read)` for fast unread queries
   - Index on `merchantId` for fetching all notifications

## Testing

### Unit Tests

```typescript
// Test notification creation
import { NotificationEvents } from "@/notifications/service";

test("syncComplete creates notification", async () => {
  await NotificationEvents.syncComplete("merchant-1", 5);
  
  const notif = await prisma.notification.findFirst({
    where: { title: "Sync Complete ✅" }
  });
  
  expect(notif?.merchantId).toBe("merchant-1");
  expect(notif?.type).toBe("sync_complete");
});
```

### Integration Tests

```typescript
// Test notification polling
const { result } = renderHook(() => useNotifications(1000));

// Create a notification
await createNotification({
  merchantId: testMerchant.id,
  title: "Test",
  type: "test"
});

// Wait for poll
await waitFor(() => {
  expect(result.current.unreadCount).toBe(1);
});
```

### Manual Testing

1. Navigate to dashboard
2. Look for bell icon in top-right header
3. Create a test notification in database:
   ```sql
   INSERT INTO notifications (id, "merchantId", title, type, "read", "createdAt", "updatedAt")
   VALUES (cuid(), 'merchant-id', 'Test Notification', 'test', false, NOW(), NOW());
   ```
4. Bell should show unread count badge within 5 seconds
5. Click notification to mark as read

## Monitoring & Analytics

### Recommended Metrics

1. **Notification Delivery**
   - Notifications created per hour
   - By type (sync_complete, payment_failed, etc.)

2. **User Engagement**
   - % of notifications marked as read
   - Time to first read
   - Click-through rate on actionUrl

3. **System Health**
   - Polling failures/timeouts
   - Database query latency for notification fetches
   - Queue size of unread notifications

## Future Enhancements

1. **Email Notifications**
   - Send digest emails of unread notifications
   - Option to email on critical events (payment failed)

2. **WebSocket Upgrade**
   - Real-time push instead of polling
   - Connected users get instant notifications

3. **Notification Preferences**
   - Users can choose which event types to receive
   - Snooze notifications temporarily
   - Quiet hours (don't notify at night)

4. **Notification History**
   - Archive old notifications
   - Full-text search of notification history
   - Export notifications as CSV

5. **Rich Notifications**
   - Inline actions (e.g., "Retry Sync" button)
   - Notification threads (group related events)
   - Animated icons/status updates

## Troubleshooting

### Bell Not Showing Unread Count

**Check**:
1. Is the notification in the database? `SELECT COUNT(*) FROM notifications WHERE "merchantId" = 'xxx' AND "read" = false;`
2. Is the polling working? Check network tab for `/trpc/notifications.getUnreadCount` calls
3. Are you logged in? `useNotifications` still works but queries are protected

### Notifications Not Appearing

1. Check that `NotificationEvents` is imported correctly
2. Verify merchantId is correct
3. Check database indexes exist:
   ```sql
   SELECT * FROM pg_indexes WHERE tablename = 'notifications';
   ```

### High Polling Latency

- Increase polling interval if you don't need real-time (e.g., `useNotifications(15000)`)
- Add Redis caching for frequently-polled merchants
- Consider WebSocket migration for high-traffic deployments

## API Reference

### `useNotifications(pollingIntervalMs = 5000)`

**Parameters**:
- `pollingIntervalMs` (number, optional) - Polling frequency in milliseconds. Default: 5000

**Returns**:
```typescript
{
  notifications: Array<{
    id: string;
    title: string;
    description: string | null;
    type: string;
    read: boolean;
    createdAt: Date;
    actionUrl: string | null;
  }>;
  unreadCount: number;
  isPolling: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  isLoading: boolean;
}
```

### `NotificationEvents.syncComplete(merchantId, ticketCount)`

**Parameters**:
- `merchantId` (string) - Merchant to notify
- `ticketCount` (number) - Number of tickets synced

**Returns**: Promise<void>

**Example**:
```typescript
await NotificationEvents.syncComplete("merchant-123", 42);
// Creates notification with title "Sync Complete ✅"
```

### `NotificationEvents.paymentFailed(merchantId, amount?)`

**Parameters**:
- `merchantId` (string) - Merchant to notify
- `amount` (number, optional) - Amount in cents that failed to charge

**Returns**: Promise<void>

### `NotificationEvents.newChat(merchantId, visitorName?)`

**Parameters**:
- `merchantId` (string) - Merchant to notify
- `visitorName` (string, optional) - Name of visitor who sent message

**Returns**: Promise<void>

### Similar for other event types

See "Notification Types" section for complete reference.

## Files Changed

**Created**:
- `/apps/dashboard/lib/use-notifications.ts` - Polling hook
- `/apps/dashboard/components/notification-bell.tsx` - Bell UI component
- `/apps/api/src/notifications/service.ts` - Event emitters
- `/apps/api/src/trpc/routers/notifications.ts` - tRPC procedures
- `/packages/db/prisma/schema.prisma` - Notification model (update)

**Updated**:
- `/apps/dashboard/app/(dashboard)/layout.tsx` - Added bell to header
- `/packages/db/prisma/schema.prisma` - Added Notification model + relation

**Database**:
- Created notifications table
- Added indexes on merchantId + read status

## Next Steps

1. **Run Prisma migration** to create notifications table
2. **Integrate with webhooks** - Update stripe/gorgias handlers to emit notifications
3. **Add notification preferences** - Let users control which events they see
4. **Monitor metrics** - Set up alerts for notification delivery health
5. **Upgrade to WebSocket** - When scaling to high traffic

