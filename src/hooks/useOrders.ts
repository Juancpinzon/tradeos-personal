// src/hooks/useOrders.ts
// Órdenes: lista desde Supabase (Order[]), submit/cancel via alpaca-proxy Edge Function.
// Nunca llama a Alpaca directamente desde el cliente.

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Order, OrderPayload } from "@/types";

// ─── Constantes ──────────────────────────────────────────────────────────────

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alpaca-proxy`;

const NON_TERMINAL = ["pending", "accepted", "partially_filled"] as const;
type NonTerminal = (typeof NON_TERMINAL)[number];

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

// ─── Sync: llama al proxy por cada orden no-terminal para actualizar la DB ───
// GET /orders/:id en el proxy ya sincroniza status + fill data a la DB.

async function syncNonTerminalOrders(): Promise<void> {
  const { data: openOrders } = await supabase
    .from("orders")
    .select("broker_order_id")
    .in("status", [...NON_TERMINAL]);

  if (!openOrders || openOrders.length === 0) return;

  const headers = await buildHeaders();
  await Promise.all(
    openOrders
      .filter(o => o.broker_order_id)
      .map(o =>
        fetch(`${PROXY_URL}/orders/${o.broker_order_id as string}`, { headers })
          .catch(() => null),
      ),
  );
}

// ─── Fetcher: sincroniza con Alpaca, luego lee DB actualizada ─────────────────

async function fetchOrders(
  status: "all" | "open" | "closed" = "all",
): Promise<Order[]> {
  await syncNonTerminalOrders();

  let query = supabase
    .from("orders")
    .select("*")
    .order("submitted_at", { ascending: false })
    .limit(500);

  if (status === "open") {
    query = query.in("status", [...NON_TERMINAL]);
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
  const prevStatusesRef = useRef<Map<string, Order["status"]>>(new Map());

  const ordersQuery = useQuery({
    queryKey: ["orders", status],
    queryFn: () => fetchOrders(status),
    staleTime: 0,
    refetchOnMount: true,
    // Poll every 3s while non-terminal orders exist; stop otherwise.
    refetchInterval: (query) => {
      const data = (query.state.data ?? []) as Order[];
      const hasOpen = data.some(o =>
        (NON_TERMINAL as readonly string[]).includes(o.status),
      );
      return hasOpen ? 3_000 : false;
    },
  });

  // Invalidate portfolio when any order transitions to filled.
  useEffect(() => {
    const current = ordersQuery.data ?? [];
    let newlyFilled = false;

    for (const o of current) {
      const prev = prevStatusesRef.current.get(o.id);
      if (prev !== undefined && prev !== "filled" && o.status === "filled") {
        newlyFilled = true;
        break;
      }
    }

    prevStatusesRef.current = new Map(current.map(o => [o.id, o.status]));

    if (newlyFilled) {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    }
  }, [ordersQuery.data, queryClient]);

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

// Re-export the NonTerminal type so OrderHistory can use it.
export type { NonTerminal };
