'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const inventoryRoutes = require('./routes/inventory');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'inventory' });
});

// Domain routes
app.use('/inventory', inventoryRoutes);

// Error handler — must be mounted last
app.use(errorHandler);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`[inventory] Service listening on port ${PORT}`);
});

module.exports = app;
