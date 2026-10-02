/**
 * Thin fetch wrapper for the backend. All calls go to the same-origin /api/*
 * path, which Next.js proxies to Express (see next.config.mjs), so the
 * httpOnly auth cookie is sent automatically.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    /** Field-level validation messages, keyed by field name */
    public readonly errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  /** Don't redirect to /login on 401 (used by the login form itself). */
  skipAuthRedirect?: boolean;
  signal?: AbortSignal;
}

/** Parses the JSON body and turns non-2xx responses into ApiError. */
async function handleResponse<T>(res: Response, skipAuthRedirect: boolean): Promise<T> {
  const data = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && !skipAuthRedirect && typeof window !== 'undefined') {
      // Session expired or revoked: the backend has already cleared the cookie.
      const next = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?next=${next}`;
    }
    throw new ApiError(data?.message ?? 'Something went wrong', res.status, data?.errors);
  }

  return data as T;
}

export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipAuthRedirect = false, signal } = options;

  const res = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
  });

  return handleResponse<T>(res, skipAuthRedirect);
}

/** Uploads one file as multipart/form-data (e.g. a product image). */
export async function apiUpload<T = unknown>(path: string, file: File, field = 'image'): Promise<T> {
  const form = new FormData();
  form.append(field, file);
  const res = await fetch(`/api${path}`, { method: 'POST', body: form, credentials: 'same-origin' });
  return handleResponse<T>(res, false);
}
