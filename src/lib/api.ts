// Thin fetch wrapper around the VCMS API. Attaches the JWT from localStorage,
// unwraps the { success, data, meta } envelope, and throws ApiError on failure
// so React Query can surface it.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

const TOKEN_KEY = "vcms_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  // When set, body is sent as multipart FormData instead of JSON.
  form?: FormData;
  query?: Record<string, string | number | undefined>;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<{ data: T; meta?: unknown }> {
  const url = new URL(API_URL + path);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form; // browser sets multipart boundary automatically
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(url.toString(), { method: opts.method ?? "GET", headers, body });

  // 401 anywhere means the session is gone — clear it so the guard redirects.
  if (res.status === 401) {
    setToken(null);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    throw new ApiError(res.status, json?.message ?? "Request failed", json?.details);
  }
  return { data: json.data as T, meta: json.meta };
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"]) => request<T>(path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: "POST", form }),
  uploadPatch: <T>(path: string, form: FormData) => request<T>(path, { method: "PATCH", form }),
  // Download a binary (PDF) with auth header, returning a blob URL.
  async download(path: string): Promise<Blob> {
    const token = getToken();
    const res = await fetch(API_URL + path, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, "Download failed");
    return res.blob();
  },
};
