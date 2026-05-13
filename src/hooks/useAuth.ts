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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        setSession(null);
        setUser(null);
      } else {
        supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session);
          setUser(user);
        });
      }
      setIsLoading(false);
    });

    // Suscribirse a cambios de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, isLoading, signOut };
}
