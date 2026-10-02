import Decimal from "decimal.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { eq, and, ne, gte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { withTenant, type DrizzleTx } from "@/modules/tenancy/with-tenant";
import { normalizeRif } from "@/modules/fiscal-docs/service";
import { record } from "@/modules/audit/record";
import {
  parties,
  settlementEvents,
  settlementAllocations,
  purchaseDocuments,
  islrWithholdings,
} from "@/db/schema";

const MoneySchema = z.string().regex(/^\d+(\.\d{1,2})?$/, "Monto inválido");

export const CreateSettlementEventSchema = z
  .object({
    partyRif: z.string().min(3).max(20),
    eventType: z.enum(["payment", "account_credit"]),
    eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    amount: MoneySchema,
    currency: z.string().min(3).max(3).default("VES"),
    method: z.string().max(50).optional(),
    sourceRef: z.string().max(200).optional(),
    inferred: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.eventType === "account_credit" && value.method) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["method"],
        message: "Un abono en cuenta no lleva método de pago.",
      });
    }
  });

export type Ctx = { companyId: string; userId: string };

async function hasLaterIssuedIslr(tx: DrizzleTx, companyId: string, partyId: string, eventDate: string) {
  const matches = await tx
    .select({ id: islrWithholdings.id })
    .from(islrWithholdings)
    .innerJoin(settlementEvents, eq(islrWithholdings.settlementEventId, settlementEvents.id))
    .where(
      and(
        eq(islrWithholdings.companyId, companyId),
        eq(islrWithholdings.beneficiaryId, partyId),
        ne(islrWithholdings.status, "voided"),
        gte(settlementEvents.eventDate, eventDate),
      ),
    )
    .limit(1);
  return matches.length > 0;
}

/** Registra el hecho económico sin inferir abonos ni emitir retenciones automáticamente. */
export async function createSettlementEvent(
  ctx: Ctx,
  raw: z.input<typeof CreateSettlementEventSchema>,
) {
  const parsed = CreateSettlementEventSchema.safeParse(raw);
  if (!parsed.success)
    return {
      ok: false as const,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]!.message },
    };
  if (!new Decimal(parsed.data.amount).gt(0))
    return {
      ok: false as const,
      error: { code: "VALIDATION_ERROR", message: "Monto debe ser > 0." },
    };

  return withTenant(ctx, async (tx) => {
    const rif = normalizeRif(parsed.data.partyRif);
    const [party] = await tx
      .select()
      .from(parties)
      .where(and(eq(parties.companyId, ctx.companyId), eq(parties.rif, rif)))
      .limit(1);
    if (!party)
      return {
        ok: false as const,
        error: { code: "NOT_FOUND", message: "Tercero no existe (créalo primero)." },
      };

    await tx.execute(sql`SELECT id FROM parties WHERE id = ${party.id} FOR UPDATE`);
    if (await hasLaterIssuedIslr(tx, ctx.companyId, party.id, parsed.data.eventDate)) {
      return {
        ok: false as const,
        error: {
          code: "G2_EVENT_REVIEW_REQUIRED",
          message: "Hay una retención ISLR emitida para una fecha igual o posterior; revisar antes de registrar un evento retroactivo.",
        },
      };
    }
    const [event] = await tx
      .insert(settlementEvents)
      .values({
        companyId: ctx.companyId,
        partyId: party.id,
        eventType: parsed.data.eventType,
        eventDate: parsed.data.eventDate,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        method: parsed.data.method ?? null,
        sourceRef: parsed.data.sourceRef ?? null,
        inferred: parsed.data.inferred,
      })
      .returning({ id: settlementEvents.id });
    await record(
      tx,
      {
        companyId: ctx.companyId,
        actorUserId: ctx.userId,
        action: "create",
        entityType: "settlement_event",
        entityId: event!.id,
        after: {
          eventType: parsed.data.eventType,
          eventDate: parsed.data.eventDate,
          amount: parsed.data.amount,
          currency: parsed.data.currency,
          inferred: parsed.data.inferred,
        },
      },
      `tx-settlement-${event!.id}`,
    );
    return { ok: true as const, id: event!.id };
  });
}

