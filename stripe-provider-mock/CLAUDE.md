# stripe-provider-mock — Test Mock

> ⚠️ This service exists ONLY for testing in dev and stage environments.
> It MUST NOT be deployed to production under any circumstances.

## Purpose

Companion mock service for `stripe-provider`. Simulates the Stripe API locally without making actual external HTTP calls. Used for integration testing and local development.

## Usage

Set the `FOREIGN_API_BASE_URL` environment variable in the `stripe-provider` service:

```
FOREIGN_API_BASE_URL=http://stripe-provider-mock:3000
```

Run the mock service:

```bash
npm start
# or for development with auto-reload:
npm run dev
```

Default port: **3000** (override with `PORT` environment variable)

## Endpoints

### Health & Control

**GET /health**
- Liveness check. Returns `{ ok: true, service: "stripe-provider-mock" }`

**GET /mock/calls**
- Returns array of all recorded inbound calls (for test assertions)
- Each entry: `{ timestamp, method, path, headers, body }`

**POST /mock/config**
- Configure failure simulation
- Body: `{ "failNext": true, "statusCode": 500 }`
- Returns: `{ ok: true, config }`

**DELETE /mock/calls**
- Clear the call log between tests
- Returns: `{ ok: true }`

### Stripe API Endpoints (Mocked)

These endpoints serve canned responses from `responses.json`:

- **POST /v1/charges** — Create a charge (success or failure)
- **POST /v1/charges/{charge_id}/refund** — Refund a charge
- **GET /v1/charges/{charge_id}** — Retrieve charge details

## Simulating Failures

To test error handling in `stripe-provider`:

1. Send a POST request to configure the next failure:
   ```bash
   curl -X POST http://stripe-provider-mock:3000/mock/config \
     -H "Content-Type: application/json" \
     -d '{"failNext": true, "statusCode": 402}'
   ```

2. The next request to **any** Stripe API endpoint will return that status code with `{ error: "simulated failure" }`

3. After one failure, `failNext` automatically resets to `false`

Multiple failures require multiple config calls.

## Customising Responses

Edit `responses.json` and restart the service, or extend `index.js` to support runtime response overrides via a new endpoint.

Response shape:
```json
{
  "<METHOD> <path>": {
    "status": 200,
    "body": { ... }
  }
}
```

Example response keys follow Stripe's API conventions:
- `POST /v1/charges` — charge creation
- `GET /v1/charges/{charge_id}` — parameterized retrieval

The mock dynamically matches routes, including path parameters.
