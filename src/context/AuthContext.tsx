/**
 * @license
 * Tool Kit Enterprise Auth Context (JWT & Dynamic Sidebar State)
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Modulo, Usuario } from '../types';

interface AuthContextType {
  token: string | null;
  user: Usuario | null;
  menu: Modulo[];
  isLoading: boolean;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshMenu: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.PropsWithChildren }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('toolkit_jwt'));
  const [user, setUser] = useState<Usuario | null>(() => {
    const saved = localStorage.getItem('toolkit_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [menu, setMenu] = useState<Modulo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshMenu = async () => {
    try {
      const res = await fetch('/api/modules');
      if (res.ok) {
        const data = await res.json();
        setMenu(data.modules || []);
      } else if (res.status === 401) {
        logout();
      }
    } catch (err) {
      console.error('Error cargando menú dinámico:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshMenu();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const login = async (username: string, pass: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass })
    });

    if (!res.ok) {
      let errorMessage = 'Credenciales incorrectas';
      try {
        const errData = await res.json();
        errorMessage = errData.error || errorMessage;
      } catch {
        // Si no hay JSON válido, usar mensaje por defecto
      }
      throw new Error(errorMessage);
    }

    const data = await res.json();
    const userObj = {
      usuario: data.user.usuario,
      nombres: data.user.usuario,
      apellidos: '',
      id_usuario: 1,
      id_rol: 1,
      rol: 'Enterprise Admin',
      email: '',
      estado: true,
      fecha_creacion: new Date().toISOString()
    };

    localStorage.setItem('toolkit_jwt', 'session-active');
    localStorage.setItem('toolkit_user', JSON.stringify(userObj));
    setToken('session-active');
    setUser(userObj);
  };

  const logout = () => {
    localStorage.removeItem('toolkit_jwt');
    localStorage.removeItem('toolkit_user');
    setToken(null);
    setUser(null);
    setMenu([]);
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ token, user, menu, isLoading, login, logout, refreshMenu }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  return context;
};
