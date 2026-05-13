# Pet Store — Platform Architecture Context

## Services in this platform

| Service | ID | Archetype | Purpose |
|---------|----|-----------| --------|
| ProductCatalog | product-catalog | http | Owns all product data including name, description, category, pricing, and images for the pet shop catalog |
| Inventory | inventory | http | Owns stock levels per product, processes stock decrements on order placement, and raises low-stock alerts |
| Customer | customer | http | Owns customer accounts, addresses, preferences, and pet profiles for personalised shopping experiences |
| Order | order | http | Owns the full order lifecycle from basket through to fulfilment, orchestrating the payment and inventory saga |
| StripeProvider | stripe-provider | provider | Wraps the Stripe payments API, exposing charge and refund operations to the ecosystem |
| Shipping | shipping | http | Owns shipment creation, fulfilment tracking, and delivery status for all customer orders |
| Notification | notification | messaging | Reacts to domain events and delivers email and SMS notifications to customers, owning no domain data of its own |

## Archetype legend

- **http** — standard REST service with domain routes and business logic
- **messaging** — event-driven service (Kafka consumer/producer, no HTTP domain routes)
- **provider** — wraps a third-party API; publishes translated events; no business logic
- **adaptor** — accepts inbound foreign-format webhooks; publishes translated events; no business logic

## Mono-repo layout

One directory per service, each with its own Dockerfile and CI workflow.

### Mock directories (dev/stage only — NOT production)

- `stripe-provider-mock/` — test mock for stripe-provider

Directories ending in `-mock` are test scaffolding — never deploy them to production.

## Architecture principles

- **No shared databases.** Cross-domain via Kafka. Same-domain via direct API.
- **Provider and adaptor services contain NO business logic** — they are translation layers only.
- **Business logic lives exclusively in http and messaging services.**

## Three AI operations

- **Forward** — scaffold/implement a service from its spec
- **Reverse** — walk existing code, reconstruct spec, write back to spec.md
- **Delta** — `git diff HEAD~1 -- spec.md > spec.diff`, implement only changed sections

## Adding a new service

1. Architect it in ArchitectAI → push updated spec and ecosystem.json
2. In the service repo: `claude "Scaffold this service per @../root/CLAUDE.md#<service-id>"`
3. Place the generated service CLAUDE.md at the repo root
