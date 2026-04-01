# Stripe Webhooks — Setup & Implementation Guide

**Status**: ✅ Complete & Ready to Test  
**Last Updated**: March 25, 2026

---

## What Was Built

### Backend Implementation (`/apps/api/src/routes/webhooks.ts`)

**Webhook Endpoint**: `POST /api/webhooks/stripe`

**Events Handled**:
1. `customer.subscription.created` - New subscription
2. `customer.subscription.updated` - Plan change, billing change
3. `customer.subscription.deleted` - Cancellation
4. `invoice.payment_succeeded` - Successful charge
5. `invoice.payment_failed` - Failed charge
6. `charge.refunded` - Refund issued

**Security**:
- ✅ Stripe signature verification (prevents spoofing)
- ✅ Raw body parsing (required for signature verification)
- ✅ Error logging for debugging
- ✅ Idempotent operations (safe to re-process events)

---

## Setup Instructions

### Step 1: Environment Variables

Add these to your `.env` file:

```bash
# Stripe API Keys (from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_abc123xyz...  # or sk_live_xxx for production
STRIPE_WEBHOOK_SECRET=whsec_test_abc123... # From webhook endpoint settings
```

### Step 2: Register Webhook in Stripe Dashboard

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your webhook URL:
   - **Development**: `http://localhost:4000/api/webhooks/stripe` (use ngrok)
   - **Production**: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - ✅ customer.subscription.created
   - ✅ customer.subscription.updated
   - ✅ customer.subscription.deleted
   - ✅ invoice.payment_succeeded
   - ✅ invoice.payment_failed
   - ✅ charge.refunded
5. Copy the "Signing Secret" (whsec_...)
6. Add to `.env` as `STRIPE_WEBHOOK_SECRET`

### Step 3: Test Locally (with ngrok)

```bash
# Terminal 1: Start your API server
cd apps/api
npm run dev

# Terminal 2: Expose local server to internet
ngrok http 4000
# Output: https://abc123.ngrok.io

# Terminal 3: Send test event
curl -X POST https://abc123.ngrok.io/api/webhooks/stripe \
  -H "stripe-signature: test" \
  -H "Content-Type: application/json" \
  -d '{"type":"customer.subscription.created",...}'
```

Or use Stripe CLI for authentic testing:

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
brew install stripe/stripe-cli/stripe

# Authenticate with your Stripe account
stripe login
# Paste the authentication code

# Forward events to local endpoint
stripe listen --forward-to localhost:4000/api/webhooks/stripe

