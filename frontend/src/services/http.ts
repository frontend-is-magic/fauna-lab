export interface RequestOptions extends RequestInit {
  bodyJson?: unknown;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { bodyJson, headers, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(bodyJson ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    },
    body: bodyJson ? JSON.stringify(bodyJson) : rest.body
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}
