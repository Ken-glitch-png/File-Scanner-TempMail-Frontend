const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function handle(res) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response — fall through
  }
  if (!res.ok) {
    throw new ApiError(data?.error || `Server returned status ${res.status}.`, res.status);
  }
  return data;
}

export async function createInbox() {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api/temp-mail/create`, { method: 'POST' });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  }
  return handle(res); // { address, expiresAt }
}

export async function fetchInbox(address) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api/temp-mail/${encodeURIComponent(address)}`);
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  }
  return handle(res); // { address, expiresAt, messages }
}
