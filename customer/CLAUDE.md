# Customer — Claude Code Context

## Role in the Pet Store Ecosystem

The Customer service is the authoritative owner of all customer-related data in the Pet Store platform. It manages customer account registration, profile updates, address and preference storage, and pet profiles associated with each customer. Other services (such as Order and Notification) reference customer IDs but do not own or duplicate this data.

## API Surface

| Method | Path | Description |
|--------|------|-------------|
| POST | /customers | Register a new customer account |
| GET | /customers/:id | Get a customer profile by ID |
| PUT | /customers/:id | Update customer account details |
| POST | /customers/:id/pets | Add a pet profile to a customer account |
| GET | /customers/:id/pets | List all pet profiles for a customer |
| PUT | /customers/:id/pets/:petId | Update a pet profile |
| DELETE | /customers/:id/pets/:petId | Remove a pet profile |

Additionally:

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check — returns `{ ok: true, service: "customer" }` |

## Event Contracts

### Produces

| Topic | Trigger |
|-------|---------|
| `customer.registered` | Emitted when a new customer account is created via `POST /customers` |

### Consumes

_None_ — this service does not subscribe to any events from other services.

## Dependencies

_None_ — the Customer service is a leaf service with no upstream service dependencies.

## Tech Stack and Environment Variables

**Tech stack:**
- Runtime: Node.js 20 (Alpine)
- Framework: Express 4
- Validation: express-validator
- ID generation: uuid v4
- Logging: morgan (combined format)
- CORS: cors middleware

**Environment variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Port the HTTP server listens on |
| `NODE_ENV` | `development` | Runtime environment |

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
