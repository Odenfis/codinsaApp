/**
 * @license
 * Tool Kit Enterprise JWT & Route Protection Middleware
 */

import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    usuario: string;
    // We keep these optional or mock them to avoid breaking existing types in the app
    id_usuario?: number;
    nombres?: string;
    apellidos?: string;
    email?: string;
    id_rol?: number;
    rol?: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.session && req.session.user) {
    req.user = req.session.user;
    next();
  } else {
    return res.status(401).json({ error: 'Acceso no autorizado. Sesión no válida o expirada.' });
  }
}
