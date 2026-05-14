// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useAuth.ts — Hook de autenticación con Supabase
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  // Intentar leer la sesión cacheada del localStorage de Supabase inmediatamente
  // para que isLoading sea false en el primer render si ya estaba logueado.
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // isLoading solo true mientras NO tenemos certeza de si hay sesión
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Leer sesión local (instantáneo — no hace red si ya está cacheada)
    supabase.auth.getSession().then(({ data: { session: cachedSession } }) => {
      if (cachedSession) {
        setSession(cachedSession);
        setUser(cachedSession.user);
      }
      // Marcar como "no cargando" tan pronto tengamos resultado local
      setIsLoading(false);

      // 2. Verificar en background que el token sigue válido (no bloquea UI)
      if (cachedSession) {
        supabase.auth.getUser().then(({ data: { user: verifiedUser }, error }) => {
          if (error || !verifiedUser) {
            // Token expirado — limpiar estado
            setSession(null);
            setUser(null);
          } else {
            setUser(verifiedUser);
          }
        })
      }
    });

    // 3. Suscribirse a cambios de auth (login, logout, refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, isLoading, signOut };
}
