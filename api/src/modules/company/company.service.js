// src/modules/company/company.service.js
import { prisma } from '../../prisma.js';
import { AppError } from '../../utils/AppError.js';
import { uploadImage, deleteImage } from '../../services/cloudinary.js';

// ── Admin: list all companies ─────────────────────────────────────────────────

export async function list({ search, status, page = 1, limit = 20 }) {
  const skip = (page - 1) * Math.min(limit, 100);
  const take = Math.min(Number(limit), 100);

  const where = {
    ...(status && { status }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { registrationNumber: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [total, items] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        _count: { select: { users: true } },
      },
    }),
  ]);

  return { items, meta: { page: Number(page), limit: take, total } };
}

// ── Admin: get company by id ──────────────────────────────────────────────────

export async function getById(id) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true } },
    },
  });
  if (!company) throw AppError.notFound('Company not found');
  return company;
}

// ── Admin: create company ─────────────────────────────────────────────────────

export async function create(data) {
  try {
    return await prisma.company.create({
      data: {
        name: data.name.trim(),
        registrationNumber: data.registrationNumber?.trim() || null,
        industry: data.industry?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        status: 'active',
      },
    });
  } catch (err) {
    if (err.code === 'P2002') throw AppError.conflict('A company with this registration number already exists');
    throw err;
  }
}

// ── Admin: update company ─────────────────────────────────────────────────────

export async function update(id, data) {
  await getById(id); // 404 guard
  try {
    return await prisma.company.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.registrationNumber !== undefined && { registrationNumber: data.registrationNumber?.trim() || null }),
        ...(data.industry !== undefined && { industry: data.industry?.trim() || null }),
        ...(data.email !== undefined && { email: data.email?.trim() || null }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
        ...(data.address !== undefined && { address: data.address?.trim() || null }),
      },
    });
  } catch (err) {
    if (err.code === 'P2002') throw AppError.conflict('A company with this registration number already exists');
    throw err;
  }
}

// ── Admin: activate / deactivate ─────────────────────────────────────────────

export async function setStatus(id, status) {
  await getById(id);
  const updated = await prisma.company.update({
    where: { id },
    data: { status },
  });

  // Deactivation: revoke all refresh tokens for this company's users
  if (status === 'inactive') {
    const users = await prisma.user.findMany({
      where: { companyId: id },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    if (userIds.length) {
      await prisma.refreshToken.updateMany({
        where: { userId: { in: userIds }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  return updated;
}

// ── Company admin: get/update own company ────────────────────────────────────

export async function getOwn(companyId) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw AppError.notFound('Company not found');
  return company;
}

export async function updateOwn(companyId, data) {
  // Company admin can only edit non-critical fields (not status/registration_number)
  try {
    return await prisma.company.update({
      where: { id: companyId },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.industry !== undefined && { industry: data.industry?.trim() || null }),
        ...(data.email !== undefined && { email: data.email?.trim() || null }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
        ...(data.address !== undefined && { address: data.address?.trim() || null }),
      },
    });
  } catch (err) {
    if (err.code === 'P2002') throw AppError.conflict('Conflict');
    throw err;
  }
}

// ── Logo upload ──────────────────────────────────────────────────────────────

export async function uploadLogo(companyId, buffer) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw AppError.notFound('Company not found');

  // Delete old logo
  if (company.logoPublicId) {
    await deleteImage(company.logoPublicId);
  }

  const { url, publicId } = await uploadImage(buffer, `soms/companies/${companyId}`);

  return prisma.company.update({
    where: { id: companyId },
    data: { logoUrl: url, logoPublicId: publicId },
  });
}
