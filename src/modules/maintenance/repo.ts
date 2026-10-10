import { drizzle } from "drizzle-orm/postgres-js";
import { sql, notInArray, ne, eq, and, count, type SQL, type SQLWrapper } from "drizzle-orm";
import postgres from "postgres";
import { migrationUrl } from "@/lib/env";
import * as schema from "@/db/schema";
import { authorize } from "@/modules/tenancy/authorize";
import { listMemberships } from "@/modules/identity/session";
import { GLOBAL_SCOPE } from "@/modules/withholdings/constants";
import { PRACTICA_EMAILS } from "./service";

/**
 * Acceso a DB del mantenimiento global (ADR-037). Usa el rol migrador
 * (`migrationUrl()`), no el rol app: el backup debe leer todas las empresas
 * (RLS lo impediría) y la limpieza borra cross-tenant. Nunca `withTenant`
 * (no hay tenant) ni RLS como control: el único control es el gate admin
 * (`users.manage` en alguna empresa) aplicado en actions/handlers.
 */

type MigClient = ReturnType<typeof postgres>;
const g = globalThis as unknown as { __erpMig?: MigClient };
function migClient(): MigClient {
  if (!g.__erpMig) {
    g.__erpMig = postgres(migrationUrl(), { max: 3, prepare: false, connect_timeout: 15, idle_timeout: 20 });
  }
  return g.__erpMig;
}

export function maintenanceDb() {
  return drizzle(migClient(), { schema });
}

type MaintenanceTx = Parameters<Parameters<ReturnType<typeof maintenanceDb>["transaction"]>[0]>[0];

/** Gate global: `users.manage` en ALGUNA empresa (misma regla que /usuarios). */
export async function isGlobalAdmin(userId: string): Promise<boolean> {
  const mems = await listMemberships(userId);
  for (const m of mems) {
    if ((await authorize(m.companyId, userId, "users.manage")).ok) return true;
  }
  return false;
}

/** Empresas para el selector de limpieza (id + RIF + razón social). */
export async function listCompaniesFlat(): Promise<{ id: string; rif: string; razonSocial: string }[]> {
  const mdb = maintenanceDb();
  return mdb
    .select({ id: schema.companies.id, rif: schema.companies.rifOriginal, razonSocial: schema.companies.razonSocial })
    .from(schema.companies)
    .orderBy(schema.companies.razonSocial);
}

export type DbStatus = {
  sizeBytes: number;
  companies: number;
  users: number;
  comprobantes: number;
  documentos: number;
};

/** Estado previo: tamaño + conteos globales. Solo lectura. */
export async function getDatabaseStatus(): Promise<DbStatus> {
  const mdb = maintenanceDb();
  const size = await mdb.execute(sql`SELECT pg_database_size(current_database()) AS bytes`);
  const bytes = Number((size as unknown as { bytes: string }[])[0]?.bytes ?? 0);
  const s = schema;
  const n = async (rows: Promise<{ n: unknown }[]>) => Number((await rows)[0]?.n ?? 0);
  const [companies, users, iva, islr, buys, sells] = await Promise.all([
    n(mdb.select({ n: count(s.companies.id) }).from(s.companies)),
    n(mdb.select({ n: count(s.users.id) }).from(s.users)),
    n(mdb.select({ n: count(s.ivaWithholdings.id) }).from(s.ivaWithholdings)),
    n(mdb.select({ n: count(s.islrWithholdings.id) }).from(s.islrWithholdings)),
    n(mdb.select({ n: count(s.purchaseDocuments.id) }).from(s.purchaseDocuments)),
    n(mdb.select({ n: count(s.salesDocuments.id) }).from(s.salesDocuments)),
  ]);
  return { sizeBytes: bytes, companies, users, comprobantes: iva + islr, documentos: buys + sells };
}

export type CleanCounts = {
  companies: number;
  users: number;
  memberships: number;
  sessionsRevoked: number;
  preservedUsers: number;
};

