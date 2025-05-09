import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// API request per URL e opzioni
export async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Per richieste come DELETE che potrebbero non restituire dati
  if (res.status === 204) {
    return {} as T;
  }
  
  return res.json();
}

// Helper methods per rendere più facile l'uso con metodi HTTP specifici
export const api = {
  get: <T>(url: string): Promise<T> => {
    return apiRequest<T>(url, { method: "GET" });
  },
  post: <T>(url: string, data: any): Promise<T> => {
    return apiRequest<T>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
  put: <T>(url: string, data: any): Promise<T> => {
    return apiRequest<T>(url, {
      method: "PUT", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
  delete: <T>(url: string): Promise<T> => {
    return apiRequest<T>(url, { method: "DELETE" });
  },
};

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,      // Ricarica i dati quando la finestra torna in focus
      staleTime: 1000 * 60 * 5,        // Considera i dati "freschi" per 5 minuti
      gcTime: 1000 * 60 * 30,          // Mantieni i dati in cache per 30 minuti (in v5 gcTime sostituisce cacheTime)
      retry: 2,                        // Riprova le richieste fallite fino a 2 volte
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),  // Backoff esponenziale
    },
    mutations: {
      retry: 1,                        // Riprova le mutazioni fallite una volta
      retryDelay: 1000,                // Aspetta 1 secondo prima di riprovare
    },
  },
});
