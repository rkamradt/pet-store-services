'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const shipmentsRouter = require('./routes/shipments');
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
  res.json({ ok: true, service: 'shipping' });
});

// ---------------------------------------------------------------------------
// Domain routes
// ---------------------------------------------------------------------------
app.use('/shipments', shipmentsRouter);

// ---------------------------------------------------------------------------
// Central error handler — MUST be mounted last
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.info(`[shipping] Service listening on port ${PORT}`);
});

module.exports = app;
