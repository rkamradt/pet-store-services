# Customer — Service Specification

## Purpose

The Customer service owns all customer-related domain data in the Pet Store platform. It is responsible for:

- Customer account registration and lifecycle management
- Storing and updating personal details, addresses, and preferences
- Managing pet profiles associated with each customer account
- Emitting domain events when significant state changes occur

## Tech Stack

- **Runtime:** Node.js 20
- **Framework:** Express 4
- **Archetype:** HTTP — standard REST service with domain routes and business logic
- **Persistence:** In-memory store (replaceable with a database adapter)
- **Validation:** express-validator
- **ID generation:** uuid v4

---

## API Endpoints

| Method | Path | Description | Request Body | Response Shape |
|--------|------|-------------|--------------|----------------|
| POST | /customers | Register a new customer account | `{ firstName, lastName, email, phone?, address?, preferences? }` | `201` — full customer object |
| GET | /customers/:id | Get a customer profile by ID | — | `200` — full customer object |
| PUT | /customers/:id | Update customer account details | `{ firstName?, lastName?, email?, phone?, address?, preferences? }` | `200` — updated customer object |
| POST | /customers/:id/pets | Add a pet profile to a customer | `{ name, species, breed?, dateOfBirth?, notes? }` | `201` — full pet object |
| GET | /customers/:id/pets | List all pet profiles for a customer | — | `200` — array of pet objects |
| PUT | /customers/:id/pets/:petId | Update a pet profile | `{ name?, species?, breed?, dateOfBirth?, notes? }` | `200` — updated pet object |
| DELETE | /customers/:id/pets/:petId | Remove a pet profile | — | `204` — no content |

### Customer Object Shape

```json
{
  "id": "uuid",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "phone": "+44 7700 900123",
  "address": {
    "line1": "12 Bark Lane",
    "line2": "",
    "city": "London",
    "county": "Greater London",
    "postcode": "EC1A 1BB",
    "country": "GB"
  },
  "preferences": {
    "marketingEmailsOptIn": true,
    "smsAlertsOptIn": false,
    "favouriteCategories": ["dog-food", "toys"]
  },
  "pets": [],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Pet Object Shape

```json
{
  "id": "uuid",
  "customerId": "uuid",
  "name": "Biscuit",
  "species": "dog",
  "breed": "Golden Retriever",
  "dateOfBirth": "2021-06-15",
  "notes": "Allergic to grain-based foods",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Events Produced

| Topic | Trigger | Payload Shape |
|-------|---------|---------------|
| `customer.registered` | A new customer account is successfully created via `POST /customers` | `{ customerId, email, firstName, lastName, registeredAt }` |

---

## Events Consumed

_None_ — the Customer service does not subscribe to events from any other service.

---

## Dependencies

_None_ — the Customer service has no upstream service dependencies within the Pet Store ecosystem.

---

## Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `PORT` | `8080` | No | Port the HTTP server listens on |
| `NODE_ENV` | `development` | No | Runtime environment (`development`, `production`, `test`) |
