# Inventory — Service Specification

## Purpose

The Inventory service owns stock levels for every product in the Pet Store. It is the authoritative source of product availability. It processes stock decrements when orders are placed, restores stock when orders are cancelled, and raises low-stock alerts when product quantities fall below the configured reorder threshold.

## Tech Stack

- **Runtime:** Node.js >= 20
- **Framework:** Express
- **Validation:** express-validator
- **Logging:** morgan (combined format)
- **ID generation:** uuid
- **Archetype:** HTTP — standard REST service with domain routes and business logic

---

## API Endpoints

| Method | Path                       | Description                                   | Request Body                                      | Response Shape                                                                                     |
|--------|----------------------------|-----------------------------------------------|---------------------------------------------------|----------------------------------------------------------------------------------------------------|
| GET    | /inventory/{productId}     | Get current stock level for a product         | —                                                 | `{ productId, stockLevel, reorderThreshold, lastUpdatedAt }`                                       |
| PUT    | /inventory/{productId}     | Manually adjust stock level for a product     | `{ stockLevel: number, reason?: string }`         | `{ productId, stockLevel, reorderThreshold, lastUpdatedAt }`                                       |
| GET    | /inventory/low-stock       | List all products below the reorder threshold | —                                                 | `[{ productId, stockLevel, reorderThreshold, lastUpdatedAt }]`                                     |
| GET    | /health                    | Health check                                  | —                                                 | `{ ok: true, service: "inventory" }`                                                               |

### Request Body Details

#### PUT /inventory/{productId}

```json
{
  "stockLevel": 42,
  "reason": "Manual stock correction after warehouse audit"
}
```

- `stockLevel` — **required**, integer >= 0, the new absolute stock level
- `reason` — optional string, human-readable reason for the manual adjustment

---

## Events Produced

| Topic               | Trigger                                                        | Payload Shape                                                                                              |
|---------------------|----------------------------------------------------------------|------------------------------------------------------------------------------------------------------------|
| inventory.updated   | Emitted whenever a product's stock level changes               | `{ eventId, topic, timestamp, productId, previousStockLevel, newStockLevel, reason }`                     |
| inventory.low-stock | Emitted when stock falls at or below the reorder threshold     | `{ eventId, topic, timestamp, productId, stockLevel, reorderThreshold }`                                   |

---

## Events Consumed

| Topic            | Handler                  | What It Does                                                                                             |
|------------------|--------------------------|----------------------------------------------------------------------------------------------------------|
| order.placed     | handleOrderPlaced        | Iterates each line item in the order; decrements stock by the ordered quantity; emits inventory.updated (and inventory.low-stock if threshold breached) for each product |
| order.cancelled  | handleOrderCancelled     | Iterates each line item in the cancelled order; restores stock by the previously decremented quantity; emits inventory.updated for each product |

### order.placed expected payload (relevant fields)

```json
{
  "orderId": "uuid",
  "lineItems": [
    { "productId": "uuid", "quantity": 2 }
  ]
}
```

### order.cancelled expected payload (relevant fields)

```json
{
  "orderId": "uuid",
  "lineItems": [
    { "productId": "uuid", "quantity": 2 }
  ]
}
```

---

## Dependencies

| Service         | Reason                                                                                          |
|-----------------|-------------------------------------------------------------------------------------------------|
| product-catalog | Validates that a productId exists in the catalog before creating or adjusting inventory records |

---

## Environment Variables

| Variable              | Default                       | Required | Description                                                   |
|-----------------------|-------------------------------|----------|---------------------------------------------------------------|
| PORT                  | 8080                          | No       | HTTP port the service listens on                              |
| PRODUCT_CATALOG_URL   | http://product-catalog:8080   | No       | Base URL for the ProductCatalog service                       |
| REORDER_THRESHOLD     | 10                            | No       | Default stock threshold below which low-stock alert is raised |
| MESSAGE_BROKER_URL    | amqp://localhost:5672         | No       | AMQP message broker URL for event publishing/consuming        |
| EXCHANGE_NAME         | petstore                      | No       | AMQP exchange name                                            |
