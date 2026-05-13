// This service contains no business logic. It translates foreign API responses to internal events only.

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const client = require('./client');
const translator = require('./translator');
const producer = require('./producer');

const app = express();
const PORT = process.env.PORT || 8080;

// Log the effective foreign API base URL on startup for transparency
const FOREIGN_API_BASE_URL = process.env.FOREIGN_API_BASE_URL || 'https://api.stripe.com';
// In dev/stage: set FOREIGN_API_BASE_URL=http://stripe-provider-mock:3000

app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// ---------------------------------------------------------------------------
// Health check — the only non-domain HTTP endpoint
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'stripe-provider' });
});

// ---------------------------------------------------------------------------
// POST /charges
// Accepts a charge request, calls Stripe, publishes payment.charged or
// payment.failed, and returns the translated result to the caller.
// ---------------------------------------------------------------------------
app.post('/charges', async (req, res) => {
  const { customerId, amount, currency, paymentMethodId, orderId, description } = req.body;

  if (!customerId || !amount || !currency || !paymentMethodId || !orderId) {
    return res.status(400).json({
      error: 'Missing required fields: customerId, amount, currency, paymentMethodId, orderId',
    });
  }

  let stripeResponse;
  try {
    stripeResponse = await client.createCharge({ customerId, amount, currency, paymentMethodId, orderId, description });
  } catch (err) {
    console.error('[charges] Failed to call Stripe:', err.message);
    return res.status(502).json({ error: 'Failed to reach payment provider', detail: err.message });
  }

  const requestContext = { customerId, amount, currency, paymentMethodId, orderId };

  // Stripe returns an error object in the body (HTTP 200 with error) or a status of 'requires_action',
  // 'canceled', or a last_payment_error for declined payments.
  const isFailure =
    stripeResponse.error ||
    stripeResponse.status === 'canceled' ||
    stripeResponse.status === 'requires_payment_method' ||
    stripeResponse.last_payment_error;

  if (isFailure) {
    const event = translator.toPaymentFailed(stripeResponse, requestContext);
    await producer.publish('payment.failed', event);
    return res.status(402).json(event.data);
  }

  const event = translator.toPaymentCharged(stripeResponse, requestContext);
  await producer.publish('payment.charged', event);
  return res.status(201).json(event.data);
});

// ---------------------------------------------------------------------------
// POST /refunds
// Accepts a refund request, calls Stripe, publishes payment.refunded,
// and returns the translated result to the caller.
// ---------------------------------------------------------------------------
app.post('/refunds', async (req, res) => {
  const { chargeId, amount, reason, orderId } = req.body;

  if (!chargeId || !orderId) {
    return res.status(400).json({ error: 'Missing required fields: chargeId, orderId' });
  }

  let stripeResponse;
  try {
    stripeResponse = await client.createRefund({ chargeId, amount, reason, orderId });
  } catch (err) {
    console.error('[refunds] Failed to call Stripe:', err.message);
    return res.status(502).json({ error: 'Failed to reach payment provider', detail: err.message });
  }

  if (stripeResponse.error) {
    console.error('[refunds] Stripe returned an error:', stripeResponse.error);
    return res.status(422).json({ error: stripeResponse.error.message, code: stripeResponse.error.code });
  }

  const requestContext = { chargeId, amount, reason, orderId };
  const event = translator.toPaymentRefunded(stripeResponse, requestContext);
  await producer.publish('payment.refunded', event);
  return res.status(201).json(event.data);
});

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
async function start() {
  console.log(`[stripe-provider] Using foreign API base URL: ${FOREIGN_API_BASE_URL}`);

  try {
    await producer.connect();
  } catch (err) {
    console.error('[stripe-provider] Failed to connect Kafka producer:', err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[stripe-provider] Listening on port ${PORT}`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[stripe-provider] SIGTERM received — shutting down gracefully');
  await producer.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[stripe-provider] SIGINT received — shutting down gracefully');
  await producer.disconnect();
  process.exit(0);
});

start();
