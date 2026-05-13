/**
 * customer-client.js
 *
 * Thin HTTP client for the Customer service.
 * Used by handlers to resolve customer contact details before sending notifications.
 *
 * Base URL is configured via CUSTOMER_SERVICE_URL environment variable.
 */

const CUSTOMER_SERVICE_URL = (process.env.CUSTOMER_SERVICE_URL || 'http://customer:8080').replace(/\/$/, '');

/**
 * Fetch a customer profile from the Customer service.
 *
 * @param {string} customerId
 * @returns {Promise<{
 *   id: string,
 *   firstName: string,
 *   lastName: string,
 *   email: string,
 *   phone: string
 * }>}
 * @throws {Error} if the request fails or the customer is not found
 */
async function getCustomer(customerId) {
  const url = `${CUSTOMER_SERVICE_URL}/customers/${encodeURIComponent(customerId)}`;

  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
  } catch (networkErr) {
    throw new Error(`Customer service unreachable at ${url}: ${networkErr.message}`);
  }

  if (response.status === 404) {
    throw new Error(`Customer not found: ${customerId}`);
  }

  if (!response.ok) {
    throw new Error(`Customer service returned HTTP ${response.status} for customer ${customerId}`);
  }

  const data = await response.json();
  return data;
}

module.exports = { getCustomer };
