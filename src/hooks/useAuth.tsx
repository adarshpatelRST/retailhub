import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../lib/api";
import { AuthUserProfile, UserRole } from "../../shared/schema";

export type { UserRole };

export interface AuthContextValue {
  user: AuthUserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUserProfile) => void;
  loginWithCredentials: (email: string, password: string) => Promise<AuthUserProfile>;
  logout: () => void;
  switchDemoPersona: (role: UserRole) => void;
  hasRole: (...allowedRoles: (UserRole | UserRole[])[]) => boolean;
}

const STORAGE_TOKEN_KEY = "retailhub_jwt_token";
const STORAGE_USER_KEY = "retailhub_user_profile";

export const DEMO_PERSONAS: Record<UserRole, AuthUserProfile> = {
  EXECUTIVE: {
    id: "usr-exec-hq",
    email: "executive@retailhub.com",
    fullName: "Vikram Aditya",
    role: "EXECUTIVE",
    mobileNumber: "9820778899",
    assignedRegionIds: [],
    assignedStoreIds: [],
  },
  REGIONAL_MANAGER: {
    id: "usr-rm-west",
    email: "regional.central@retailhub.com",
    fullName: "Priya Nair",
    role: "REGIONAL_MANAGER",
    mobileNumber: "9820445566",
    assignedRegionIds: ["reg-central-mp"],
    assignedStoreIds: [],
  },
  STORE_MANAGER: {
    id: "usr-sm-bhopal",
    email: "store.bhopal@retailhub.com",
    fullName: "Rajesh Sharma",
    role: "STORE_MANAGER",
    mobileNumber: "9820112233",
    assignedRegionIds: ["reg-central-mp"],
    assignedStoreIds: ["store-bpl-001"],
  },
  ADMIN: {
    id: "usr-admin-ops",
    email: "admin@retailhub.com",
    fullName: "Ananya Deshmukh",
    role: "ADMIN",
    mobileNumber: "9820990011",
    assignedRegionIds: [],
    assignedStoreIds: [],
  },
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_TOKEN_KEY);
  });

  const [user, setUser] = useState<AuthUserProfile | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(STORAGE_USER_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  });

  const login = useCallback((nextToken: string, nextUser: AuthUserProfile) => {
    setToken(nextToken);
    setUser(nextUser);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_TOKEN_KEY, nextToken);
      window.localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(nextUser));
    }
  }, []);

  const loginWithCredentials = useCallback(
    async (email: string, password: string): Promise<AuthUserProfile> => {
      try {
        const res = await api.post("/auth/login", { email, password });
        const { accessToken, user: loggedUser } = res.data.data;
        login(accessToken, loggedUser);
        return loggedUser;
      } catch (err: any) {
        // If server responded with an authentication error, reject immediately
        if (
          err.statusCode === 401 ||
          err.statusCode === 400 ||
          err.statusCode === 403 ||
          err.response?.status === 401 ||
          err.code === "UNAUTHORIZED"
        ) {
          throw err;
        }

        // Offline dev fallback only if server is completely offline/unreachable
        const normalized = email.trim().toLowerCase();
        const matched = Object.values(DEMO_PERSONAS).find(
          (p) => p.email.toLowerCase() === normalized,
        );
        if (matched && password === "RetailHub@2026") {
          const fakeToken = `demo-jwt-${matched.role.toLowerCase()}`;
          login(fakeToken, matched);
          return matched;
        }
        throw err;
      }
    },
    [login],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_TOKEN_KEY);
      window.localStorage.removeItem(STORAGE_USER_KEY);
    }
  }, []);

  const switchDemoPersona = useCallback(
    (role: UserRole) => {
      const persona = DEMO_PERSONAS[role];
      if (persona) {
        login(`demo-jwt-${role.toLowerCase()}`, persona);
      }
    },
    [login],
  );

  const hasRole = useCallback(
    (...allowedRoles: (UserRole | UserRole[])[]): boolean => {
      if (!user) return false;
      const flatRoles = allowedRoles.flat();
      return flatRoles.includes(user.role);
    },
    [user],
  );

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener("retailhub:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("retailhub:unauthorized", handleUnauthorized);
    };
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      login,
      loginWithCredentials,
      logout,
      switchDemoPersona,
      hasRole,
    }),
    [user, token, login, loginWithCredentials, logout, switchDemoPersona, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
