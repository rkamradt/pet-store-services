# Order — Claude Code Context

## Role in the Pet Store Ecosystem

The Order service owns the **full order lifecycle** — from the moment a customer places an order through to final fulfilment. It is the orchestrator of the payment and inventory saga, coordinating with the StripeProvider (for charging) and Inventory (for stock decrements) services. Orders transition through well-defined states: `PENDING → CONFIRMED → FULFILLED` (happy path) or `CANCELLED` (compensating path).

## API Surface

| Method | Path | Description |
|--------|------|-------------|
| POST | /orders | Place a new order |
| GET | /orders/:id | Get order details and current status |
| GET | /orders/customer/:customerId | List all orders for a customer |
| POST | /orders/:id/cancel | Cancel an order and trigger compensating transactions |
| GET | /health | Health check |

## Event Contracts

### Produces
| Topic | Trigger |
|-------|---------|
| `order.placed` | A new order is successfully created |
| `order.confirmed` | Payment charged + inventory decremented successfully |
| `order.cancelled` | An order is cancelled (manual or saga compensation) |
| `order.fulfilled` | Shipment has been dispatched for the order |

### Consumes
| Topic | Handler | Effect |
|-------|---------|--------|
| `payment.charged` | `handlePaymentCharged` | Advances order to CONFIRMED state, emits `order.confirmed` |
| `payment.failed` | `handlePaymentFailed` | Cancels the order, emits `order.cancelled` |
| `shipment.dispatched` | `handleShipmentDispatched` | Advances order to FULFILLED state, emits `order.fulfilled` |

## Dependencies

| Service | Reason |
|---------|--------|
| `customer` | Validates customer exists before placing an order |
| `product-catalog` | Validates products exist and retrieves pricing |
| `stripe-provider` | Initiates payment charges via the Stripe wrapper |
| `inventory` | Checks and decrements stock levels |

## Tech Stack and Environment Variables

**Tech:** Node.js 20, Express 4, in-memory store (swap for a real DB in production)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP port the service listens on |
| `CUSTOMER_SERVICE_URL` | `http://customer:8080` | Base URL for the Customer service |
| `PRODUCT_CATALOG_SERVICE_URL` | `http://product-catalog:8080` | Base URL for the ProductCatalog service |
| `STRIPE_PROVIDER_URL` | `http://stripe-provider:8080` | Base URL for the StripeProvider service |
| `INVENTORY_SERVICE_URL` | `http://inventory:8080` | Base URL for the Inventory service |
| `MESSAGE_BUS_URL` | *(optional)* | URL of message bus for publishing/consuming events |

## Archetype Constraints — HTTP service

This service IS responsible for:
- Owning and persisting its domain data (in-memory or database)
- Implementing every API endpoint declared in its spec exactly as specified
- Input validation on all mutating endpoints (POST, PUT, PATCH)
- All business logic for its bounded context

This service is NOT responsible for:
- Wrapping external third-party APIs (use a provider service for that)
- Accepting foreign-format payloads (use an adaptor service for that)
- Event-driven processing that is not declared in its event contracts
