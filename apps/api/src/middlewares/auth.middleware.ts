import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@keeper/shared';

export interface AuthenticatedUser {
  id: string;
  tenantId?: string | null;
  email: string;
  fullName: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authorization token required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'keeper_jwt_secret_dev_key_2026_xyz';

  try {
    const decoded = jwt.verify(token, secret) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const requireAuth = authenticate;

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // SUPER_ADMIN has access to everything
    if (req.user.role === Role.SUPER_ADMIN || allowedRoles.includes(req.user.role)) {
      next();
      return;
    }

    res.status(403).json({
      message: `Forbidden: requires one of the following roles: ${allowedRoles.join(', ')}`,
    });
  };
};

export const getActiveTenantId = (req: AuthenticatedRequest): string => {
  if (req.user?.tenantId) return req.user.tenantId;
  const queryTenant = req.query.tenantId as string;
  const headerTenant = req.headers['x-tenant-id'] as string;
  return queryTenant || headerTenant || '';
};
