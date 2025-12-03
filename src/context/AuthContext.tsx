import React, { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@inrupt/solid-client-authn-browser";

interface AuthContextType {
  session: Session;
  login: (oidcIssuer: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Create the Session only once
  const [session] = useState(() => new Session());
  const [isAuthenticated, setIsAuthenticated] = useState(false);

 const login = async (oidcIssuer: string) => {
  await session.login({
    oidcIssuer,
  redirectUrl: "http://localhost:3000/",
  clientName: "SoLiD Marketplace",
  });
};


  const logout = async () => {
    await session.logout();
    setIsAuthenticated(false);
    window.location.reload();
  };

  useEffect(() => {
  const init = async () => {
    // Only run handleIncomingRedirect if returning from login
    const url = new URL(window.location.href);
    const hasAuthCode = url.searchParams.get("code");
    const hasState = url.searchParams.get("state");
     await session.handleIncomingRedirect({
      restorePreviousSession: true
    });

    if (hasAuthCode && hasState) {
      await session.handleIncomingRedirect({ restorePreviousSession: false });
      if (session.info.isLoggedIn) {
        setIsAuthenticated(true);
      }
    } else {
      // Try to restore an existing session if one exists (but no redirect)
      if (session.info.isLoggedIn) { 
        setIsAuthenticated(true);
      }
    }
  };

  void init();
}, [session]);


  return (
    <AuthContext.Provider value={{ session, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
