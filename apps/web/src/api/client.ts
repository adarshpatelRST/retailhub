import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  correlationId: string;
  timestamp: string;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  path: string;
  method: string;
  correlationId: string;
  timestamp: string;
}

const STORAGE_TOKEN_KEY = "retailhub_jwt_token";

export function generateCorrelationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `rh-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_TOKEN_KEY)
        : null;

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

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorEnvelope>) => {
    const correlationId =
      error.response?.data?.correlationId ||
      (error.config?.headers?.["X-Correlation-Id"] as string | undefined) ||
      "unknown";

    if (error.response?.status === 401 && typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_TOKEN_KEY);
      window.dispatchEvent(new CustomEvent("retailhub:unauthorized"));
    }

    const enrichedError = Object.assign(
      new Error(
        error.response?.data?.error?.message ||
          error.message ||
          "An unexpected network error occurred.",
      ),
      {
        code: error.response?.data?.error?.code || "NETWORK_ERROR",
        statusCode: error.response?.status || 500,
        correlationId,
        details: error.response?.data?.error?.details,
      },
    );

    return Promise.reject(enrichedError);
  },
);