async function deleteWhere(tx: MaintenanceTx, table: Parameters<MaintenanceTx["delete"]>[0], where?: SQL): Promise<number> {
  const base = tx.delete(table);
  const rows = where === undefined ? await base : await base.where(where);
  return (rows as unknown[]).length;
}

async function preservedIds(tx: MaintenanceTx, scopeCompanyId?: string): Promise<string[]> {
  const s = schema;
  const adminRows = await tx
    .select({ userId: s.companyUser.userId })
    .from(s.companyUser)
    .where(
      scopeCompanyId
        ? and(sql`${s.companyUser.role} = 'admin'`, eq(s.companyUser.companyId, scopeCompanyId))
        : sql`${s.companyUser.role} = 'admin'`,
    );
  const practRows = await tx
    .select({ id: s.users.id })
    .from(s.users)
    .where(sql`lower(${s.users.email}) IN (${sql.join(PRACTICA_EMAILS.map((e) => sql`${e}`), sql`, `)})`);
  return [...new Set([...adminRows.map((r) => r.userId), ...practRows.map((r) => r.id)])];
}

/** Borrado en UNA transacción (hijos → padres por FK). Sin `companyId` = todas
 *  las empresas; con `companyId` = solo esa (los usuarios se podan solo si
 *  quedan sin membresías y no son preservados). Preserva siempre:
 *  - usuarios admin (rol `admin`) + cuentas de práctica;
 *  - conceptos ISLR globales (`company_id IS NULL`);
 *  - regla IVA global (`company_scope_key = GLOBAL_SCOPE`);
 *  - tabla de migraciones (nunca se toca: no figura en la lista).
 */
