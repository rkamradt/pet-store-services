# StripeProvider — Service Specification

## Purpose

`stripe-provider` wraps the external [Stripe](https://api.stripe.com) payments API, translating charge and refund operations into internal Kafka events consumed by the rest of the Pet Store ecosystem. It owns no domain data and contains no business logic.

## Tech Stack

- **Runtime**: Node.js ≥ 20
- **Framework**: Express 4
- **Messaging**: KafkaJS
- **HTTP client**: node-fetch
- **Archetype**: Provider — foreign API wrapper

---

## API Endpoints

| Method | Path       | Description                                            | Request Body                                                                                   | Response Shape                                                                                 |
|--------|------------|--------------------------------------------------------|-----------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| GET    | /health    | Liveness probe                                         | —                                                                                             | `{ "ok": true, "service": "stripe-provider" }`                                               |
| POST   | /charges   | Create a charge against a customer payment method via Stripe | `{ "customerId": "string", "amount": number, "currency": "string", "paymentMethodId": "string", "orderId": "string", "description": "string" }` | `{ "chargeId": "string", "status": "string", "amount": number, "currency": "string" }` |
| POST   | /refunds   | Issue a refund for a previous charge via Stripe        | `{ "chargeId": "string", "amount": number, "reason": "string", "orderId": "string" }`        | `{ "refundId": "string", "status": "string", "amount": number, "currency": "string" }`       |

---

## Events Produced

| Topic              | Trigger                                          | Payload Shape                                                                                                                                                          |
|--------------------|--------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `payment.charged`  | A charge is successfully processed by Stripe     | `{ "eventId": "uuid", "topic": "payment.charged", "occurredAt": "ISO8601", "data": { "chargeId": "string", "orderId": "string", "customerId": "string", "amount": number, "currency": "string", "paymentMethodId": "string", "stripeChargeId": "string", "status": "succeeded" } }` |
| `payment.failed`   | A charge attempt is rejected by Stripe           | `{ "eventId": "uuid", "topic": "payment.failed", "occurredAt": "ISO8601", "data": { "orderId": "string", "customerId": "string", "amount": number, "currency": "string", "paymentMethodId": "string", "failureCode": "string", "failureMessage": "string" } }` |
| `payment.refunded` | A refund is successfully processed by Stripe     | `{ "eventId": "uuid", "topic": "payment.refunded", "occurredAt": "ISO8601", "data": { "refundId": "string", "chargeId": "string", "orderId": "string", "amount": number, "currency": "string", "reason": "string", "stripeRefundId": "string", "status": "succeeded" } }` |

---

## Events Consumed

_(none)_

---

## Dependencies

| Dependency          | Type         | Rationale                                                       |
|---------------------|--------------|-----------------------------------------------------------------|
| Stripe API          | Foreign HTTP | The payment processor this service wraps                        |

---

## Environment Variables

| Variable               | Default                  | Required | Description                                                     |
|------------------------|--------------------------|----------|-----------------------------------------------------------------|
| `PORT`                 | `8080`                   | No       | Port the Express server listens on                              |
| `FOREIGN_API_BASE_URL` | `https://api.stripe.com` | No       | Stripe base URL; set to mock URL in dev/stage environments      |
| `FOREIGN_API_KEY`      | —                        | Yes      | Stripe secret API key used for Bearer token authentication      |
| `KAFKA_BROKERS`        | `localhost:9092`         | No       | Comma-separated list of Kafka broker addresses                  |
