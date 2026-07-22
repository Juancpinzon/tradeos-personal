import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useScreenerStore } from "../stores/screenerStore";
import type {
  ScreenerCriteria,
  ScreenerPreset,
  ScreenerResult,
} from "../types";
import { useAuth } from "./useAuth";

export function useScreener() {
  const { user } = useAuth();
  const store = useScreenerStore();
  const [presets, setPresets] = useState<ScreenerPreset[]>([]);
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);

  useEffect(() => {
    if (user) void getPresets();
  }, [user?.id]);

  const getPresets = async () => {
    if (!user) return [];
    setIsLoadingPresets(true);
    try {
      const { data, error } = await supabase
        .from("screener_presets")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setPresets(data || []);
      return data || [];
    } catch (err) {
      console.error("Error fetching presets:", err);
      return [];
    } finally {
      setIsLoadingPresets(false);
    }
  };

  const savePreset = async (name: string, criteria: ScreenerCriteria) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from("screener_presets")
        .insert({
          user_id: user.id,
          name,
          criteria,
        })
        .select()
        .single();

      if (error) throw error;
      await getPresets();
      store.setPresetId(data.id);
      return data;
    } catch (err) {
      console.error("Error saving preset:", err);
      return null;
    }
  };

  const loadPreset = (preset: ScreenerPreset) => {
    store.setCriteria(preset.criteria);
    store.setPresetId(preset.id);
  };

  const runScreener = async (criteria: ScreenerCriteria) => {
    if (!user) return;

    store.setIsRunning(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claude-screener`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ criteria }),
        },
      );

      if (!response.ok) {
        // Ningún fallo del screener puede ser silencioso: siempre un toast.
        let title = "Error del Screener";
        let message = "El screener falló. Intentá de nuevo en unos segundos.";
        try {
          const body = await response.json();
          if (body?.error === "universe_not_synced") {
            title = "Error de Sincronización";
            message =
              "El universo del buscador no se encuentra sincronizado. Por favor, corre la sincronización.";
          } else if (body?.error) {
            message = body.error;
          }
        } catch (e) {
          console.error("Failed to parse error response:", e);
        }
        window.dispatchEvent(
          new CustomEvent("tradeos-toast", {
            detail: { title, message, color: "var(--color-loss)" },
          })
        );
        throw new Error("Screener execution failed");
      }

      const result: ScreenerResult = await response.json();
      store.setLastResult(result);
      return result;
    } catch (err) {
      console.error("Error running screener:", err);
      return null;
    } finally {
      store.setIsRunning(false);
    }
  };

  return {
    presets,
    isLoadingPresets,
    getPresets,
    savePreset,
    loadPreset,
    runScreener,
    ...store,
  };
}
