export interface RequestOptions extends RequestInit {
  bodyJson?: unknown;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      const payload = (await response.json()) as { detail?: string; message?: string };
      return payload.detail ?? payload.message ?? `Request failed: ${response.status}`;
    } catch {
      return `Request failed: ${response.status}`;
    }
  }

  try {
    const text = await response.text();
    return text.trim() || `Request failed: ${response.status}`;
  } catch {
    return `Request failed: ${response.status}`;
  }
}

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
    throw new HttpError(response.status, await readErrorMessage(response));
  }

  return (await response.json()) as T;
}
