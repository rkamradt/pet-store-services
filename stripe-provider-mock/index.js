const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const responses = require('./responses.json');

const app = express();

// Middleware
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// In-memory state
let config = { failNext: false, statusCode: 500 };
const callLog = [];

// Helper function to extract the route key from a request
function getRouteKey(method, path) {
  // Try exact match first
  const exactKey = `${method} ${path}`;
  if (responses[exactKey]) {
    return exactKey;
  }

  // Try pattern matching for parameterized routes
  const pathParts = path.split('/');
  for (const responseKey of Object.keys(responses)) {
    const [keyMethod, keyPath] = responseKey.split(' ');
    if (keyMethod !== method) continue;

    const keyParts = keyPath.split('/');
    if (keyParts.length !== pathParts.length) continue;

    let matches = true;
    for (let i = 0; i < keyParts.length; i++) {
      // Match if exact or if key part is a parameter (enclosed in {})
      if (keyParts[i] !== pathParts[i] && !keyParts[i].startsWith('{')) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return responseKey;
    }
  }

  return null;
}

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'stripe-provider-mock' });
});

// Mock control endpoints
app.get('/mock/calls', (req, res) => {
  res.json(callLog);
});

app.post('/mock/config', (req, res) => {
  Object.assign(config, req.body);
  res.json({ ok: true, config });
});

app.delete('/mock/calls', (req, res) => {
  callLog.length = 0;
  res.json({ ok: true });
});

// Dynamic route handler for Stripe API endpoints
app.all('*', (req, res) => {
  const { method, path, headers, body } = req;

  // Skip mock control endpoints
  if (path.startsWith('/mock/') || path === '/health') {
    return;
  }

  // Log the call
  callLog.push({
    timestamp: new Date().toISOString(),
    method,
    path,
    headers,
    body
  });

  // Check if we should simulate a failure
  if (config.failNext) {
    config.failNext = false;
    return res.status(config.statusCode).json({ error: 'simulated failure' });
  }

  // Find matching response
  const routeKey = getRouteKey(method, path);
  if (!routeKey || !responses[routeKey]) {
    return res.status(404).json({
      error: {
        type: 'invalid_request_error',
        message: `Mock endpoint not found: ${method} ${path}`
      }
    });
  }

  const response = responses[routeKey];
  res.status(response.status).json(response.body);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`stripe-provider-mock listening on port ${PORT}`);
});
