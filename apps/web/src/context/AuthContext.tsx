import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authApi, AuthLoginResponse } from "@/modules/auth/api/auth.api";

export type UserRole =
  | "EXECUTIVE"
  | "REGIONAL_MANAGER"
  | "STORE_MANAGER"
  | "ADMIN";

export interface AuthUserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  mobileNumber?: string;
  avatarUrl?: string | null;
  assignedRegionIds: string[];
  assignedStoreIds: string[];
}

export interface AuthContextValue {
  user: AuthUserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUserProfile) => void;
  loginWithCredentials: (email: string, password: string) => Promise<AuthUserProfile>;
  logout: () => void;
  switchDemoPersona: (role: UserRole) => void;
  hasRole: (...allowedRoles: UserRole[]) => boolean;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_TOKEN_KEY);
  });

  const [user, setUser] = useState<AuthUserProfile | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(STORAGE_USER_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as AuthUserProfile;
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
        const response: AuthLoginResponse = await authApi.login({ email, password });
        login(response.accessToken, response.user);
        return response.user;
      } catch (err) {
        // Fallback for dev mode / demo personas if backend is starting or offline
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
      window.location.href = "/login";
    }
  }, []);

  const switchDemoPersona = useCallback(
    (role: UserRole) => {
      const nextUser = DEMO_PERSONAS[role];
      const nextToken = `demo-jwt-${role.toLowerCase()}`;
      login(nextToken, nextUser);
    },
    [login],
  );

  const hasRole = useCallback(
    (...allowedRoles: UserRole[]) => {
      if (!user) return false;
      if (allowedRoles.length === 0) return true;
      return allowedRoles.includes(user.role);
    },
    [user],
  );

  useEffect(() => {
    const handleUnauthorized = () => logout();
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
