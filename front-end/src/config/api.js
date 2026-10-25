const API_BASE_URL = process.env.REACT_APP_API_URL
  || (process.env.NODE_ENV === 'production'
    ? 'https://collection-pokemon-tcg.onrender.com'
    : 'http://localhost:3001');

async function request(path, options = {}) {
  const { token, headers, body, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.error || 'Erro ao comunicar com a API.');
    error.statusCode = response.status;
    throw error;
  }

  return payload;
}

export { API_BASE_URL, request };