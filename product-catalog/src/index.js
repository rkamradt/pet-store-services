'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const productRoutes = require('./routes/products');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'product-catalog' });
});

// Domain routes
app.use('/', productRoutes);

// Error handler — must be mounted LAST
app.use(errorHandler);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`[product-catalog] Listening on port ${PORT}`);
});

module.exports = app;
