'use strict';

const { v4: uuidv4 } = require('uuid');

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

/**
 * @type {Map<string, Customer>}
 *
 * @typedef {Object} Address
 * @property {string} line1
 * @property {string} [line2]
 * @property {string} city
 * @property {string} [county]
 * @property {string} postcode
 * @property {string} country  — ISO 3166-1 alpha-2 country code
 *
 * @typedef {Object} Preferences
 * @property {boolean} marketingEmailsOptIn
 * @property {boolean} smsAlertsOptIn
 * @property {string[]} favouriteCategories
 *
 * @typedef {Object} Pet
 * @property {string} id
 * @property {string} customerId
 * @property {string} name
 * @property {string} species     — e.g. "dog", "cat", "rabbit"
 * @property {string} [breed]
 * @property {string} [dateOfBirth]  — ISO 8601 date string
 * @property {string} [notes]
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * @typedef {Object} Customer
 * @property {string} id
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 * @property {string} [phone]
 * @property {Address} [address]
 * @property {Preferences} preferences
 * @property {Pet[]} pets
 * @property {string} createdAt
 * @property {string} updatedAt
 */
const customers = new Map();

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Retrieve a customer by ID, throwing a 404 if not found.
 * @param {string} id
 * @returns {Customer}
 */
function requireCustomer(id) {
  const customer = customers.get(id);
  if (!customer) {
    const err = new Error(`Customer with id '${id}' not found`);
    err.status = 404;
    throw err;
  }
  return customer;
}

/**
 * Retrieve a specific pet from a customer's pets array, throwing a 404 if not found.
 * @param {Customer} customer
 * @param {string} petId
 * @returns {Pet}
 */
function requirePet(customer, petId) {
  const pet = customer.pets.find((p) => p.id === petId);
  if (!pet) {
    const err = new Error(`Pet with id '${petId}' not found for customer '${customer.id}'`);
    err.status = 404;
    throw err;
  }
  return pet;
}

/**
 * Build a default Preferences object.
 * @param {Partial<Preferences>} [overrides]
 * @returns {Preferences}
 */
function buildPreferences(overrides = {}) {
  return {
    marketingEmailsOptIn: overrides.marketingEmailsOptIn ?? false,
    smsAlertsOptIn: overrides.smsAlertsOptIn ?? false,
    favouriteCategories: overrides.favouriteCategories ?? [],
  };
}

/**
 * Emit a domain event.
 * In this in-memory implementation the event is logged to stdout.
 * Replace with a real message-broker client (e.g. RabbitMQ, Kafka) as needed.
 *
 * @param {string} topic
 * @param {object} payload
 */
function emitEvent(topic, payload) {
  console.log(`[customer] EVENT ${topic}:`, JSON.stringify(payload));
}

// ---------------------------------------------------------------------------
// Exported service functions
// ---------------------------------------------------------------------------

/**
 * Register a new customer account.
 *
 * Emits: customer.registered
 *
 * @param {{ firstName: string, lastName: string, email: string, phone?: string, address?: Address, preferences?: Partial<Preferences> }} data
 * @returns {Promise<Customer>}
 */
async function createCustomer(data) {
  // Ensure email uniqueness
  for (const existing of customers.values()) {
    if (existing.email.toLowerCase() === data.email.toLowerCase()) {
      const err = new Error(`A customer with email '${data.email}' already exists`);
      err.status = 409;
      throw err;
    }
  }

  const now = new Date().toISOString();
  const id = uuidv4();

  /** @type {Customer} */
  const customer = {
    id,
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone ? data.phone.trim() : undefined,
    address: data.address
      ? {
          line1: data.address.line1 || '',
          line2: data.address.line2 || '',
          city: data.address.city || '',
          county: data.address.county || '',
          postcode: data.address.postcode || '',
          country: (data.address.country || '').toUpperCase(),
        }
      : undefined,
    preferences: buildPreferences(data.preferences),
    pets: [],
    createdAt: now,
    updatedAt: now,
  };

  customers.set(id, customer);

  emitEvent('customer.registered', {
    customerId: customer.id,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    registeredAt: customer.createdAt,
  });

  return customer;
}

/**
 * Retrieve a single customer by ID.
 *
 * @param {string} id
 * @returns {Promise<Customer>}
 */
async function getCustomerById(id) {
  return requireCustomer(id);
}

/**
 * Update a customer's account details.
 * Only the fields provided in `data` are mutated; all other fields are preserved.
 *
 * @param {string} id
 * @param {{ firstName?: string, lastName?: string, email?: string, phone?: string, address?: Partial<Address>, preferences?: Partial<Preferences> }} data
 * @returns {Promise<Customer>}
 */