export async function cleanDatabase(companyId?: string): Promise<CleanCounts> {
  const mdb = maintenanceDb();
  return mdb.transaction(async (tx) => {
    const s = schema;
    const by = (col: SQLWrapper) => (companyId ? eq(col, companyId) : undefined);
    // Hojas fiscales primero.
    await deleteWhere(tx, s.ivaWithholdingLines, companyId ? eq(s.ivaWithholdingLines.companyId, companyId) : undefined);
    await deleteWhere(tx, s.islrWithholdingLines, companyId ? eq(s.islrWithholdingLines.companyId, companyId) : undefined);
    await deleteWhere(tx, s.ivaWithholdings, by(s.ivaWithholdings.companyId));
    await deleteWhere(tx, s.islrWithholdings, by(s.islrWithholdings.companyId));
    await deleteWhere(tx, s.receivedLinks, by(s.receivedLinks.companyId));
    await deleteWhere(tx, s.withholdingsReceived, by(s.withholdingsReceived.companyId));
    await deleteWhere(tx, s.settlementAllocations, by(s.settlementAllocations.companyId));
    // Decisiones: links → reglas por empresa → decisiones → conceptos por empresa.
    await deleteWhere(tx, s.fiscalDecisionLinks, by(s.fiscalDecisionLinks.companyId));
    await deleteWhere(
      tx,
      s.withholdingRules,
      companyId ? eq(s.withholdingRules.companyScopeKey, companyId) : ne(s.withholdingRules.companyScopeKey, GLOBAL_SCOPE),
    );
    await deleteWhere(tx, s.fiscalDecisions, by(s.fiscalDecisions.companyId));
    await deleteWhere(
      tx,
      s.withholdingConcepts,
      companyId ? eq(s.withholdingConcepts.companyId, companyId) : sql`${s.withholdingConcepts.companyId} IS NOT NULL`,
    );
    await deleteWhere(tx, s.generatedReports, by(s.generatedReports.companyId));
    // Documentos y líneas.
    await deleteWhere(tx, s.purchaseDocumentLines, by(s.purchaseDocumentLines.companyId));
    await deleteWhere(tx, s.salesDocumentLines, by(s.salesDocumentLines.companyId));
    await deleteWhere(tx, s.purchaseDocuments, by(s.purchaseDocuments.companyId));
    await deleteWhere(tx, s.salesDocuments, by(s.salesDocuments.companyId));
    await deleteWhere(tx, s.settlementEvents, by(s.settlementEvents.companyId));
    // Importación (filas → lotes → archivos con el bytea original).
    await deleteWhere(tx, s.importRows, by(s.importRows.companyId));
    await deleteWhere(tx, s.importBatches, by(s.importBatches.companyId));
    await deleteWhere(tx, s.sourceFiles, by(s.sourceFiles.companyId));
    // Máquinas/Z, terceros, series.
    await deleteWhere(tx, s.zReports, by(s.zReports.companyId));
    await deleteWhere(tx, s.fiscalMachines, by(s.fiscalMachines.companyId));
    await deleteWhere(tx, s.partyTaxProfiles, by(s.partyTaxProfiles.companyId));
    await deleteWhere(tx, s.parties, by(s.parties.companyId));
    await deleteWhere(tx, s.documentSeries, by(s.documentSeries.companyId));
    await deleteWhere(tx, s.rdfSeries, by(s.rdfSeries.companyId));
    // Catálogos por empresa, obligaciones, bitácora, adjuntos, períodos.
    await deleteWhere(tx, s.fiscalObligations, by(s.fiscalObligations.companyId));
    await deleteWhere(tx, s.fiscalHolidays, by(s.fiscalHolidays.companyId));
    await deleteWhere(tx, s.auditEvents, by(s.auditEvents.companyId));
    await deleteWhere(tx, s.attachments, by(s.attachments.companyId));
    await deleteWhere(tx, s.fiscalPeriods, by(s.fiscalPeriods.companyId));
    await deleteWhere(tx, s.branches, by(s.branches.companyId));

    const preserved = await preservedIds(tx, companyId);
    const usersBefore = (await tx.select({ id: s.users.id }).from(s.users)).length;
    let sessionsRevoked = 0;
    let memberships = 0;
    if (companyId) {
      memberships = await deleteWhere(tx, s.companyUser, eq(s.companyUser.companyId, companyId));
      // Poda: usuarios sin membresías restantes y no preservados.
      const withMem = await tx.select({ userId: s.companyUser.userId }).from(s.companyUser);
      const keep = new Set([...withMem.map((r) => r.userId), ...preserved]);
      const orphans = (await tx.select({ id: s.users.id }).from(s.users)).map((r) => r.id).filter((id) => !keep.has(id));
      for (const id of orphans) {
        await deleteWhere(tx, s.sessions, eq(s.sessions.userId, id));
        await deleteWhere(tx, s.passwordResetTokens, eq(s.passwordResetTokens.userId, id));
        await deleteWhere(tx, s.users, eq(s.users.id, id));
        sessionsRevoked += 1;
      }
    } else {
      memberships = await deleteWhere(tx, s.companyUser);
      if (preserved.length > 0) {
        sessionsRevoked = await deleteWhere(tx, s.sessions, notInArray(s.sessions.userId, preserved));
        await deleteWhere(tx, s.passwordResetTokens, notInArray(s.passwordResetTokens.userId, preserved));
        await deleteWhere(tx, s.users, notInArray(s.users.id, preserved));
      } else {
        sessionsRevoked = await deleteWhere(tx, s.sessions);
        await deleteWhere(tx, s.passwordResetTokens);
        await deleteWhere(tx, s.users);
      }
    }
    const usersAfter = (await tx.select({ id: s.users.id }).from(s.users)).length;
    const companies = companyId
      ? await deleteWhere(tx, s.companies, eq(s.companies.id, companyId))
      : await deleteWhere(tx, s.companies);
    return {
      companies,
      users: usersBefore - usersAfter,
      memberships,
      sessionsRevoked,
      preservedUsers: usersAfter,
    };
  });
}

export type PreviewTable = { tabla: string; filas: number };
export type CleanPreview = {
  companyId?: string;
  tables: PreviewTable[];
  totalFilas: number;
  preservedUsers: number;
  usuariosAEliminar: number;
};

