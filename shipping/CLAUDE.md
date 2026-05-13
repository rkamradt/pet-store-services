# Shipping — Claude Code Context

## Role in the Pet Store Ecosystem

The Shipping service owns shipment creation, fulfilment tracking, and delivery status for all customer orders. It is the authoritative source of truth for where an order's physical goods are at any point in their journey from warehouse to customer doorstep. It reacts to confirmed orders by creating shipment records, and it exposes HTTP endpoints that allow operators to advance those shipments through their lifecycle (dispatch, delivery).

## API Surface

| Method | Path                        | Description                                      |
|--------|-----------------------------|--------------------------------------------------|
| POST   | /shipments                  | Create a new shipment for a confirmed order      |
| GET    | /shipments/:id              | Get shipment details and current tracking status |
| PUT    | /shipments/:id/dispatch     | Mark a shipment as dispatched                    |
| PUT    | /shipments/:id/deliver      | Mark a shipment as delivered                     |
| GET    | /health                     | Health check                                     |

## Event Contracts

### Produces
| Topic               | Trigger                                        |
|---------------------|------------------------------------------------|
| shipment.created    | Emitted when a new shipment record is created  |
| shipment.dispatched | Emitted when a shipment leaves the warehouse   |
| shipment.delivered  | Emitted when a shipment is confirmed delivered |

### Consumes
| Topic           | Handler                                               |
|-----------------|-------------------------------------------------------|
| order.confirmed | Triggers creation of a new shipment for the confirmed order |

## Dependencies

- **order** — The Shipping service subscribes to the `order.confirmed` event emitted by the Order service. It depends on the Order service's event schema for order ID and line items.

## Tech Stack and Environment Variables

**Tech Stack:** Node.js 20, Express 4, express-validator, uuid, cors, morgan

| Variable         | Default     | Description                                   |
|------------------|-------------|-----------------------------------------------|
| PORT             | 8080        | Port the HTTP server listens on               |
| ORDER_SERVICE_URL| (none)      | Base URL of the Order service (for validation)|

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
