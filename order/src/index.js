'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const ordersRouter = require('./routes/orders');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'order' });
});

// ---------------------------------------------------------------------------
// Domain routes
// ---------------------------------------------------------------------------
app.use('/', ordersRouter);

// ---------------------------------------------------------------------------
// Error handler — must be mounted LAST
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.info(`[order] Service listening on port ${PORT}`);
});

module.exports = app; // exported for testing
