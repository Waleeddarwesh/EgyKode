"use client";

/**
 * Client-side auth against the Django API.
 *
 * MASTER_PROMPT §9.6 specifies a BFF hop. That exists to keep the session
 * cookie away from the browser's cross-origin rules — but egykode.com and
 * api.egykode.com are the same registrable domain, so a cookie scoped to
 * `.egykode.com` with SameSite=Lax already works, and the extra hop would add
 * latency and a serverless function for nothing. Revisit if the API ever moves
 * to a different registrable domain, where the BFF becomes necessary again.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface Me {
  email: string;
  handle: string;
  name: string;
  name_ar: string;
  avatar: string | null;
  headline: string;
  bio: string;
  location: string;
  github: string;
  linkedin: string;
  website: string;
  x_handle: string;
  social_links: Record<string, string>;
  locale: "en" | "ar";
  theme_pref: "system" | "light" | "dark";
  xp: number;
  reputation: number;
  is_verified: boolean;
}

export class ApiError extends Error {
  /** Field-keyed messages from DRF, for inline form errors. */
  readonly fields: Record<string, string[]>;
  readonly status: number;

  constructor(status: number, body: unknown) {
    const record = (body ?? {}) as Record<string, unknown>;
    const detail = typeof record.detail === "string" ? record.detail : "Something went wrong.";
    super(detail);
    this.status = status;
    this.fields = Object.fromEntries(
      Object.entries(record)
        .filter(([key]) => key !== "detail")
        .map(([key, value]) => [key, Array.isArray(value) ? value.map(String) : [String(value)]]),
    );
  }
}

function readCookie(name: string): string {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isWrite = init.method && init.method !== "GET";
  const body = init.body;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const response = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(isWrite ? { "X-CSRFToken": readCookie("csrftoken") } : {}),
      ...init.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, payload);
  return payload as T;
}

export const auth = {
  register: (data: {
    email: string;
    handle: string;
    name: string;
    password: string;
    locale: string;
  }) => request<Me>("/api/v1/auth/register", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<Me>("/api/v1/auth/login", { method: "POST", body: JSON.stringify(data) }),

  logout: () => request<void>("/api/v1/auth/logout", { method: "POST" }),

  me: () => request<Me>("/api/v1/me"),

  /** FormData so the avatar uploads in the same request as the rest. */
  updateProfile: (data: FormData) =>
    request<Me>("/api/v1/me", { method: "PATCH", body: data }),
};