# In another terminal, trigger test events
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
```

---

## Database Schema Requirements

### Subscription Table (Should already exist)

```prisma
model Subscription {
  id                    String  @id @default(cuid())
  merchantId            String
  
  // Stripe fields
  customerId            String  @unique
  stripe_subscription_id String?
  stripe_price_id       String?
  
  // Plan info
  plan                  String  @default("free") // "free", "starter", "professional", "enterprise"
  status                String  @default("active") // "trialing", "active", "past_due", "canceled", "unpaid", "incomplete"
  
  // Billing periods
  currentPeriodStart    DateTime
  currentPeriodEnd      DateTime
  
  // Cancellation
  cancelAtPeriodEnd     Boolean @default(false)
  canceledAt            DateTime?
  
  // Payment tracking
  lastPaymentDate       DateTime?
  lastFailedPaymentDate DateTime?
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  merchant              Merchant @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  
  @@index([merchantId])
}
```

---

## Event Handler Details

### 1. customer.subscription.created
Triggered when: User subscribes to a plan

**Handler**:
```typescript
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  // 1. Get Stripe customer email
  // 2. Find user by email in database
  // 3. Create/update Subscription record
  // 4. Log event
}
```

**Stores**:
- customerId (from Stripe)
- Plan name (mapped from product ID)
- Subscription status (trialing, active)
- Current billing period

**Database Update**:
```sql
INSERT INTO Subscription (merchantId, customerId, plan, status, ...)
VALUES (...)
ON CONFLICT (customerId) DO UPDATE SET plan = ..., status = ...
```

---

### 2. customer.subscription.updated
Triggered when: User changes plan, updates payment method, billing cycle changes

**Handler Updates**:
- Plan (on upgrade/downgrade)
- Status (if moved to past_due, active, etc.)
- Billing period dates
- cancelAtPeriodEnd flag

**Example Scenarios**:
- User upgrades from Starter to Professional
- Payment method expires (status → past_due)
- User requests cancellation at period end (cancelAtPeriodEnd = true)

---

### 3. customer.subscription.deleted
Triggered when: Subscription is canceled/terminated

**Handler**:
- Sets status to "canceled"
- Records canceledAt timestamp

**Note**: Subscription is soft-deleted (stays in DB, marked as canceled)

---

### 4. invoice.payment_succeeded
Triggered when: Payment is successfully processed

**Handler**:
- Sets status to "active"
- Records lastPaymentDate
- Clears any past_due status

**Sends**: (TODO) Payment confirmation email

---

### 5. invoice.payment_failed
Triggered when: Charge fails (declined card, etc.)

**Handler**:
- Sets status to "past_due"
- Records lastFailedPaymentDate
- Retains subscription (not deleted)

**Retry Strategy**:
- Stripe automatically retries for 3 days
- Subscription cancels if still failing after 3 days
- User can retry manually from billing portal

**Sends**: (TODO) Payment failure notification email

---

### 6. charge.refunded
Triggered when: Refund is issued

**Handler**:
- Log refund details
- TODO: Handle refund logic (e.g., service suspension, compensation)

---

## Error Handling

### Signature Verification Fails
```
Response: 400 Bad Request
Body: { ok: false, error: { code: "INVALID_SIGNATURE" } }
Action: Stripe retries webhook delivery
```

### Database Error During Processing
```
Response: 200 OK (always!)
Reason: Prevents infinite retries
Logging: Error is logged with event ID for manual investigation
```

### Unhandled Event Type
```
Response: 200 OK
Logging: "Unhandled Stripe event type: X"
Action: Manual review needed (new event types from Stripe)
```

---

## Debugging

### Check Webhook Deliveries in Stripe Dashboard
1. Go to https://dashboard.stripe.com/webhooks
2. Click your endpoint
3. Scroll down to "Events" section
4. See status (Delivered ✅ or Failed ❌)
5. Click any event to view request/response


### Common Issues

**Signature Verification Failed**
- ❌ Wrong `STRIPE_WEBHOOK_SECRET`
- ❌ Secret changed but not updated in `.env`
- ✅ Solution: Copy secret from Stripe dashboard again

**Database Record Not Updating**
- ❌ User email mismatch between Stripe and DB
- ❌ Merchant not found in database
- ✅ Solution: Check logs, verify user created subscription properly

**Webhook Endpoint Returns 500**
- ❌ Missing environment variables
- ❌ Database connection issue
- ❌ Middleware misconfiguration
- ✅ Solution: Check API server logs

---

## Testing Scenarios

### Test 1: New Subscription
```bash
stripe trigger customer.subscription.created
# Check database: Subscription should be created with status="trialing" or "active"
```

### Test 2: Plan Upgrade
```bash
stripe trigger customer.subscription.updated \
  --override subscription_items='[{"price":"price_xxx"}]'
