# StripeProvider — Claude Code Context

## Role in the Pet Store Ecosystem

`stripe-provider` is a **provider** service in the Pet Store ecosystem. Its sole responsibility is to wrap the external Stripe payments API and translate Stripe's responses into internal domain events that the rest of the ecosystem consumes via Kafka. It does not own any business data and does not make domain decisions.

Other services that depend on payment outcomes (e.g., `order`) listen to the Kafka topics this service publishes rather than calling Stripe directly.

## API Surface

This service exposes **no HTTP domain routes**. The only HTTP endpoint is:

| Method | Path      | Description              |
|--------|-----------|--------------------------|
| GET    | /health   | Liveness check           |

Domain operations (charges, refunds) are triggered internally by the service's polling/scheduling loop and exposed to the ecosystem exclusively through Kafka events.

However, the service also exposes the following REST endpoints for synchronous calls from the Order service:

| Method | Path       | Description                                            |
|--------|------------|--------------------------------------------------------|
| POST   | /charges   | Create a charge against a customer payment method      |
| POST   | /refunds   | Issue a refund for a previous charge                   |

## Event Contracts

### Produces

| Topic              | Trigger                                              |
|--------------------|------------------------------------------------------|
| `payment.charged`  | A charge is successfully processed by Stripe         |
| `payment.failed`   | A charge attempt is rejected by Stripe               |
| `payment.refunded` | A refund is successfully processed by Stripe         |

### Consumes

_(none)_

## Dependencies

- **Stripe** (`https://api.stripe.com`) — foreign API, wrapped via `src/client.js`
- No other Pet Store services are dependencies

## Tech Stack

- **Runtime**: Node.js ≥ 20
- **Framework**: Express
- **Messaging**: KafkaJS
- **HTTP client**: node-fetch

## Environment Variables

| Variable                | Default                    | Description                                              |
|-------------------------|----------------------------|----------------------------------------------------------|
| `PORT`                  | `8080`                     | Port the Express server listens on                       |
| `FOREIGN_API_BASE_URL`  | `https://api.stripe.com`   | Base URL for Stripe API; override with mock in dev/stage |
| `FOREIGN_API_KEY`       | _(required)_               | Stripe secret API key used for Bearer authentication     |
| `KAFKA_BROKERS`         | `localhost:9092`           | Comma-separated list of Kafka broker addresses           |

---

## Archetype Constraints — Provider service

This service IS responsible for:
- Calling the Stripe API via src/client.js
- Translating foreign API responses to internal event format via src/translator.js
- Publishing translated events to the ecosystem via Kafka (src/producer.js)

This service is NOT responsible for:
- ANY business logic — translation only, no domain decisions
- Persisting data
- Exposing domain HTTP routes — /health is the only HTTP endpoint

IMPORTANT: This service contains no business logic.
It translates foreign API responses to internal events only.
If you find yourself adding conditional logic beyond field mapping, stop — that logic belongs in a domain service.
