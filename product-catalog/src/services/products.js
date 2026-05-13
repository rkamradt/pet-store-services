'use strict';

const { v4: uuidv4 } = require('uuid');

// ─── In-memory store ─────────────────────────────────────────────────────────

/** @type {Map<string, Product>} */
const store = new Map();

// Seed the store with realistic sample products
const seed = [
  {
    id: uuidv4(),
    name: 'Premium Dry Dog Food — Salmon & Rice',
    description: 'High-protein dry kibble made with wild-caught salmon and wholesome brown rice, suitable for adult dogs of all breeds.',
    category: 'dog-food',
    price: 34.99,
    currency: 'GBP',
    imageUrl: 'https://assets.petstore.example/images/dog-food-salmon-rice.jpg',
    tags: ['dog', 'food', 'dry', 'salmon', 'grain-inclusive'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: 'Interactive Feather Wand — Cat Toy',
    description: 'Stimulating feather wand toy that encourages natural hunting behaviour in cats. Extendable handle, replaceable feather head.',
    category: 'cat-toys',
    price: 9.49,
    currency: 'GBP',
    imageUrl: 'https://assets.petstore.example/images/cat-toy-feather-wand.jpg',
    tags: ['cat', 'toy', 'interactive', 'feather'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: 'Orthopedic Memory Foam Pet Bed — Large',
    description: 'Veterinary-grade memory foam bed designed to relieve joint pressure for senior dogs and cats. Removable, machine-washable cover.',
    category: 'beds-and-furniture',
    price: 79.99,
    currency: 'GBP',
    imageUrl: 'https://assets.petstore.example/images/ortho-bed-large.jpg',
    tags: ['bed', 'orthopedic', 'large', 'dog', 'cat', 'senior'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

seed.forEach((product) => store.set(product.id, product));

// ─── Event emitter (stdout — replace with broker client in production) ────────

/**
 * Emits a domain event as a structured JSON log line.
 * @param {string} eventType
 * @param {object} data
 */
function emit(eventType, data) {
  const event = {
    eventType,
    timestamp: new Date().toISOString(),
    data,
  };
  console.log(JSON.stringify(event));
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * List all products, optionally filtered by category.
 *
 * @param {{ category?: string }} [filters]
 * @returns {Promise<Product[]>}
 */
async function listProducts({ category } = {}) {
  let products = Array.from(store.values());

  if (category) {
    const normalised = category.trim().toLowerCase();
    products = products.filter(
      (p) => p.category.toLowerCase() === normalised,
    );
  }

  return products;
}

/**
 * Get a single product by ID.
 *
 * @param {string} id
 * @returns {Promise<Product>}
 * @throws {{ status: 404, message: string }}
 */
async function getProduct(id) {
  const product = store.get(id);
  if (!product) {
    const err = new Error(`Product not found: ${id}`);
    err.status = 404;
    throw err;
  }
  return product;
}

/**
 * Create a new product and emit a product.created event.
 *
 * @param {{ name: string, description: string, category: string, price: number, currency?: string, imageUrl?: string, tags?: string[] }} body
 * @returns {Promise<Product>}
 */
async function createProduct(body) {
  const now = new Date().toISOString();
  const product = {
    id: uuidv4(),
    name: body.name.trim(),
    description: body.description.trim(),
    category: body.category.trim(),
    price: parseFloat(body.price),
    currency: (body.currency || 'GBP').toUpperCase(),
    imageUrl: body.imageUrl || null,
    tags: Array.isArray(body.tags) ? body.tags.map((t) => String(t).trim()) : [],
    createdAt: now,
    updatedAt: now,
  };

  store.set(product.id, product);
  emit('product.created', product);
  return product;
}

/**
 * Update an existing product and emit a product.updated event.
 *
 * @param {string} id
 * @param {Partial<{ name: string, description: string, category: string, price: number, currency: string, imageUrl: string, tags: string[] }>} updates
 * @returns {Promise<Product>}
 * @throws {{ status: 404, message: string }}
 */
async function updateProduct(id, updates) {
  const existing = store.get(id);
  if (!existing) {
    const err = new Error(`Product not found: ${id}`);
    err.status = 404;
    throw err;
  }

  const updated = {
    ...existing,
    ...(updates.name !== undefined && { name: updates.name.trim() }),
    ...(updates.description !== undefined && { description: updates.description.trim() }),
    ...(updates.category !== undefined && { category: updates.category.trim() }),
    ...(updates.price !== undefined && { price: parseFloat(updates.price) }),
    ...(updates.currency !== undefined && { currency: updates.currency.toUpperCase() }),
    ...(updates.imageUrl !== undefined && { imageUrl: updates.imageUrl }),
    ...(updates.tags !== undefined && { tags: updates.tags.map((t) => String(t).trim()) }),
    updatedAt: new Date().toISOString(),
  };

  store.set(id, updated);
  emit('product.updated', updated);
  return updated;
}

/**
 * Delete a product by ID and emit a product.deleted event.
 *
 * @param {string} id
 * @returns {Promise<void>}
 * @throws {{ status: 404, message: string }}
 */
async function deleteProduct(id) {
  if (!store.has(id)) {
    const err = new Error(`Product not found: ${id}`);
    err.status = 404;
    throw err;
  }

  store.delete(id);
  emit('product.deleted', { id });
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};

// ─── JSDoc typedef (for IDE support) ─────────────────────────────────────────

/**
 * @typedef {object} Product
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} category
 * @property {number} price
 * @property {string} currency
 * @property {string|null} imageUrl
 * @property {string[]} tags
 * @property {string} createdAt
 * @property {string} updatedAt
 */
