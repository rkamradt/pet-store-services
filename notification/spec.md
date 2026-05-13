# Notification — Service Specification

## Purpose

The Notification service reacts to domain events from across the Pet Store platform and delivers timely email and SMS notifications to customers and internal operations staff. It owns no domain data of its own and maintains no persistent store. All customer contact details are resolved on demand from the Customer service.

---

## Tech Stack

| Concern         | Choice                          |
|-----------------|---------------------------------|
| Runtime         | Node.js 20                      |
| Framework       | Express 4                       |
| Messaging       | KafkaJS (Apache Kafka consumer) |
| Archetype       | Messaging (event-driven)        |
| Containerisation| Docker (multi-stage, Alpine)    |

---

## Archetype

**Messaging** — event-driven service. No persistent store. No domain HTTP routes.

---

## API Endpoints

No domain HTTP routes. The service exposes one operational endpoint only:

| Method | Path      | Description                                   | Request Body | Response Shape              |
|--------|-----------|-----------------------------------------------|--------------|-----------------------------|
| GET    | /health   | Liveness probe — returns service health status | —            | `{ ok: true, service: "notification" }` |

---

## Events Produced

_(none — this service consumes events only and does not publish to any Kafka topic)_

---

## Events Consumed

| Topic                 | Handler File                          | What It Does                                                                    |
|-----------------------|---------------------------------------|---------------------------------------------------------------------------------|
| `order.placed`        | `src/handlers/order-placed.js`        | Sends an order-received confirmation email and SMS to the customer              |
| `order.confirmed`     | `src/handlers/order-confirmed.js`     | Sends an order-confirmed and payment-success notification to the customer       |
| `order.cancelled`     | `src/handlers/order-cancelled.js`     | Sends an order-cancellation notification to the customer                        |
| `payment.failed`      | `src/handlers/payment-failed.js`      | Sends a payment-failure notification advising the customer to retry or update card |
| `shipment.dispatched` | `src/handlers/shipment-dispatched.js` | Sends a dispatch notification with tracking reference and estimated delivery    |
| `shipment.delivered`  | `src/handlers/shipment-delivered.js`  | Sends a delivery-confirmation notification to the customer                      |
| `inventory.low-stock` | `src/handlers/inventory-low-stock.js` | Sends an internal alert email to the operations team requesting restocking      |

Consumer group: `notification-group`

---

## Dependencies and Rationale

| Service    | Type     | Rationale                                                                       |
|------------|----------|---------------------------------------------------------------------------------|
| `customer` | HTTP GET | Resolves customer contact details (email, phone, name) required to address notifications. The notification service itself stores no customer data. |

---

## Environment Variables

| Variable               | Default                  | Required | Description                                            |
|------------------------|--------------------------|----------|--------------------------------------------------------|
| `PORT`                 | `8080`                   | No       | Port on which the Express server listens               |
| `KAFKA_BROKERS`        | `localhost:9092`         | Yes (prod)| Comma-separated Kafka broker addresses                |
| `CUSTOMER_SERVICE_URL` | `http://customer:8080`   | Yes (prod)| Base URL for the Customer service REST API            |
| `NODE_ENV`             | `development`            | No       | Controls log verbosity and behaviour                   |
| `OPS_ALERT_EMAIL`      | `ops@petstore.internal`  | No       | Recipient address for internal operations alerts       |