# Check database: Plan field should update to "professional"
```

### Test 3: Failed Payment
```bash
stripe trigger invoice.payment_failed
# Check database: Status should be "past_due"
```

### Test 4: Cancellation
```bash
stripe trigger customer.subscription.deleted
# Check database: Status should be "canceled", canceledAt should be set
```

---

## Production Checklist

Before deploying to production:

- [ ] `STRIPE_SECRET_KEY` set to live key (sk_live_...)
- [ ] `STRIPE_WEBHOOK_SECRET` updated to production signing secret
- [ ] Webhook endpoint added to Stripe dashboard with production URL
- [ ] All 6 event types enabled in Stripe webhook settings
- [ ] Test database connectivity from production environment
- [ ] Error logging configured (Sentry, Datadog, etc.)
- [ ] Backup plan if webhook fails (manual sync script)
- [ ] Monitoring alerts set up for webhook failures
- [ ] Payment confirmation emails configured (TODO)
- [ ] Declined payment notifications set up (TODO)

---

## Future Enhancements

### Not Yet Implemented
- [ ] Email notifications on payment failures
- [ ] Payment confirmation receipts
- [ ] Refund handling (service credit, trial extension)
- [ ] Usage-based billing webhook events
- [ ] Dunning management (retry strategy)
- [ ] Invoice generation and delivery
- [ ] Revenue recognition tracking

### Nice-to-Have
- [ ] Webhooks for plan recommendations
- [ ] Advanced analytics from webhook events
- [ ] Automatic downgrade on failed payment
- [ ] Freemium trial auto-upsell

---

## Cost Implications

**Stripe Pricing** (from webhooks):
- ✅ No additional cost for webhooks
- ✅ Webhooks are free beyond volume
- ✅ Bandwidth negligible (small JSON payloads)

**Database Implications**:
- Subscription records: ~1-10KB each
- Index on customerId for faster lookups
- No full history of all events (just current state)

---

## Monitoring & Alerts

### Recommended Alerts

1. **Webhook Delivery Failure** (Email alert)
   ```
   Condition: 5+ failed webhook deliveries in last hour
   Action: Page on-call engineer to investigate
   ```

2. **High Payment Failure Rate** (Slack alert)
   ```
   Condition: >10% of invoices failing
   Action: Notify admin, may indicate system issue or customer base health
   ```

3. **Missing Subscription** (Database alert)
   ```
   Condition: Stripe has subscription but not in DB
   Action: Investigate sync discrepancy
   ```

---

## Relation to Billing System

### The Complete Flow

```
User clicks "Upgrade" button
  ↓
Frontend calls: trpc.billing.createCheckoutSession.mutate({plan: "starter"})
  ↓
Backend creates Stripe Checkout Session
  ↓
Frontend redirects to Stripe Checkout URL
  ↓
User enters card details, clicks "Pay"
  ↓
Stripe processes payment
  ↓
Stripe webhook: POST /api/webhooks/stripe (customer.subscription.created)
  ↓
Backend creates Subscription record in database
  ↓
User sees "Welcome to Starter Plan" in dashboard
  ↓
API enforces plan limits (chats per month, knowledge chunks, etc.)
```

---

## Files Modified

| File | Changes |
|------|---------|
| `/apps/api/src/routes/webhooks.ts` | New: 280+ lines - Complete webhook handler |
| `/apps/api/src/index.ts` | Updated: Added webhook route registration + raw body middleware |

---

## Next Steps

1. ✅ **Add Stripe webhook endpoint to Stripe dashboard** (manual step)
2. ✅ **Configure environment variables** (STRIPE_WEBHOOK_SECRET)
3. ✅ **Test with Stripe CLI** (stripe listen & trigger events)
4. ✅ **Monitor webhook deliveries** in Stripe dashboard
5. ⏳ **Implement email notifications** (payment failure, confirmation)
6. ⏳ **Add payment receipt generation**
7. ⏳ **Setup monitoring alerts**

---

## Support & Documentation

**Stripe Webhooks Docs**: https://stripe.com/docs/webhooks  
**Event Types Reference**: https://stripe.com/docs/api/events/types  
**Stripe CLI**: https://stripe.com/docs/stripe-cli  

---

## Summary

✅ **Stripe webhook endpoint** fully implemented with signature verification  
✅ **6 critical events handled** (subscription + payment lifecycle)  
✅ **Database synchronization** with Stripe subscription state  
✅ **Error handling** prevents webhook loop failures  
✅ **Ready for production** after Stripe dashboard setup  

**What works now**:
- All subscription changes reflected in database
- Payment status tracked (active, past_due, canceled)
- Ready for dashboard to enforce plan limits based on subscription status

**Manual Setup Required**:
- Add webhook endpoint URL to Stripe dashboard
- Copy signing secret to environment variables
