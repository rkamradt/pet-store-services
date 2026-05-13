# Pet Store

A microservices-based pet store e-commerce platform featuring product catalog management, inventory tracking, customer profiles, order fulfillment, payment processing, shipping integration, and event-driven notifications. Services communicate via Kafka for cross-domain events and direct API calls for same-domain operations.

## Services

| Service | Archetype | Port | Health Endpoint | Description |
|---------|-----------|------|-----------------|-------------|
| product-catalog | http | 8001 | `GET /health` | Product data management (name, description, category, pricing, images) |
| inventory | http | 8002 | `GET /health` | Stock level tracking and low-stock alerts |
| customer | http | 8003 | `GET /health` | Customer accounts, addresses, preferences, and pet profiles |
| order | http | 8004 | `GET /health` | Order lifecycle and saga orchestration (payment + inventory) |
| stripe-provider | provider | 8005 | `GET /health` | Stripe payments API wrapper (charges and refunds) |
| shipping | http | 8006 | `GET /health` | Shipment creation, fulfillment tracking, and delivery status |
| notification | messaging | — | N/A | Event-driven email/SMS notifications (no HTTP routes) |

## Quick start

### Running services locally

Each service can be run locally with:

**Spring Boot services (product-catalog, inventory, customer, order, shipping):**
```bash
cd <service-id>
mvn spring-boot:run -Dspring-boot.run.arguments="--server.port=PORT"
```

Or build and run:
```bash
cd <service-id>
mvn clean package
java -jar target/*.jar --server.port=PORT
```

**Node.js/Express service (stripe-provider):**
```bash
cd stripe-provider
npm install
PORT=8005 node src/index.js
```

**Messaging service (notification):**
```bash
cd notification
mvn spring-boot:run
```

### Environment variables

All services:
- `PORT` — HTTP port (or `--server.port=PORT` for Spring Boot)
- `KAFKA_BROKERS` — Comma-separated Kafka broker addresses (e.g., `localhost:9092`)

Provider services (stripe-provider):
- `FOREIGN_API_BASE_URL` — Base URL for the Stripe API (default: `https://api.stripe.com`)
- `STRIPE_API_KEY` — API key for authentication with Stripe
- `STRIPE_MOCK_MODE` — Set to `true` to use the mock Stripe provider (dev/stage only)

### Health checks

```bash
# Spring Boot services
curl http://localhost:PORT/health

# Node.js service
curl http://localhost:PORT/health

# Messaging services have no HTTP endpoints
```

## Mock services (dev/stage only)

### stripe-provider-mock

A mock implementation of the Stripe provider for local development and testing.

**Purpose:** Simulates Stripe charge and refund operations without making real API calls.

**Setup:**
```bash
cd stripe-provider-mock
npm install
PORT=9005 node src/index.js
```

**Environment variables:**
- `PORT` — HTTP port (default: 9005)
- `KAFKA_BROKERS` — Kafka broker addresses

**Usage:**
Set `STRIPE_MOCK_MODE=true` and configure `FOREIGN_API_BASE_URL=http://localhost:9005` in the order service or stripe-provider to route calls to the mock.

## ⚠️ Production deployment

**Mock directories (ending in `-mock`) must NEVER be deployed to production.**

Only the following service images should be deployed:
- `ghcr.io/rkamradt/product-catalog:main`
- `ghcr.io/rkamradt/inventory:main`
- `ghcr.io/rkamradt/customer:main`
- `ghcr.io/rkamradt/order:main`
- `ghcr.io/rkamradt/stripe-provider:main`
- `ghcr.io/rkamradt/shipping:main`
- `ghcr.io/rkamradt/notification:main`

In production:
- Set real Stripe API credentials in environment variables
- Configure real Kafka brokers
- Use persistent databases for all HTTP services
- Monitor event channels and alerting systems
