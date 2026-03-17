export interface SmmServiceData {
  service: number;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  refill: boolean;
  cancel: boolean;
}

export interface SmmBalanceData {
  balance: string;
  currency: string;
}

export interface FetchResult {
  success: boolean;
  services?: SmmServiceData[];
  error?: string;
  responseMs: number;
}

export async function fetchServices(
  apiUrl: string,
  apiKey: string,
  timeoutMs = 30000
): Promise<FetchResult> {
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ key: apiKey, action: "services" }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const responseMs = Date.now() - start;

    if (!res.ok) {
      return {
        success: false,
        error: `HTTP ${res.status}: ${res.statusText}`,
        responseMs,
      };
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      return {
        success: false,
        error: data?.error || "Unexpected response format",
        responseMs,
      };
    }

    return { success: true, services: data, responseMs };
  } catch (err) {
    const responseMs = Date.now() - start;
    const message =
      err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("abort") ? "timeout" : "error";
    return {
      success: false,
      error: `${status}: ${message}`,
      responseMs,
    };
  }
}

export async function fetchBalance(
  apiUrl: string,
  apiKey: string
): Promise<SmmBalanceData | null> {
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ key: apiKey, action: "balance" }),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function testConnection(
  apiUrl: string,
  apiKey: string
): Promise<{ success: boolean; serviceCount?: number; error?: string; responseMs: number }> {
  const result = await fetchServices(apiUrl, apiKey, 15000);

  if (result.success && result.services) {
    return {
      success: true,
      serviceCount: result.services.length,
      responseMs: result.responseMs,
    };
  }

  return {
    success: false,
    error: result.error,
    responseMs: result.responseMs,
  };
}