/** Vista previa (simulacro): conteos de lo que se borraría, sin borrar. Solo lectura. */
export async function previewClean(companyId?: string): Promise<CleanPreview> {
  const mdb = maintenanceDb();
  const s = schema;
  const by = (col: SQLWrapper) => (companyId ? eq(col, companyId) : undefined);
  const n = async (rows: Promise<{ n: unknown }[]>) => Number((await rows)[0]?.n ?? 0);
  const defs: { tabla: string; run: () => Promise<number> }[] = [
    { tabla: "iva_withholding_lines", run: () => n(mdb.select({ n: count(s.ivaWithholdingLines.id) }).from(s.ivaWithholdingLines).where(by(s.ivaWithholdingLines.companyId) as SQL)) },
    { tabla: "islr_withholding_lines", run: () => n(mdb.select({ n: count(s.islrWithholdingLines.id) }).from(s.islrWithholdingLines).where(by(s.islrWithholdingLines.companyId) as SQL)) },
    { tabla: "iva_withholdings", run: () => n(mdb.select({ n: count(s.ivaWithholdings.id) }).from(s.ivaWithholdings).where(by(s.ivaWithholdings.companyId) as SQL)) },
    { tabla: "islr_withholdings", run: () => n(mdb.select({ n: count(s.islrWithholdings.id) }).from(s.islrWithholdings).where(by(s.islrWithholdings.companyId) as SQL)) },
    { tabla: "withholdings_received + links", run: () => n(mdb.select({ n: count(s.withholdingsReceived.id) }).from(s.withholdingsReceived).where(by(s.withholdingsReceived.companyId) as SQL)) },
    { tabla: "payment_allocations", run: () => n(mdb.select({ n: count(s.settlementAllocations.id) }).from(s.settlementAllocations).where(by(s.settlementAllocations.companyId) as SQL)) },
    { tabla: "fiscal_decisions + links", run: () => n(mdb.select({ n: count(s.fiscalDecisions.id) }).from(s.fiscalDecisions).where(by(s.fiscalDecisions.companyId) as SQL)) },
    {
      tabla: "withholding_rules",
      run: () => n(mdb.select({ n: count(s.withholdingRules.id) }).from(s.withholdingRules).where(
        (companyId ? eq(s.withholdingRules.companyScopeKey, companyId) : ne(s.withholdingRules.companyScopeKey, GLOBAL_SCOPE)) as SQL,
      )),
    },
    {
      tabla: "withholding_concepts",
      run: () => n(mdb.select({ n: count(s.withholdingConcepts.id) }).from(s.withholdingConcepts).where(
        (companyId ? eq(s.withholdingConcepts.companyId, companyId) : sql`${s.withholdingConcepts.companyId} IS NOT NULL`) as SQL,
      )),
    },
    { tabla: "generated_reports", run: () => n(mdb.select({ n: count(s.generatedReports.id) }).from(s.generatedReports).where(by(s.generatedReports.companyId) as SQL)) },
    { tabla: "purchase_documents + lines", run: () => n(mdb.select({ n: count(s.purchaseDocuments.id) }).from(s.purchaseDocuments).where(by(s.purchaseDocuments.companyId) as SQL)) },
    { tabla: "sales_documents + lines", run: () => n(mdb.select({ n: count(s.salesDocuments.id) }).from(s.salesDocuments).where(by(s.salesDocuments.companyId) as SQL)) },
    { tabla: "payments", run: () => n(mdb.select({ n: count(s.settlementEvents.id) }).from(s.settlementEvents).where(by(s.settlementEvents.companyId) as SQL)) },
    { tabla: "source_files + batches + rows", run: () => n(mdb.select({ n: count(s.sourceFiles.id) }).from(s.sourceFiles).where(by(s.sourceFiles.companyId) as SQL)) },
    { tabla: "parties + profiles", run: () => n(mdb.select({ n: count(s.parties.id) }).from(s.parties).where(by(s.parties.companyId) as SQL)) },
    { tabla: "fiscal_periods", run: () => n(mdb.select({ n: count(s.fiscalPeriods.id) }).from(s.fiscalPeriods).where(by(s.fiscalPeriods.companyId) as SQL)) },
    { tabla: "audit_events", run: () => n(mdb.select({ n: count(s.auditEvents.id) }).from(s.auditEvents).where(by(s.auditEvents.companyId) as SQL)) },
    { tabla: "attachments", run: () => n(mdb.select({ n: count(s.attachments.id) }).from(s.attachments).where(by(s.attachments.companyId) as SQL)) },
    {
      tabla: "companies",
      run: () => n(mdb.select({ n: count(s.companies.id) }).from(s.companies).where((companyId ? eq(s.companies.id, companyId) : undefined) as SQL)),
    },
  ];
  const tables: PreviewTable[] = [];
  for (const d of defs) tables.push({ tabla: d.tabla, filas: await d.run() });
  const users = await mdb.select({ id: s.users.id }).from(s.users);
  const preserved = await mdb.transaction((tx) => preservedIds(tx as MaintenanceTx, companyId));
  let usuariosAEliminar: number;
  if (companyId) {
    const otherMems = await mdb
      .select({ userId: s.companyUser.userId })
      .from(s.companyUser)
      .where(ne(s.companyUser.companyId, companyId));
    const keep = new Set([...otherMems.map((m) => m.userId), ...preserved]);
    const inCompany = new Set(
      (await mdb.select({ userId: s.companyUser.userId }).from(s.companyUser).where(eq(s.companyUser.companyId, companyId))).map(
        (m) => m.userId,
      ),
    );
    usuariosAEliminar = users.filter((u) => inCompany.has(u.id) && !keep.has(u.id)).length;
  } else {
    usuariosAEliminar = users.filter((u) => !preserved.includes(u.id)).length;
  }
  return {
    companyId,
    tables: tables.filter((t) => t.filas > 0),
    totalFilas: tables.reduce((a, t) => a + t.filas, 0),
    preservedUsers: preserved.length,
    usuariosAEliminar,
  };
}

