# Shipping — Service Specification

## Purpose

The Shipping service owns shipment creation, fulfilment tracking, and delivery status for all customer orders in the Pet Store ecosystem. It is the single source of truth for the physical movement of goods: from the moment a shipment is created for a confirmed order, through warehouse dispatch, to final delivery confirmation.

## Tech Stack

- **Runtime:** Node.js 20
- **Framework:** Express 4
- **Validation:** express-validator
- **ID generation:** uuid
- **Archetype:** HTTP — standard REST service with domain routes and business logic

---

## API Endpoints

| Method | Path                      | Description                                      | Request Body                                                                                          | Response Shape                                                                                                          |
|--------|---------------------------|--------------------------------------------------|-------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|
| POST   | /shipments                | Create a new shipment for a confirmed order      | `{ orderId: string, customerId: string, address: { line1, line2?, city, postcode, country }, items: [{ productId, quantity }][] }` | `201` Shipment object                                                                                                   |
| GET    | /shipments/:id            | Get shipment details and current tracking status | —                                                                                                     | `200` Shipment object; `404` if not found                                                                               |
| PUT    | /shipments/:id/dispatch   | Mark a shipment as dispatched                    | `{ trackingNumber: string, carrier: string }`                                                         | `200` Updated shipment object; `404` if not found; `409` if not in CREATED status                                      |
| PUT    | /shipments/:id/deliver    | Mark a shipment as delivered                     | —                                                                                                     | `200` Updated shipment object; `404` if not found; `409` if not in DISPATCHED status                                   |

### Shipment Object Shape

```json
{
  "id": "uuid",
  "orderId": "string",
  "customerId": "string",
  "status": "CREATED | DISPATCHED | DELIVERED",
  "address": {
    "line1": "string",
    "line2": "string | null",
    "city": "string",
    "postcode": "string",
    "country": "string"
  },
  "items": [
    { "productId": "string", "quantity": 1 }
  ],
  "trackingNumber": "string | null",
  "carrier": "string | null",
  "createdAt": "ISO8601",
  "dispatchedAt": "ISO8601 | null",
  "deliveredAt": "ISO8601 | null"
}
```

---

## Events Produced

| Topic               | Trigger                                                   | Payload Shape                                                                                                                           |
|---------------------|-----------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| shipment.created    | Emitted when a new shipment record is created for an order | `{ shipmentId, orderId, customerId, address, items, status: "CREATED", createdAt }`                                                    |
| shipment.dispatched | Emitted when a shipment leaves the warehouse              | `{ shipmentId, orderId, customerId, trackingNumber, carrier, status: "DISPATCHED", dispatchedAt }`                                     |
| shipment.delivered  | Emitted when a shipment is confirmed as delivered         | `{ shipmentId, orderId, customerId, status: "DELIVERED", deliveredAt }`                                                                 |

---

## Events Consumed

| Topic           | Handler              | What It Does                                                                                                                     |
|-----------------|----------------------|----------------------------------------------------------------------------------------------------------------------------------|
| order.confirmed | onOrderConfirmed     | Automatically creates a new shipment record for the confirmed order, extracting orderId, customerId, delivery address, and items |

---

## Dependencies

| Service | Reason                                                                                          |
|---------|-------------------------------------------------------------------------------------------------|
| order   | Subscribes to `order.confirmed` events to know when to create a shipment; order data drives the shipment record |

---

## Environment Variables

| Variable          | Default | Required | Description                                                       |
|-------------------|---------|----------|-------------------------------------------------------------------|
| PORT              | 8080    | No       | Port the HTTP server listens on                                   |
| ORDER_SERVICE_URL | —       | No       | Base URL of the Order service (used for cross-service validation) |
