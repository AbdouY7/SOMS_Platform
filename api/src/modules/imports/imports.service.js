// src/modules/imports/imports.service.js
// preview -> commit -> (optional) rollback, plus listing/detail/error report.
// Every query is scoped by companyId; a foreign id is a 404.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { prisma } from '../../prisma.js';
import { AppError } from '../../utils/AppError.js';
import { csvValidate, IMPORT_TYPES } from '../../services/csvValidate.js';
import { settingsService } from '../../services/settings.js';
import { record } from '../../services/activity.js';

const TMP_DIR = process.env.IMPORT_TMP_DIR || path.join(os.tmpdir(), 'soms-imports');
const BATCH_SIZE = 500;
const MAX_STORED_ERRORS = 1000;

const MODELS = {
  social_posts: 'socialPost',
  regional_metrics: 'regionalMetric',
  sales_records: 'salesRecord',
};

const tmpPathFor = (importId) => path.join(TMP_DIR, `${importId}.csv`);
const removeTemp = (importId) => fs.rm(tmpPathFor(importId), { force: true }).catch(() => {});

async function findImport(importId, companyId) {
  const imp = await prisma.dataImport.findFirst({ where: { id: importId, companyId } });
  if (!imp) throw new AppError('Import not found', 404, 'IMPORT_NOT_FOUND');
  return imp;
}

async function uploaderNames(userIds) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return new Map();
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true } });
  return new Map(users.map((u) => [u.id, u.fullName]));
}

// ── preview ───────────────────────────────────────────────────────────────────
export async function preview(file, type, mode, onError, actorId, companyId) {
  if (!file?.buffer) throw new AppError('A CSV file is required', 400, 'FILE_REQUIRED');
  if (!IMPORT_TYPES.includes(type)) throw new AppError(`Unknown import type: ${type}`, 400, 'INVALID_TYPE');

  const maxMb = await settingsService.get('import_max_file_mb');
  if (file.size > maxMb * 1024 * 1024) {
    throw new AppError(`The file is larger than ${maxMb} MB`, 413, 'FILE_TOO_LARGE');
  }

  const result = await csvValidate(file.buffer, type, { maxErrors: 50 });

  const id = crypto.randomUUID();
  await fs.mkdir(TMP_DIR, { recursive: true });
  await fs.writeFile(tmpPathFor(id), file.buffer);

  try {
    await prisma.dataImport.create({
      data: {
        id,
        companyId,
        importedBy: actorId,
        importType: type,
        status: 'previewed',
        mode,
        onError,
        fileName: String(file.originalname ?? 'import.csv').slice(0, 255),
        totalRows: result.totalRows,
        acceptedRows: 0,
        rejectedRows: result.rejectedRows,
      },
    });
  } catch (err) {
    await removeTemp(id);
    throw err;
  }

  return {
    importId: id,
    type,
    fileName: file.originalname,
    delimiter: result.delimiter,
    columns: result.columns,
    totalRows: result.totalRows,
    validCount: result.validRows.length,
    rejectedRows: result.rejectedRows,
    errorCount: result.errorCount,
    errors: result.errors,
    previewRows: result.previewRows,
  };
}

