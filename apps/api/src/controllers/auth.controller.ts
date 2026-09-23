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

export const sendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      res.status(400).json({ message: 'Valid email address is required' });
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await prisma.emailVerification.create({
      data: {
        email: email.toLowerCase(),
        code,
        expiresAt,
      },
    });

    const { sendOtpEmail } = await import('../services/email.service.js');
    await sendOtpEmail({ to: email.toLowerCase(), code });

    res.json({ message: 'Verification OTP sent to your email' });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      res.status(400).json({ message: 'Email and 6-digit OTP code are required' });
      return;
    }

    const record = await prisma.emailVerification.findFirst({
      where: {
        email: email.toLowerCase(),
        code: code.trim(),
        expiresAt: { gt: new Date() },
        verifiedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      res.status(400).json({ message: 'Invalid or expired OTP code' });
      return;
    }

    await prisma.emailVerification.update({
      where: { id: record.id },
      data: { verifiedAt: new Date() },
    });

    await prisma.user.updateMany({
      where: { email: email.toLowerCase() },
      data: { isEmailVerified: true },
    });

    res.json({ message: 'Email verified successfully', verified: true });
  } catch (error) {
    next(error);
  }
};
