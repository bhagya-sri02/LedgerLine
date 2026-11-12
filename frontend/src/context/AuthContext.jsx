import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('ledgerline_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('ledgerline_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('ledgerline_token');
      if (savedToken) {
        try {
          const profile = await authApi.getMe();
          setUser(profile);
          localStorage.setItem('ledgerline_user', JSON.stringify(profile));
        } catch (err) {
          console.warn('Failed to restore user session:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username, password) => {
    const authData = await authApi.login({ username, password });
    const userProfile = {
      id: authData.userId,
      username: authData.username,
      email: authData.email,
      roles: authData.roles,
    };

    localStorage.setItem('ledgerline_token', authData.token);
    localStorage.setItem('ledgerline_user', JSON.stringify(userProfile));
    setToken(authData.token);
    setUser(userProfile);
    return userProfile;
  };

  const logout = () => {
    localStorage.removeItem('ledgerline_token');
    localStorage.removeItem('ledgerline_user');
    setToken(null);
    setUser(null);
  };

  const roles = user?.roles || [];
  const isAdmin = roles.includes('ROLE_ADMIN');
  const isAuditor = roles.includes('ROLE_AUDITOR');
  const isAccountHolder = roles.includes('ROLE_ACCOUNT_HOLDER');

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        isAdmin,
        isAuditor,
        isAccountHolder,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
