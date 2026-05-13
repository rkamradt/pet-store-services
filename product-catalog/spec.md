# ProductCatalog — Service Specification

## Purpose

ProductCatalog is the single source of truth for all product data in the Pet Store platform. It owns the full product record — name, description, category, pricing, and images — and exposes a standard REST API for managing the catalog lifecycle.

## Tech Stack

- **Runtime:** Node.js 20
- **Framework:** Express 4
- **Archetype:** HTTP — standard REST service with domain routes and business logic
- **Persistence:** In-memory store (swap for a database in production)

---

## API Endpoints

| Method | Path | Description | Request Body | Response Shape |
|--------|------|-------------|--------------|----------------|
| GET | `/products` | List all products; optionally filter by `?category=` query param | — | `Product[]` |
| GET | `/products/:id` | Get a single product by ID | — | `Product` |
| POST | `/products` | Create a new product | `{ name, description, category, price, currency, imageUrl, tags }` | `Product` |
| PUT | `/products/:id` | Update an existing product | `{ name?, description?, category?, price?, currency?, imageUrl?, tags? }` | `Product` |
| DELETE | `/products/:id` | Remove a product from the catalog | — | `{ message }` |
| GET | `/health` | Health check | — | `{ ok: true, service: "product-catalog" }` |

### Product Schema

```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "category": "string",
  "price": "number",
  "currency": "string (ISO 4217, e.g. GBP)",
  "imageUrl": "string (URL)",
  "tags": ["string"],
  "createdAt": "ISO8601 datetime",
  "updatedAt": "ISO8601 datetime"
}
```

---

## Events Produced

| Topic | Trigger | Payload Shape |
|-------|---------|---------------|
| `product.created` | A new product is added to the catalog | `{ eventType, timestamp, data: Product }` |
| `product.updated` | A product's details or price change | `{ eventType, timestamp, data: Product }` |
| `product.deleted` | A product is removed from the catalog | `{ eventType, timestamp, data: { id } }` |

> Events are currently written to stdout as structured JSON. Replace the `emit` helper in `src/services/products.js` with a message broker client (RabbitMQ, Kafka, etc.) for production use.

---

## Events Consumed

_(none)_

---

## Dependencies

| Service | Reason |
|---------|--------|
| _(none)_ | ProductCatalog is a foundational service with no upstream dependencies |

---

## Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `PORT` | `8080` | No | Port the HTTP server listens on |
| `NODE_ENV` | `development` | No | Runtime environment (`development` / `production`) |
