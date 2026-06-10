import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  restoreSession,
  signIn as authSignIn,
  signInAnonymous as authSignInAnonymous,
  register as authRegister,
  signOut as authSignOut,
  type Session,
} from "../services/auth.service";

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInAnonymous: () => Promise<void>;
  register: (email: string, password: string, nombre: string, apellido: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession()
      .then((s) => setSession(s))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  async function signIn(email: string, password: string) {
    setSession(await authSignIn(email, password));
  }

  async function signInAnonymous() {
    setSession(await authSignInAnonymous());
  }

  async function register(email: string, password: string, nombre: string, apellido: string) {
    setSession(await authRegister(email, password, nombre, apellido));
  }

  async function signOut() {
    await authSignOut();
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signInAnonymous, register, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
