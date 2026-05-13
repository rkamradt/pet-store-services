# Notification — Claude Code Context

## Role in the Pet Store Ecosystem

The Notification service is a pure messaging consumer within the Pet Store platform. It reacts to domain events emitted by other services (Order, Payment, Shipping, Inventory) and delivers email and SMS notifications to customers or internal operations staff. It owns no authoritative domain data of its own and exposes no business HTTP routes — its only HTTP endpoint is `/health`.

It depends on the **Customer** service to resolve customer contact details (email address, phone number) needed to deliver notifications.

---

## API Surface

No HTTP domain routes.

The only HTTP endpoint is:

| Method | Path      | Description              |
|--------|-----------|--------------------------|
| GET    | /health   | Liveness check           |

---

## Event Contracts

### Produces
_(none)_

### Consumes

| Topic                | Action                                                                 |
|----------------------|------------------------------------------------------------------------|
| `order.placed`       | Sends order received confirmation to the customer                      |
| `order.confirmed`    | Sends order confirmed and payment success notification                 |
| `order.cancelled`    | Sends order cancellation notification to the customer                  |
| `payment.failed`     | Sends payment failure notification to the customer                     |
| `shipment.dispatched`| Sends dispatch notification with tracking details to the customer      |
| `shipment.delivered` | Sends delivery confirmation to the customer                            |
| `inventory.low-stock`| Sends internal alert to operations team for restocking                 |

Consumer group ID: `notification-group`

---

## Dependencies

| Service          | Reason                                                      |
|------------------|-------------------------------------------------------------|
| `customer`       | Fetch customer email/phone to address outbound notifications |

Base URL resolved via `CUSTOMER_SERVICE_URL` environment variable.

---

## Tech Stack and Environment Variables

**Tech:** Node.js 20, Express, KafkaJS

| Variable               | Default                  | Description                                      |
|------------------------|--------------------------|--------------------------------------------------|
| `PORT`                 | `8080`                   | HTTP server port                                 |
| `KAFKA_BROKERS`        | `localhost:9092`         | Comma-separated list of Kafka broker addresses   |
| `CUSTOMER_SERVICE_URL` | `http://customer:8080`   | Base URL for the Customer service                |
| `NODE_ENV`             | `development`            | Runtime environment                              |

---

## Archetype Constraints — Messaging service

This service IS responsible for:
- Consuming events from every topic listed in its "consumes" contracts
- Running business logic in response to those events
- Publishing to every topic listed in its "produces" contracts
- Managing its own consumer group offset

This service is NOT responsible for:
- Exposing HTTP domain routes — /health is the only HTTP endpoint
- Owning a persistent authoritative data store
- Wrapping external APIs or accepting foreign-format payloads
