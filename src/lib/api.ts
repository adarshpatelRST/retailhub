import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { ApiResponseEnvelope, ApiErrorEnvelope } from "../../shared/schema";
import { mockAxiosAdapter } from "../mock/mockApiAdapter";
import { initializeDemoDb } from "../mock/mockDatabase";

const STORAGE_TOKEN_KEY = "retailhub_jwt_token";

// Auto-initialize browser demo mock database
initializeDemoDb();

export function generateCorrelationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `rh-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const env = (typeof import.meta !== "undefined" && (import.meta as any).env) || {};

export const api = axios.create({
  baseURL: env.VITE_API_BASE_URL || "/api/v1",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
  // Use client-side mock adapter by default for offline/demo operation unless explicitly disabled
  adapter: env.VITE_USE_REAL_BACKEND === "true" ? undefined : mockAxiosAdapter,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_TOKEN_KEY) : null;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.headers && !config.headers["X-Correlation-Id"]) {
      config.headers["X-Correlation-Id"] = generateCorrelationId();
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorEnvelope>) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_TOKEN_KEY);
      window.dispatchEvent(new CustomEvent("retailhub:unauthorized"));
    }

    const message =
      error.response?.data?.error?.message ||
      error.message ||
      "An unexpected network error occurred.";

    const enrichedError = Object.assign(new Error(message), {
      code: error.response?.data?.error?.code || "NETWORK_ERROR",
      statusCode: error.response?.status || 500,
      details: error.response?.data?.error?.details,
    });

    return Promise.reject(enrichedError);
  },
);

export default api;
