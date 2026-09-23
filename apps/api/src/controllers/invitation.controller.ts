import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma, Role } from '@keeper/database';
import { AuthenticatedRequest, getActiveTenantId } from '../middlewares/auth.middleware.js';
import { sendInvitationEmail } from '../services/email.service.js';
import { recordAuditLog } from '../services/audit.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'keeper_jwt_secret_dev_key_2026_xyz';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export const createInvitation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = getActiveTenantId(req);
    const { email, role } = req.body;

    if (!email || !email.includes('@')) {
      res.status(400).json({ message: 'Valid email address is required' });
      return;
    }

    const assignedRole = (role as Role) || Role.VIEWER;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      res.status(400).json({ message: 'A user with this email address is already registered on Keeper' });
      return;
    }

    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    // Upsert invitation for this email in this tenant
    const existingInvite = await prisma.invitation.findFirst({
      where: { tenantId, email: email.toLowerCase(), acceptedAt: null },
    });

    let invitation;
    if (existingInvite) {
      invitation = await prisma.invitation.update({
        where: { id: existingInvite.id },
        data: {
          token,
          role: assignedRole,
          expiresAt,
          invitedByUserId: req.user!.id,
        },
      });
    } else {
      invitation = await prisma.invitation.create({
        data: {
          tenantId,
          email: email.toLowerCase(),
          role: assignedRole,
          token,
          expiresAt,
          invitedByUserId: req.user!.id,
        },
      });
    }

    const inviteUrl = `${FRONTEND_URL}/accept-invite?token=${token}`;

    // Send email via nodemailer Gmail transport
    await sendInvitationEmail({
      to: email.toLowerCase(),
      inviteUrl,
      communityName: tenant.name,
      role: assignedRole,
      invitedBy: req.user!.fullName,
    });

    await recordAuditLog({
      tenantId,
      userId: req.user!.id,
      actorName: req.user!.fullName,
      action: 'USER_INVITED',
      entityType: 'Invitation',
      entityId: invitation.id,
      description: `${req.user!.fullName} invited ${email.toLowerCase()} to join "${tenant.name}" as ${assignedRole}.`,
    });

    res.status(201).json({
      message: `Invitation successfully sent to ${email}`,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getInvitations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = getActiveTenantId(req);

    const invitations = await prisma.invitation.findMany({
      where: {
        tenantId,
        acceptedAt: null,
      },
      include: {
        invitedByUser: {
          select: { fullName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        expiresAt: inv.expiresAt.toISOString(),
        isExpired: inv.expiresAt < new Date(),
        invitedBy: inv.invitedByUser?.fullName || 'System Admin',
        createdAt: inv.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    next(error);
  }
};

export const resendInvitation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = getActiveTenantId(req);
    const { id } = req.params;

    const invitation = await prisma.invitation.findFirst({
      where: { id: id as string, tenantId },
      include: { tenant: true },
    });

    if (!invitation) {
      res.status(404).json({ message: 'Invitation record not found' });
      return;
    }

    if (invitation.acceptedAt) {
      res.status(400).json({ message: 'This invitation has already been accepted' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 more hours

    const updated = await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        token,
        expiresAt,
        invitedByUserId: req.user!.id,
      },
    });

    const inviteUrl = `${FRONTEND_URL}/accept-invite?token=${token}`;

    await sendInvitationEmail({
      to: updated.email,
      inviteUrl,
      communityName: invitation.tenant.name,
      role: updated.role,
      invitedBy: req.user!.fullName,
    });

    await recordAuditLog({
      tenantId,
      userId: req.user!.id,
      actorName: req.user!.fullName,
      action: 'INVITATION_RESENT',
      entityType: 'Invitation',
      entityId: updated.id,
      description: `${req.user!.fullName} resent invitation email to ${updated.email}.`,
    });

    res.json({ message: `Invitation resent to ${updated.email}` });
  } catch (error) {
    next(error);
  }
};

export const validateInvitationToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.query.token as string;

    if (!token) {
      res.status(400).json({ message: 'Token query parameter is required' });
      return;
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { tenant: true },
    });

    if (!invitation) {
      res.status(404).json({ message: 'Invalid or unknown invitation link' });
      return;
    }

    if (invitation.acceptedAt) {
      res.status(400).json({ message: 'This invitation has already been accepted' });
      return;
    }

    if (invitation.expiresAt < new Date()) {
      res.status(410).json({ message: 'This invitation link has expired. Please request a new invite.' });
      return;
    }

    res.json({
      valid: true,
      email: invitation.email,
      role: invitation.role,
      communityName: invitation.tenant.name,
      currency: invitation.tenant.currency,
    });
  } catch (error) {
    next(error);
  }
};

export const acceptInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, fullName, password } = req.body;

    if (!token || !fullName || !password || password.length < 6) {
      res.status(400).json({ message: 'Full name, password (min 6 characters), and token are required' });
      return;
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { tenant: true },
    });

    if (!invitation) {
      res.status(404).json({ message: 'Invalid invitation token' });
      return;
    }

    if (invitation.acceptedAt) {
      res.status(400).json({ message: 'Invitation has already been accepted' });
      return;
    }

    if (invitation.expiresAt < new Date()) {
      res.status(410).json({ message: 'Invitation link has expired' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId: invitation.tenantId,
          email: invitation.email.toLowerCase(),
          fullName,
          passwordHash,
          role: invitation.role,
          isActive: true,
          isEmailVerified: true,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return user;
    });

    const jwtToken = jwt.sign(
      {
        id: result.id,
        email: result.email,
        role: result.role,
        tenantId: result.tenantId,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await recordAuditLog({
      tenantId: invitation.tenantId,
      userId: result.id,
      actorName: result.fullName,
      action: 'INVITATION_ACCEPTED',
      entityType: 'User',
      entityId: result.id,
      description: `${result.fullName} (${result.email}) accepted invitation and joined "${invitation.tenant.name}" as ${result.role}.`,
    });

    res.status(201).json({
      message: 'Account successfully activated',
      token: jwtToken,
      user: {
        id: result.id,
        email: result.email,
        fullName: result.fullName,
        role: result.role,
        tenantId: result.tenantId,
      },
      tenant: {
        id: invitation.tenant.id,
        name: invitation.tenant.name,
        currency: invitation.tenant.currency,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTenantUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = getActiveTenantId(req);
    const users = await prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

export const deleteInvitation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const tenantId = getActiveTenantId(req);
    await prisma.invitation.deleteMany({
      where: { id, tenantId },
    });
    res.json({ message: 'Invitation deleted' });
  } catch (error) {
    next(error);
  }
};

export const updateTenantUserRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;
    const tenantId = getActiveTenantId(req);

    if (id === req.user?.id) {
      res.status(400).json({ message: 'You cannot change your own role' });
      return;
    }

    const updated = await prisma.user.updateMany({
      where: { id, tenantId },
      data: { role },
    });

    if (updated.count === 0) {
      res.status(404).json({ message: 'User not found in this community' });
      return;
    }

    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    next(error);
  }
};
