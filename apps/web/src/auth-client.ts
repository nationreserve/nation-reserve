export interface ApiFailure { error: { code: string; message: string; requestId: string } }
const configured: unknown = import.meta.env["VITE_API_BASE_URL"];
const base = typeof configured === "string" ? configured : "/api";
let accessToken: string | undefined;
let refreshPromise: Promise<boolean> | undefined;

export function setAccessToken(token?: string) { accessToken = token; }
async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const requestId = crypto.randomUUID();
  const response = await fetch(`${base}${path}`, {
    ...init, credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json",
      "X-Request-ID": requestId, ...init.headers,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
  });
  if (response.status === 401 && retry && path !== "/api/v1/auth/refresh") {
    refreshPromise ??= refresh().finally(() => { refreshPromise = undefined; });
    if (await refreshPromise) return request(path, init, false);
  }
  if (!response.ok) {
    const body = await response.json() as ApiFailure;
    throw Object.assign(new Error(body.error?.message ?? "Request failed"), { code: body.error?.code });
  }
  return response.status === 204 ? undefined as T : await response.json() as T;
}
async function refresh() {
  try {
    const result = await request<{ accessToken: string }>("/api/v1/auth/refresh", { method: "POST" }, false);
    accessToken = result.accessToken; return true;
  } catch { accessToken = undefined; return false; }
}
export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: object, headers?: HeadersInit) => request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}), ...(headers ? { headers } : {}) }),
  put: <T>(path: string, body: object) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: object) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: "DELETE" }),
  login: async (email: string, password: string) => {
    const result = await request<{ accessToken: string; emailVerified: boolean }>("/api/v1/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }, false);
    accessToken = result.accessToken; return result;
  },
  logout: async () => { try { await request("/api/v1/auth/logout", { method: "POST" }); } finally { accessToken = undefined; } },
};