export type RestoreCheckCompany = {
  id: string;
  rif: string;
  comprobantesIva: number;
  comprobantesIslr: number;
  series: { prefix: string; estado: string }[];
};

export type RestoreCheck = {
  companies: RestoreCheckCompany[];
  ultimoCierre: { periodoId: string; hash: string; cerradaEn: string | null } | null;
};

/** Verificación post-restore: conteos por empresa + cruce de series + último cierre. Solo lectura. */
export async function postRestoreCheck(): Promise<RestoreCheck> {
  const mdb = maintenanceDb();
  const s = schema;
  const companies = await mdb
    .select({ id: s.companies.id, rif: s.companies.rifOriginal })
    .from(s.companies)
    .orderBy(s.companies.razonSocial);
  const out: RestoreCheckCompany[] = [];
  for (const c of companies) {
    const [iva, islr, series] = await Promise.all([
      mdb.select({ id: s.ivaWithholdings.id }).from(s.ivaWithholdings).where(eq(s.ivaWithholdings.companyId, c.id)),
      mdb.select({ id: s.islrWithholdings.id }).from(s.islrWithholdings).where(eq(s.islrWithholdings.companyId, c.id)),
      mdb
        .select({ kind: s.documentSeries.kind, periodKey: s.documentSeries.periodKey, lastNumber: s.documentSeries.lastNumber })
        .from(s.documentSeries)
        .where(eq(s.documentSeries.companyId, c.id)),
    ]);
    out.push({
      id: c.id,
      rif: c.rif,
      comprobantesIva: iva.length,
      comprobantesIslr: islr.length,
      series: series.map((x) => ({ prefix: `${x.kind}:${x.periodKey}`, estado: `último ${x.lastNumber}` })),
    });
  }
  const closed = await mdb
    .select({ periodoId: s.fiscalPeriods.id, hash: s.fiscalPeriods.closureHash, cerradaEn: s.fiscalPeriods.closedAt })
    .from(s.fiscalPeriods)
    .where(eq(s.fiscalPeriods.status, "closed"))
    .orderBy(s.fiscalPeriods.closedAt)
    .limit(1);
  const last = closed[0];
  return {
    companies: out,
    ultimoCierre:
      last && last.hash
        ? { periodoId: last.periodoId, hash: last.hash.slice(0, 12), cerradaEn: last.cerradaEn?.toISOString() ?? null }
        : null,
  };
}
