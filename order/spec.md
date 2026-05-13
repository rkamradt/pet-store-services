# Order — Service Specification

## Purpose

The Order service owns the full order lifecycle from basket through to fulfilment. It orchestrates the payment and inventory saga: on order placement it triggers a payment charge via the StripeProvider and a stock decrement via the Inventory service. It reacts to the outcomes of those operations to either confirm or cancel the order, and it advances an order to fulfilled when a shipment is dispatched.

## Tech Stack

- **Runtime:** Node.js 20
- **Framework:** Express 4
- **Validation:** express-validator
- **ID generation:** uuid
- **Storage:** In-memory (production deployments should substitute a persistent store)
- **Archetype:** HTTP — standard REST service with domain routes and business logic

---

## API Endpoints

| Method | Path | Description | Request Body | Response Shape |
|--------|------|-------------|--------------|----------------|
| POST | `/orders` | Place a new order | `{ customerId, items: [{ productId, quantity, unitPrice }], paymentMethodId, shippingAddress }` | `201` Order object |
| GET | `/orders/:id` | Get order details and current status | — | `200` Order object |
| GET | `/orders/customer/:customerId` | List all orders for a customer | — | `200` Array of Order objects |
| POST | `/orders/:id/cancel` | Cancel an order and trigger compensating transactions | `{ reason? }` | `200` Updated Order object |

### Order Object Shape

```json
{
  "id": "uuid",
  "customerId": "string",
  "status": "PENDING | CONFIRMED | CANCELLED | FULFILLED",
  "items": [
    {
      "productId": "string",
      "quantity": "number",
      "unitPrice": "number"
    }
  ],
  "totalAmount": "number",
  "paymentMethodId": "string",
  "paymentChargeId": "string | null",
  "shippingAddress": {
    "line1": "string",
    "line2": "string | null",
    "city": "string",
    "postcode": "string",
    "country": "string"
  },
  "cancellationReason": "string | null",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

---

## Events Produced

| Topic | Trigger | Payload Shape |
|-------|---------|---------------|
| `order.placed` | A new order is successfully persisted | `{ orderId, customerId, items, totalAmount, paymentMethodId, placedAt }` |
| `order.confirmed` | `payment.charged` received and order advanced to CONFIRMED | `{ orderId, customerId, paymentChargeId, confirmedAt }` |
| `order.cancelled` | Order cancelled manually or via saga compensation | `{ orderId, customerId, reason, cancelledAt }` |
| `order.fulfilled` | `shipment.dispatched` received and order advanced to FULFILLED | `{ orderId, customerId, fulfilledAt }` |

---

## Events Consumed

| Topic | Handler | What It Does |
|-------|---------|-------------|
| `payment.charged` | `handlePaymentCharged` | Finds the order by `orderId`, sets status to `CONFIRMED`, stores `paymentChargeId`, emits `order.confirmed` |
| `payment.failed` | `handlePaymentFailed` | Finds the order by `orderId`, sets status to `CANCELLED`, stores `cancellationReason`, emits `order.cancelled` |
| `shipment.dispatched` | `handleShipmentDispatched` | Finds the order by `orderId`, sets status to `FULFILLED`, emits `order.fulfilled` |

---

## Dependencies and Rationale

| Dependency | Service ID | Rationale |
|------------|-----------|-----------|
| Customer | `customer` | Verifies the customer account exists before allowing order placement |
| ProductCatalog | `product-catalog` | Validates product IDs and retrieves authoritative pricing |
| StripeProvider | `stripe-provider` | Initiates the payment charge as part of the placement saga |
| Inventory | `inventory` | Checks stock availability and triggers stock decrement on order placement |

---

## Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `PORT` | `8080` | No | HTTP port the service listens on |
| `CUSTOMER_SERVICE_URL` | `http://customer:8080` | Yes (prod) | Base URL for the Customer service |
| `PRODUCT_CATALOG_SERVICE_URL` | `http://product-catalog:8080` | Yes (prod) | Base URL for the ProductCatalog service |
| `STRIPE_PROVIDER_URL` | `http://stripe-provider:8080` | Yes (prod) | Base URL for the StripeProvider service |
| `INVENTORY_SERVICE_URL` | `http://inventory:8080` | Yes (prod) | Base URL for the Inventory service |
| `MESSAGE_BUS_URL` | — | No | URL of message bus for event publishing/consumption |
