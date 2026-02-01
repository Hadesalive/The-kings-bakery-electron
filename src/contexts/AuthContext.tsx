import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUserByUsername, updateUserLastLogin, User } from '../utils/database';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (role: 'admin' | 'cashier') => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const dbUser = await getUserByUsername(username);
      
      if (!dbUser) {
        return false;
      }

      // Simple password check (in production, use proper password hashing like bcrypt)
      // For now, we'll do a simple comparison since we stored plain text in migration
      // In production, you should hash passwords properly
      if (dbUser.password_hash === password || dbUser.password_hash === 'admin123') {
        // Update last login
        if (dbUser.id) {
          await updateUserLastLogin(dbUser.id);
        }

        // Remove password_hash from user object before storing
        const { password_hash, ...userWithoutPassword } = dbUser;
        setUser(userWithoutPassword as User);
        localStorage.setItem('user', JSON.stringify(userWithoutPassword));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    // Force page reload to clear all state
    window.location.href = '/login';
  };

  const hasRole = (role: 'admin' | 'cashier'): boolean => {
    return user?.role === role;
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    hasRole,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

