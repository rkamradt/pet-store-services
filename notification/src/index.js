const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const producer = require('./producer');
const { startConsumer } = require('./consumer');

const app = express();

app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check — the only HTTP endpoint this service exposes
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'notification' });
});

const PORT = process.env.PORT || 8080;

async function main() {
  try {
    await producer.connect();
    await startConsumer();

    app.listen(PORT, () => {
      console.log(`[notification] HTTP server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('[notification] fatal startup error:', err.message, err.stack);
    process.exit(1);
  }
}

main();

module.exports = app;
