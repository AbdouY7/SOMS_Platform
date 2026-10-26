// src/modules/requests/requests.service.js
import { prisma } from '../../prisma.js';
import { AppError } from '../../utils/AppError.js';
import { hashPassword } from '../auth/auth.service.js';
import { logger } from '../../utils/logger.js';

/**
 * Submit a company registration request (public).
 */
export async function submit(data) {
  const email = data.applicantEmail.toLowerCase().trim();

  // Check: no existing user with this email
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });
  if (existingUser) {
    throw AppError.conflict('An account with this email already exists');
  }

  // Check: no pending request for this email (enforced by partial unique index too)
  const pendingRequest = await prisma.administrativeRequest.findFirst({
    where: {
      applicantEmail: { equals: email, mode: 'insensitive' },
      status: 'pending',
    },
  });
  if (pendingRequest) {
    throw AppError.conflict('A pending request for this email already exists');
  }

  // Hash the password before storing
  const passwordHash = await hashPassword(data.password);

  await prisma.administrativeRequest.create({
    data: {
      companyName: data.companyName.trim(),
      registrationNumber: data.registrationNumber?.trim() || null,
      industry: data.industry?.trim() || null,
      contactPhone: data.contactPhone?.trim() || null,
      applicantFullName: data.applicantFullName.trim(),
      applicantEmail: email,
      passwordHash,
    },
  });

  // Return generic message — never reveal whether email existed
  return { message: 'Your request has been submitted. An administrator will review it shortly.' };
}

/**
 * List requests with filters and pagination (super admin).
 */
export async function list({ status, search, page = 1, limit = 20 }) {
  const skip = (page - 1) * Math.min(limit, 100);
  const take = Math.min(Number(limit), 100);

  const where = {
    ...(status && { status }),
    ...(search && {
      OR: [
        { companyName: { contains: search, mode: 'insensitive' } },
        { applicantEmail: { contains: search, mode: 'insensitive' } },
        { applicantFullName: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [total, items] = await Promise.all([
    prisma.administrativeRequest.count({ where }),
    prisma.administrativeRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true, companyName: true, registrationNumber: true,
        industry: true, contactPhone: true,
        applicantFullName: true, applicantEmail: true,
        status: true, reviewedAt: true, decisionNote: true,
        createdAt: true, createdCompanyId: true,
        reviewer: { select: { id: true, fullName: true } },
      },
    }),
  ]);

  return { items, meta: { page: Number(page), limit: take, total } };
}

/**
 * Get a single request by id (super admin).
 */
export async function getById(id) {
  const req = await prisma.administrativeRequest.findUnique({
    where: { id },
    select: {
      id: true, companyName: true, registrationNumber: true,
      industry: true, contactPhone: true,
      applicantFullName: true, applicantEmail: true,
      status: true, reviewedAt: true, decisionNote: true,
      createdAt: true, createdCompanyId: true,
      reviewer: { select: { id: true, fullName: true } },
      createdCompany: { select: { id: true, name: true } },
    },
  });
  if (!req) throw AppError.notFound('Request not found');
  return req;
}

/**
 * Decide on a request: approve or reject.
 * Approval is ONE atomic transaction: create company + user, update request.
 */
export async function decide(id, reviewerId, decision, note) {
  const req = await prisma.administrativeRequest.findUnique({ where: { id } });
  if (!req) throw AppError.notFound('Request not found');
  if (req.status !== 'pending') {
    throw AppError.conflict('This request has already been decided');
  }

  if (decision === 'approved') {
    // Transaction: company + user + request update
    let created;
    try {
      created = await prisma.$transaction(async (tx) => {
        // 1. Create the company
        const company = await tx.company.create({
          data: {
            name: req.companyName,
            registrationNumber: req.registrationNumber,
            industry: req.industry,
            phone: req.contactPhone,
          },
        });

        // 2. Create the company_admin user
        const user = await tx.user.create({
          data: {
            fullName: req.applicantFullName,
            email: req.applicantEmail.toLowerCase(),
            passwordHash: req.passwordHash,
            role: 'company_admin',
            companyId: company.id,
          },
        });

        // 3. Mark request as approved, clear the password hash
        await tx.administrativeRequest.update({
          where: { id },
          data: {
            status: 'approved',
            reviewedBy: reviewerId,
            reviewedAt: new Date(),
            decisionNote: note || null,
            createdCompanyId: company.id,
            passwordHash: null,    // clear the hash — never store it after use
          },
        });

        return { company, user };
      });
    } catch (err) {
      // Unique email violation → user already created somehow
      if (err.code === 'P2002') {
        throw AppError.conflict('A user with this email already exists');
      }
      throw err;
    }

    logger.info({ companyId: created.company.id, userId: created.user.id }, 'Company approved and admin created');
    return { company: created.company };

  } else {
    // Reject: store note, clear hash
    await prisma.administrativeRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        decisionNote: note || null,
        passwordHash: null,
      },
    });
    return { message: 'Request rejected' };
  }
}
