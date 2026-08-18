const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/**
 * Uploads a file to the Node gateway's /api/scan-file endpoint as
 * multipart/form-data. The gateway keeps it entirely in memory and forwards
 * it to the Python scanner — nothing is written to disk anywhere.
 */
export async function scanFile(file, { onProgress } = {}) {
  const formData = new FormData();
  formData.append('file', file);

  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api/scan-file`, {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response — fall through
  }

  if (!res.ok) {
    throw new ApiError(data?.error || `Server returned status ${res.status}.`, res.status);
  }

  return data; // { filename, sizeBytes, verdict, sha256, findings, reputation }
}
