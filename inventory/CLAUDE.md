# Inventory — Claude Code Context

## Role in the Pet Store Ecosystem

The Inventory service is a core domain service responsible for owning and managing stock levels for every product in the Pet Store. It is the single source of truth for product availability. It processes stock decrements when orders are placed and restores stock when orders are cancelled. It also monitors stock levels and raises low-stock alerts when a product falls below the configured reorder threshold.

## API Surface

| Method | Path                        | Description                                      |
|--------|-----------------------------|--------------------------------------------------|
| GET    | /inventory/{productId}      | Get current stock level for a product            |
| PUT    | /inventory/{productId}      | Manually adjust stock level for a product        |
| GET    | /inventory/low-stock        | List all products below the reorder threshold    |
| GET    | /health                     | Health check endpoint                            |

## Event Contracts

### Produces

| Topic              | Trigger                                                  |
|--------------------|----------------------------------------------------------|
| inventory.updated  | Emitted when a product's stock level changes             |
| inventory.low-stock| Emitted when a product's stock falls below reorder threshold |

### Consumes

| Topic            | Handler                                                        |
|------------------|----------------------------------------------------------------|
| order.placed     | Decrements stock for each product line item in the order       |
| order.cancelled  | Restores stock for each product line item in a cancelled order |

## Dependencies

- **product-catalog** — Validates that a productId exists before creating or adjusting an inventory record. The Inventory service calls the ProductCatalog API to verify product existence.

## Tech Stack and Environment Variables

**Tech stack:** Node.js (>=20), Express, express-validator, morgan, cors, uuid

| Variable                  | Default                          | Description                                      |
|---------------------------|----------------------------------|--------------------------------------------------|
| PORT                      | 8080                             | HTTP port the service listens on                 |
| PRODUCT_CATALOG_URL       | http://product-catalog:8080      | Base URL for the ProductCatalog service          |
| REORDER_THRESHOLD         | 10                               | Default stock level below which low-stock fires  |
| MESSAGE_BROKER_URL        | amqp://localhost:5672            | URL of the AMQP message broker                   |
| EXCHANGE_NAME             | petstore                         | AMQP exchange name for publishing events         |

---

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