async function updateCustomer(id, data) {
  const customer = requireCustomer(id);

  // Enforce email uniqueness if email is being changed
  if (data.email && data.email.toLowerCase() !== customer.email) {
    for (const existing of customers.values()) {
      if (existing.id !== id && existing.email.toLowerCase() === data.email.toLowerCase()) {
        const err = new Error(`A customer with email '${data.email}' already exists`);
        err.status = 409;
        throw err;
      }
    }
    customer.email = data.email.trim().toLowerCase();
  }

  if (data.firstName !== undefined) customer.firstName = data.firstName.trim();
  if (data.lastName !== undefined) customer.lastName = data.lastName.trim();
  if (data.phone !== undefined) customer.phone = data.phone ? data.phone.trim() : undefined;

  if (data.address !== undefined) {
    customer.address = {
      line1: data.address.line1 ?? customer.address?.line1 ?? '',
      line2: data.address.line2 ?? customer.address?.line2 ?? '',
      city: data.address.city ?? customer.address?.city ?? '',
      county: data.address.county ?? customer.address?.county ?? '',
      postcode: data.address.postcode ?? customer.address?.postcode ?? '',
      country: data.address.country
        ? data.address.country.toUpperCase()
        : customer.address?.country ?? '',
    };
  }

  if (data.preferences !== undefined) {
    customer.preferences = {
      marketingEmailsOptIn:
        data.preferences.marketingEmailsOptIn ?? customer.preferences.marketingEmailsOptIn,
      smsAlertsOptIn: data.preferences.smsAlertsOptIn ?? customer.preferences.smsAlertsOptIn,
      favouriteCategories:
        data.preferences.favouriteCategories ?? customer.preferences.favouriteCategories,
    };
  }

  customer.updatedAt = new Date().toISOString();
  customers.set(id, customer);
  return customer;
}

/**
 * Add a pet profile to a customer account.
 *
 * @param {string} customerId
 * @param {{ name: string, species: string, breed?: string, dateOfBirth?: string, notes?: string }} data
 * @returns {Promise<Pet>}
 */
async function addPet(customerId, data) {
  const customer = requireCustomer(customerId);

  const now = new Date().toISOString();
  /** @type {Pet} */
  const pet = {
    id: uuidv4(),
    customerId,
    name: data.name.trim(),
    species: data.species.trim().toLowerCase(),
    breed: data.breed ? data.breed.trim() : undefined,
    dateOfBirth: data.dateOfBirth || undefined,
    notes: data.notes ? data.notes.trim() : undefined,
    createdAt: now,
    updatedAt: now,
  };

  customer.pets.push(pet);
  customer.updatedAt = now;
  customers.set(customerId, customer);

  return pet;
}

/**
 * List all pet profiles for a customer.
 *
 * @param {string} customerId
 * @returns {Promise<Pet[]>}
 */
async function listPets(customerId) {
  const customer = requireCustomer(customerId);
  return customer.pets;
}

/**
 * Update a pet profile belonging to a customer.
 *
 * @param {string} customerId
 * @param {string} petId
 * @param {{ name?: string, species?: string, breed?: string, dateOfBirth?: string, notes?: string }} data
 * @returns {Promise<Pet>}
 */
async function updatePet(customerId, petId, data) {
  const customer = requireCustomer(customerId);
  const pet = requirePet(customer, petId);

  if (data.name !== undefined) pet.name = data.name.trim();
  if (data.species !== undefined) pet.species = data.species.trim().toLowerCase();
  if (data.breed !== undefined) pet.breed = data.breed ? data.breed.trim() : undefined;
  if (data.dateOfBirth !== undefined) pet.dateOfBirth = data.dateOfBirth || undefined;
  if (data.notes !== undefined) pet.notes = data.notes ? data.notes.trim() : undefined;

  const now = new Date().toISOString();
  pet.updatedAt = now;
  customer.updatedAt = now;
  customers.set(customerId, customer);

  return pet;
}

/**
 * Remove a pet profile from a customer account.
 *
 * @param {string} customerId
 * @param {string} petId
 * @returns {Promise<void>}
 */
async function deletePet(customerId, petId) {
  const customer = requireCustomer(customerId);
  // Verify the pet exists before attempting removal
  requirePet(customer, petId);

  customer.pets = customer.pets.filter((p) => p.id !== petId);
  customer.updatedAt = new Date().toISOString();
  customers.set(customerId, customer);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  createCustomer,
  getCustomerById,
  updateCustomer,
  addPet,
  listPets,
  updatePet,
  deletePet,
};