// ── commit ────────────────────────────────────────────────────────────────────
function chunk(rows, size) {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

/** Insert one batch; returns the number of rows written (skipped duplicates excluded). */
async function writeBatch(type, rows, mode, base) {
  const data = rows.map((r) => ({ ...r, ...base }));

  if (type === 'social_posts') {
    if (mode === 'append') return (await prisma.socialPost.createMany({ data, skipDuplicates: true })).count;
    const withId = data.filter((r) => r.externalPostId);
    const withoutId = data.filter((r) => !r.externalPostId);
    await prisma.$transaction(
      withId.map((r) =>
        prisma.socialPost.upsert({
          where: { companyId_platform_externalPostId: { companyId: r.companyId, platform: r.platform, externalPostId: r.externalPostId } },
          create: r,
          update: r,
        })
      )
    );
    if (withoutId.length) await prisma.socialPost.createMany({ data: withoutId });
    return data.length;
  }

  if (type === 'regional_metrics') {
    if (mode === 'append') return (await prisma.regionalMetric.createMany({ data, skipDuplicates: true })).count;
    await prisma.$transaction(
      data.map((r) =>
        prisma.regionalMetric.upsert({
          where: {
            companyId_wilayaCode_periodStart_periodEnd_metricType_sourceType: {
              companyId: r.companyId, wilayaCode: r.wilayaCode, metricType: r.metricType,
              periodStart: r.periodStart, periodEnd: r.periodEnd, sourceType: r.sourceType,
            },
          },
          create: r,
          update: r,
        })
      )
    );
    return data.length;
  }

  // sales_records
  if (mode === 'append') return (await prisma.salesRecord.createMany({ data, skipDuplicates: true })).count;
  await prisma.$transaction(
    data.map((r) =>
      prisma.salesRecord.upsert({
        where: { companyId_orderDate: { companyId: r.companyId, orderDate: r.orderDate } },
        create: r,
        update: r,
      })
    )
  );
  return data.length;
}

export async function commit(importId, companyId, actorId, options = {}) {
  const imp = await findImport(importId, companyId);
  if (imp.status !== 'previewed') {
    throw new AppError('This import was already processed', 409, 'IMPORT_NOT_PREVIEWED');
  }
  const mode = options.mode ?? imp.mode;
  const onError = options.onError ?? imp.onError;

  // Claim the import so a double-click cannot run it twice.
  const claimed = await prisma.dataImport.updateMany({
    where: { id: importId, companyId, status: 'previewed' },
    data: { status: 'processing', mode, onError },
  });
  if (claimed.count === 0) throw new AppError('This import was already processed', 409, 'IMPORT_NOT_PREVIEWED');

  const fail = (data = {}) =>
    prisma.dataImport.update({ where: { id: importId }, data: { status: 'failed', completedAt: new Date(), ...data } });

  try {
    let buffer;
    try {
      buffer = await fs.readFile(tmpPathFor(importId));
    } catch {
      await fail();
      throw new AppError('The uploaded file has expired. Upload it again.', 410, 'IMPORT_FILE_GONE');
    }

    const v = await csvValidate(buffer, imp.type, { maxErrors: MAX_STORED_ERRORS });

    if (v.errors.length) {
      await prisma.dataImportError.createMany({
        data: v.errors.map((e) => ({
          importId,
          rowNumber: e.rowNumber,
          columnName: e.column,
          errorCode: e.errorCode,
          message: e.message,
          rawRow: e.rawRow ?? null,
        })),
      });
    }

    if (onError === 'abort' && v.rejectedRows > 0) {
      await fail({ rejectedRows: v.rejectedRows, acceptedRows: 0 });
      return {
        importId, status: 'failed', totalRows: v.totalRows, acceptedRows: 0,
        rejectedRows: v.rejectedRows, skippedDuplicates: 0, errorCount: v.errorCount,
      };
    }

    const base = { companyId, importId, sourceType: 'csv_import' };
    let inserted = 0;
    for (const batch of chunk(v.validRows, BATCH_SIZE)) {
      inserted += await writeBatch(imp.type, batch, mode, base);
    }

    await prisma.dataImport.update({
      where: { id: importId },
      data: { status: 'completed', acceptedRows: inserted, rejectedRows: v.rejectedRows, completedAt: new Date() },
    });

    await record({
      actorUserId: actorId,
      companyId,
      action: 'import.committed',
      entityType: 'DataImport',
      entityId: importId,
      metadata: { type: imp.type, mode, onError, accepted: inserted, rejected: v.rejectedRows },
    });

    return {
      importId, status: 'completed', totalRows: v.totalRows, acceptedRows: inserted,
      rejectedRows: v.rejectedRows, skippedDuplicates: v.validRows.length - inserted, errorCount: v.errorCount,
    };
  } catch (err) {
    // anything unexpected: do not leave the import stuck in "processing"
    await prisma.dataImport
      .updateMany({ where: { id: importId, status: 'processing' }, data: { status: 'failed', completedAt: new Date() } })
      .catch(() => {});
    throw err;
  } finally {
    await removeTemp(importId);
  }
}

// ── rollback ──────────────────────────────────────────────────────────────────
export async function rollback(importId, companyId, actorId) {
  const imp = await findImport(importId, companyId);
  if (imp.status !== 'completed') {
    throw new AppError('Only completed imports can be rolled back', 409, 'IMPORT_NOT_COMPLETED');
  }
  const model = MODELS[imp.type];

  const deleted = await prisma.$transaction(async (tx) => {
    const res = await tx[model].deleteMany({ where: { companyId, importId } });
    await tx.dataImport.update({ where: { id: importId }, data: { status: 'cancelled' } });
    return res.count;
  });

  await record({
    actorUserId: actorId,
    companyId,
    action: 'import.rolled_back',
    entityType: 'DataImport',
    entityId: importId,
    metadata: { type: imp.type, deleted },
  });

  return { importId, status: 'cancelled', deleted };
}

// ── reads ─────────────────────────────────────────────────────────────────────
export async function list(companyId, { page = 1, limit = 20 } = {}) {
  const take = Math.min(limit, 100);
  const [rows, total] = await Promise.all([
    prisma.dataImport.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * take,
      take,
    }),
    prisma.dataImport.count({ where: { companyId } }),
  ]);
  const names = await uploaderNames(rows.map((r) => r.importedBy));
  return {
    items: rows.map((r) => ({ ...r, uploaderName: names.get(r.importedBy) ?? null })),
    pagination: { page, limit: take, total, totalPages: Math.max(1, Math.ceil(total / take)) },
  };
}

export async function getDetail(importId, companyId) {
  const imp = await findImport(importId, companyId);
  const [errors, names] = await Promise.all([
    prisma.dataImportError.findMany({ where: { importId }, orderBy: [{ rowNumber: 'asc' }, { columnName: 'asc' }], take: 500 }),
    uploaderNames([imp.importedBy]),
  ]);
  return { ...imp, uploaderName: names.get(imp.importedBy) ?? null, errors };
}

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function buildErrorCsv(importId, companyId) {
  await findImport(importId, companyId);
  const errors = await prisma.dataImportError.findMany({
    where: { importId },
    orderBy: [{ rowNumber: 'asc' }, { column: 'asc' }],
  });
  const header = ['row_number', 'column', 'error_code', 'message'];
  const lines = errors.map((e) => [e.rowNumber, e.columnName, e.errorCode, e.message].map(csvCell).join(','));
  return `\uFEFF${[header.join(','), ...lines].join('\n')}\n`;
}

export const importsService = { preview, commit, rollback, list, getDetail, buildErrorCsv };
