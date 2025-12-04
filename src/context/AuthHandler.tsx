// AuthHandler.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@inrupt/solid-client-authn-browser";

const AuthContext = createContext<any>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session] = useState(() => new Session());
  const [loggedIn, setLoggedIn] = useState(false);

  // Login
  const login = async (issuer: string) => {
    await session.login({
      oidcIssuer: issuer,
      redirectUrl: window.location.href,
      clientName: "Simple Solid App",
    });
  };

  // Logout
  const logout = async () => {
    await session.logout();
    setLoggedIn(false);
    window.location.reload();
  };

  // Handle redirect after login
  useEffect(() => {
    const run = async () => {
      await session.handleIncomingRedirect();
      if (session.info.isLoggedIn) {
        setLoggedIn(true);
      }
    };
    run();
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, login, logout, loggedIn }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
