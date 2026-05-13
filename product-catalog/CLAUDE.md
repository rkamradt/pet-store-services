# ProductCatalog — Claude Code Context

## Role in the Pet Store Ecosystem

ProductCatalog is the authoritative source of truth for all product data in the Pet Store platform. It owns every aspect of a product's record — name, description, category, pricing, and images — and serves this data to other services that need to display or reference products (e.g. Order, Inventory). No other service may mutate or duplicate this data.

## API Surface

| Method | Path | Description |
|--------|------|-------------|
| GET | /products | List all products with optional filtering by category |
| GET | /products/:id | Get a single product by ID |
| POST | /products | Create a new product |
| PUT | /products/:id | Update an existing product |
| DELETE | /products/:id | Remove a product from the catalog |
| GET | /health | Health check |

## Event Contracts

### Produces

| Topic | Trigger |
|-------|---------|
| `product.created` | A new product is successfully added to the catalog |
| `product.updated` | A product's details or price are successfully changed |
| `product.deleted` | A product is successfully removed from the catalog |

### Consumes

_(none)_

## Dependencies

This service has no upstream service dependencies. It is a foundational service in the ecosystem.

## Tech Stack and Environment Variables

**Tech:** Node.js 20 / Express 4

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Port the HTTP server listens on |
| `NODE_ENV` | `development` | Runtime environment |

> **Note:** Events are currently emitted to stdout as structured JSON logs (message-bus integration can be wired in by replacing the `emit` calls in `src/services/products.js` with a real broker client such as RabbitMQ or Kafka).

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
