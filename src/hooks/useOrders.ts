// src/hooks/useOrders.ts
// Órdenes: lista desde Supabase (Order[]), submit/cancel via alpaca-proxy Edge Function.
// Nunca llama a Alpaca directamente desde el cliente.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Order, OrderPayload } from "@/types";

// ─── Constantes ──────────────────────────────────────────────────────────────

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alpaca-proxy`;
const STALE_TIME = 15_000;

// ─── Headers con JWT del usuario para Edge Functions ─────────────────────────

async function buildHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const userToken = data.session?.access_token ?? "";
  return {
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    "x-user-token": userToken,
    "Content-Type": "application/json",
  };
}

// ─── Fetcher: historial desde Supabase (Order[]) ──────────────────────────────

async function fetchOrders(
  status: "all" | "open" | "closed" = "all",
): Promise<Order[]> {
  let query = supabase
    .from("orders")
    .select("*")
    .order("submitted_at", { ascending: false })
    .limit(100);

  if (status === "open") {
    query = query.in("status", ["pending", "accepted", "partially_filled"]);
  } else if (status === "closed") {
    query = query.in("status", ["filled", "cancelled", "rejected"]);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Order[];
}

// ─── Mutación: enviar orden via proxy ────────────────────────────────────────

async function submitOrderToProxy(
  payload: OrderPayload,
): Promise<{ order: Order }> {
  const headers = await buildHeaders();
  const res = await fetch(`${PROXY_URL}/orders`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      (data as { error?: string; message?: string }).error ??
        (data as { error?: string; message?: string }).message ??
        `HTTP ${res.status}`,
    );
  }
  return data as { order: Order };
}

// ─── Mutación: cancelar orden via proxy ──────────────────────────────────────

async function cancelOrderByBrokerOrderId(brokerOrderId: string): Promise<void> {
  const headers = await buildHeaders();
  const res = await fetch(`${PROXY_URL}/orders/${brokerOrderId}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ message: "Error desconocido" }));
    throw new Error(
      (error as { message?: string }).message ?? `HTTP ${res.status}`,
    );
  }
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useOrders(status: "all" | "open" | "closed" = "all") {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ["orders", status],
    queryFn: () => fetchOrders(status),
    staleTime: STALE_TIME,
    refetchInterval: status === "open" ? 5_000 : false,
  });

  const submitMutation = useMutation({
    mutationFn: submitOrderToProxy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelOrderByBrokerOrderId,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  return {
    orders: ordersQuery.data ?? [],
    isLoading: ordersQuery.isLoading,
    isError: ordersQuery.isError,
    error: ordersQuery.error,

    submitOrder: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    submitError: submitMutation.error,

    cancelOrder: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,

    refetch: ordersQuery.refetch,
  };
}