/** Asigna un pago/abono a una compra con topes por evento y documento. */
export async function allocateSettlementEvent(
  ctx: Ctx,
  eventId: string,
  purchaseDocumentId: string,
  amount: string,
) {
  const parsedAmount = MoneySchema.safeParse(amount);
  if (!parsedAmount.success || !new Decimal(parsedAmount.data).gt(0))
    return {
      ok: false as const,
      error: { code: "VALIDATION_ERROR", message: "Monto asignado inválido." },
    };

  return withTenant(ctx, async (tx) => {
    await tx.execute(sql`SELECT id FROM payments WHERE id = ${eventId} FOR UPDATE`);
    await tx.execute(sql`SELECT id FROM purchase_documents WHERE id = ${purchaseDocumentId} FOR UPDATE`);

    const [event] = await tx
      .select()
      .from(settlementEvents)
      .where(eq(settlementEvents.id, eventId))
      .limit(1);
    if (!event || event.companyId !== ctx.companyId || event.status !== "active")
      return {
        ok: false as const,
        error: { code: "NOT_FOUND", message: "Evento activo no existe." },
      };
    await tx.execute(sql`SELECT id FROM parties WHERE id = ${event.partyId} FOR UPDATE`);
    if (await hasLaterIssuedIslr(tx, ctx.companyId, event.partyId, event.eventDate)) {
      return {
        ok: false as const,
        error: {
          code: "G2_EVENT_REVIEW_REQUIRED",
          message: "Hay una retención ISLR emitida para una fecha igual o posterior; no se puede asignar retroactivamente sin revisión.",
        },
      };
    }

    const [doc] = await tx
      .select()
      .from(purchaseDocuments)
      .where(eq(purchaseDocuments.id, purchaseDocumentId))
      .limit(1);
    if (!doc || doc.companyId !== ctx.companyId || doc.status !== "validated")
      return {
        ok: false as const,
        error: { code: "NOT_FOUND", message: "Compra validada no existe." },
      };
    if (doc.partyId !== event.partyId)
      return {
        ok: false as const,
        error: { code: "VALIDATION_ERROR", message: "El beneficiario del evento no coincide con el proveedor." },
      };

    const eventAllocations = await tx
      .select()
      .from(settlementAllocations)
      .where(eq(settlementAllocations.eventId, eventId));
    const eventAllocated = eventAllocations.reduce(
      (sum, allocation) => sum.plus(allocation.amountAllocated),
      new Decimal(0),
    );
    if (eventAllocated.plus(parsedAmount.data).gt(event.amount))
      return {
        ok: false as const,
        error: {
          code: "VALIDATION_ERROR",
          message: `Excede disponible (${new Decimal(event.amount).minus(eventAllocated).toFixed(2)}).`,
        },
      };

    const documentAllocations = await tx
      .select({ allocation: settlementAllocations.amountAllocated })
      .from(settlementAllocations)
      .innerJoin(settlementEvents, eq(settlementAllocations.eventId, settlementEvents.id))
      .where(
        and(
          eq(settlementAllocations.purchaseDocumentId, purchaseDocumentId),
          eq(settlementEvents.status, "active"),
        ),
      );
    const documentAllocated = documentAllocations.reduce(
      (sum, allocation) => sum.plus(allocation.allocation),
      new Decimal(0),
    );
    if (documentAllocated.plus(parsedAmount.data).gt(doc.total))
      return {
        ok: false as const,
        error: {
          code: "VALIDATION_ERROR",
          message: `La asignación excede el saldo de la compra (${new Decimal(doc.total).minus(documentAllocated).toFixed(2)}).`,
        },
      };

    const existing = eventAllocations.find((allocation) => allocation.purchaseDocumentId === purchaseDocumentId);
    let allocationId: string;
    if (existing) {
      const [updated] = await tx
        .update(settlementAllocations)
        .set({ amountAllocated: new Decimal(existing.amountAllocated).plus(parsedAmount.data).toFixed(2) })
        .where(eq(settlementAllocations.id, existing.id))
        .returning({ id: settlementAllocations.id });
      allocationId = updated!.id;
    } else {
      const [created] = await tx
        .insert(settlementAllocations)
        .values({
          companyId: ctx.companyId,
          eventId,
          purchaseDocumentId,
          amountAllocated: parsedAmount.data,
        })
        .returning({ id: settlementAllocations.id });
      allocationId = created!.id;
    }

    await record(
      tx,
      {
        companyId: ctx.companyId,
        actorUserId: ctx.userId,
        action: "allocate",
        entityType: "settlement_event",
        entityId: eventId,
        after: { purchaseDocumentId, amount: parsedAmount.data },
      },
      `tx-settlement-allocation-${randomUUID()}`,
    );
    return { ok: true as const, id: allocationId };
  });
}

export async function listSettlementEvents(ctx: Ctx) {
  return withTenant(ctx, async (tx) => {
    const events = await tx
      .select()
      .from(settlementEvents)
      .where(eq(settlementEvents.companyId, ctx.companyId))
      .limit(200);
    const out = [];
    for (const event of events) {
      const [party] = await tx.select().from(parties).where(eq(parties.id, event.partyId)).limit(1);
      const allocations = await tx
        .select()
        .from(settlementAllocations)
        .where(eq(settlementAllocations.eventId, event.id));
      const allocated = allocations.reduce((sum, row) => sum.plus(row.amountAllocated), new Decimal(0)).toFixed(2);
      out.push({ ...event, rif: party?.rifOriginal ?? "", allocated });
    }
    return out;
  });
}

/** Lista activa de eventos payment para consumidores que no procesan abonos. */
export async function listPaymentEvents(ctx: Ctx) {
  const events = await listSettlementEvents(ctx);
  return events.filter((event) => event.eventType === "payment" && event.status === "active");
}

export async function listOpenPurchases(ctx: Ctx) {
  return withTenant(ctx, (tx) =>
    tx
      .select({ id: purchaseDocuments.id, docNumber: purchaseDocuments.docNumber, total: purchaseDocuments.total })
      .from(purchaseDocuments)
      .where(eq(purchaseDocuments.companyId, ctx.companyId))
      .limit(200),
  );
}
