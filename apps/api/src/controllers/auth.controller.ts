import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma, Role, AccountType } from '@keeper/database';
import { loginSchema, registerSchema } from '@keeper/shared';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'keeper_jwt_secret_dev_key_2026_xyz';

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { tenant: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Invalid credentials or inactive account' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      },
      tenant: user.tenant
        ? {
            id: user.tenant.id,
            name: user.tenant.name,
            slug: user.tenant.slug,
            currency: user.tenant.currency,
            logoUrl: user.tenant.logoUrl,
            createdAt: user.tenant.createdAt.toISOString(),
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      res.status(400).json({ message: 'User with this email already exists' });
      return;
    }

    const baseSlug = input.communityName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    const hashedPassword = await bcrypt.hash(input.password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: input.communityName,
          slug,
          currency: input.currency || 'RWF',
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: input.email.toLowerCase(),
          passwordHash: hashedPassword,
          fullName: input.fullName,
          phone: input.phone,
          role: Role.ADMIN,
        },
      });

      // Default General Account
      await tx.account.create({
        data: {
          tenantId: tenant.id,
          name: 'Main General Fund',
          type: AccountType.GENERAL_DUES,
          isDefault: true,
          balance: 0,
        },
      });

      return { tenant, user };
    });

    const token = jwt.sign(
      {
        id: result.user.id,
        tenantId: result.tenant.id,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      user: {
        id: result.user.id,
        tenantId: result.tenant.id,
        email: result.user.email,
        fullName: result.user.fullName,
        phone: result.user.phone,
        role: result.user.role,
        isActive: result.user.isActive,
        createdAt: result.user.createdAt.toISOString(),
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        currency: result.tenant.currency,
        logoUrl: result.tenant.logoUrl,
        createdAt: result.tenant.createdAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const me = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { tenant: true },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      },
      tenant: user.tenant
        ? {
            id: user.tenant.id,
            name: user.tenant.name,
            slug: user.tenant.slug,
            currency: user.tenant.currency,
            logoUrl: user.tenant.logoUrl,
            createdAt: user.tenant.createdAt.toISOString(),
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
};
