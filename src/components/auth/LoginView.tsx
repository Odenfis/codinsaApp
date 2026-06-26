/**
 * @license
 * Tool Kit Enterprise Login View
 * Replica fiel de diseño adjunto (CODINSA S.A.C. Droguería / Tool Kit Platform)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, User, CheckSquare, AlertCircle, Eye, EyeOff, ChevronDown } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [shakePassword, setShakePassword] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/auth/users');
        const data = await response.json();
        if (data.users) {
          setUsers(data.users);
        }
      } catch (err) {
        console.error('Error fetching users for login combobox:', err);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredUsers = users.filter(u => u.toLowerCase().includes(username.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setUsernameError('');
    setPasswordError('');
    setShakePassword(false);

    if (!username.trim() || !password.trim()) {
      if (!username.trim()) setUsernameError('Ingrese su usuario');
      if (!password.trim()) setPasswordError('Ingrese su contraseña');
      setErrorMsg('Por favor complete todos los campos.');
      return;
    }
    try {
      setIsSubmitting(true);
      await login(username, password);
    } catch (err: any) {
      console.log('[LOGIN ERROR]', err);
      const msg = err?.message || 'Usuario o contraseña incorrectos.';
      setErrorMsg(msg);
      // Detección local: si el usuario existe en la lista cargada → contraseña incorrecta
      const userExists = users.some(u => u.toLowerCase() === username.toLowerCase());
      const specificMsg = userExists ? 'Contraseña incorrecta' : 'Usuario no encontrado';
      setPasswordError(specificMsg);
      setShakePassword(true);
      setTimeout(() => setShakePassword(false), 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background min-h-screen w-full flex items-center justify-center relative overflow-hidden font-sans text-on-surface select-none">
      {/* Anillos decorativos concéntricos exactos al diseño */}
      <div className="absolute -top-[15%] -left-[10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] border-[40px] border-secondary/10 rounded-full z-0 pointer-events-none"></div>
      <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] border-[60px] border-primary/5 rounded-full z-0 pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-[420px] px-4 md:px-0 animate-fade-in">
        <div className="bg-surface-container-lowest rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-surface-variant p-8 md:p-10 flex flex-col items-center">

          <div className="mb-6 flex flex-col items-center text-center">
            {/* Logo de CODINSA S.A.C. Droguería simulado estilizado como en la captura */}
            <div className="flex items-center gap-1.5 mb-4">
              <div className="w-9 h-9 rounded-full border-4 border-outline-variant flex items-center justify-center font-bold text-outline text-xl relative">
                d
                <div className="absolute -right-1 top-0 w-1.5 h-full bg-secondary rounded-r"></div>
              </div>
              <div className="text-left leading-tight">
                <span className="font-headline font-black tracking-wider text-outline text-lg block">CODINSA</span>
                <span className="text-[8px] uppercase tracking-widest text-outline block">D R O G U E R Í A</span>
              </div>
            </div>

            <h1 className="font-headline text-3xl font-semibold text-primary tracking-tight">Tool Kit</h1>
            <p className="text-sm text-on-surface-variant mt-2 max-w-[280px]">
              Plataforma de módulos administrativos empresariales
            </p>
          </div>

          {errorMsg && (
            <div className="w-full mb-4 p-3 bg-error-container text-on-error-container rounded-lg text-xs font-semibold flex items-center gap-2 border border-error/20">
              <AlertCircle size={16} className="shrink-0 text-error" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="username" className="text-xs font-semibold text-on-surface tracking-wide">
                Usuario
              </label>
              <div className="relative" ref={dropdownRef}>
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant shrink-0" size={18} />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setIsDropdownOpen(true);
                    setUsernameError('');
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="Ingrese su usuario"
                  className={`w-full bg-surface rounded-lg pl-10 pr-10 py-2.5 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${
                    usernameError ? 'border-error focus:border-error focus:ring-error' : 'border-outline-variant'
                  }`}
                  autoComplete="off"
                  aria-invalid={usernameError ? 'true' : 'false'}
                  aria-describedby={usernameError ? 'username-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                >
                  <ChevronDown size={18} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <ul className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-surface border border-surface-variant rounded-lg shadow-lg py-1 animate-fade-in">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map(u => (
                        <li
                          key={u}
                          onClick={() => {
                            setUsername(u);
                            setIsDropdownOpen(false);
                          }}
                          className="px-4 py-2 text-sm text-on-surface hover:bg-primary-container hover:text-on-primary-container cursor-pointer transition-colors"
                        >
                          {u}
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-2 text-sm text-on-surface-variant cursor-default">
                        No se encontraron usuarios
                      </li>
                    )}
                  </ul>
                )}
              </div>
              {usernameError && (
                <p id="username-error" className="text-xs text-error mt-1" role="alert">{usernameError}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-xs font-semibold text-on-surface tracking-wide">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant shrink-0" size={18} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="Ingrese su contraseña"
                  className={`w-full bg-surface rounded-lg pl-10 pr-10 py-2.5 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${
                    passwordError ? 'border-error focus:border-error focus:ring-error' : 'border-outline-variant'
                  } ${shakePassword ? 'animate-shake' : ''}`}
                  autoComplete="current-password"
                  aria-invalid={passwordError ? 'true' : 'false'}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordError && (
                <p id="password-error" className="text-xs text-error mt-1" role="alert">{passwordError}</p>
              )}
            </div>

            <div className="flex items-center justify-between mt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-0 bg-surface w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-on-surface-variant">Recordarme</span>
              </label>
              <button
                type="button"
                onClick={() => alert('Contacte con el Administrador del Sistema Enterprise (Soporte CODINSA).')}
                className="text-xs font-semibold text-primary hover:text-surface-tint transition-colors"
              >
                ¿Olvidó su contraseña?
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 bg-primary text-on-primary text-sm font-semibold py-3 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1)] hover:bg-primary-container hover:text-on-primary transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Verificando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-6 w-full pt-4 border-t border-surface-variant text-center">
            <p className="text-[11px] text-outline">
              💡 ToolKit operado por Odenfis: <br />
              <strong className="text-on-surface-variant">sedimcorp</strong> (Dev Area)
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-outline">
            © 2024 Sedimcorp Enterprise Admin. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};
