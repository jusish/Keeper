import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
import { UserDTO, TenantDTO, AuthResponse } from '@keeper/shared';

interface AuthContextType {
  user: UserDTO | null;
  tenant: TenantDTO | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [tenant, setTenant] = useState<TenantDTO | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('keeper_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
        setTenant(res.data.tenant);
      } catch (err) {
        localStorage.removeItem('keeper_token');
        setToken(null);
        setUser(null);
        setTenant(null);
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, [token]);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await api.post<AuthResponse>('/auth/login', credentials);
    const { token: newToken, user: newUser, tenant: newTenant } = res.data;
    localStorage.setItem('keeper_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setTenant(newTenant ?? null);
  };

  const register = async (payload: any) => {
    const res = await api.post<AuthResponse>('/auth/register', payload);
    const { token: newToken, user: newUser, tenant: newTenant } = res.data;
    localStorage.setItem('keeper_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setTenant(newTenant ?? null);
  };

  const logout = () => {
    localStorage.removeItem('keeper_token');
    setToken(null);
    setUser(null);
    setTenant(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        token,
        isLoading,
        login,
        register,
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
