import type { CreateTransactionPayload, ExpenseTypeStat, HeatmapPoint, Summary, Transaction } from "../types";

const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_BASE ?? "/api";
const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

export class ApiError extends Error {
  public status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function buildUrl(path: string, query?: Record<string, string | undefined>): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const isAbsoluteBase = /^https?:\/\//i.test(API_BASE);
  const url = isAbsoluteBase
    ? new URL(`${API_BASE}${normalizedPath}`)
    : new URL(`${API_BASE}${normalizedPath}`, window.location.origin);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
  }
  return url.toString();
}

async function request<T>(path: string, init?: RequestInit, query?: Record<string, string | undefined>): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path, query), {
    ...init,
    headers
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) {
        message = body.message;
      }
    } catch {
      // Ignore JSON parse errors and keep default message.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(
      "API returned non-JSON response. Check backend server and /api proxy configuration.",
      response.status
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError("Failed to parse API JSON response.", response.status);
  }
}

export const walletApi = {
  getSummary(month: string): Promise<Summary> {
    return request<Summary>("/summary", undefined, { month });
  },

  getTopExpenseTypes(month: string): Promise<ExpenseTypeStat[]> {
    return request<ExpenseTypeStat[]>("/expenses/top", undefined, { month });
  },

  getHeatmapSnapshot(month: string): Promise<HeatmapPoint[]> {
    return request<HeatmapPoint[]>("/heatmap", undefined, { month });
  },

  getTransactions(month: string): Promise<Transaction[]> {
    return request<Transaction[]>("/transactions", undefined, { month });
  },

  createTransaction(payload: CreateTransactionPayload): Promise<Transaction> {
    return request<Transaction>("/transactions", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  deleteTransaction(id: string): Promise<void> {
    return request<void>(`/transactions/${id}`, {
      method: "DELETE"
    });
  }
};
