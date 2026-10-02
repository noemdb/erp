-- F6: bloqueo a dos niveles (DATABASE.md). App ya valida; DB es la última defensa.
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_closed_period_mutation()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM fiscal_periods
    WHERE id = COALESCE(NEW.fiscal_period_id, OLD.fiscal_period_id)
      AND status = 'closed'
  ) THEN
    RAISE EXCEPTION 'Período cerrado: reapertura o ajuste requerido (código PERIOD_CLOSED)';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_purchase_docs_closed ON purchase_documents;
--> statement-breakpoint
CREATE TRIGGER trg_purchase_docs_closed
  BEFORE INSERT OR UPDATE OR DELETE ON purchase_documents
  FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_mutation();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_sales_docs_closed ON sales_documents;
--> statement-breakpoint
CREATE TRIGGER trg_sales_docs_closed
  BEFORE INSERT OR UPDATE OR DELETE ON sales_documents
  FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_mutation();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_iva_w_closed ON iva_withholdings;
--> statement-breakpoint
CREATE TRIGGER trg_iva_w_closed
  BEFORE INSERT OR UPDATE OR DELETE ON iva_withholdings
  FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_mutation();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_islr_w_closed ON islr_withholdings;
--> statement-breakpoint
CREATE TRIGGER trg_islr_w_closed
  BEFORE INSERT OR UPDATE OR DELETE ON islr_withholdings
  FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_mutation();
--> statement-breakpoint
-- Inv.3 a nivel DB (DATABASE.md): NC no excede total del afectado (compras y ventas)
CREATE OR REPLACE FUNCTION check_credit_note_limit()
RETURNS trigger AS $$
DECLARE
  v_total numeric;
  v_prev numeric;
BEGIN
  IF NEW.kind <> 'credit_note' THEN RETURN NEW; END IF;
  IF NEW.affected_document_id IS NULL THEN
    RAISE EXCEPTION 'NC sin documento afectado (código MISSING_AFFECTED_DOCUMENT)';
  END IF;
  IF TG_TABLE_NAME = 'purchase_documents' THEN
    SELECT total INTO v_total FROM purchase_documents WHERE id = NEW.affected_document_id;
    SELECT COALESCE(SUM(total), 0) INTO v_prev FROM purchase_documents
    WHERE affected_document_id = NEW.affected_document_id AND kind = 'credit_note' AND status <> 'voided' AND id <> NEW.id;
  ELSE
    SELECT total INTO v_total FROM sales_documents WHERE id = NEW.affected_document_id;
    SELECT COALESCE(SUM(total), 0) INTO v_prev FROM sales_documents
    WHERE affected_document_id = NEW.affected_document_id AND kind = 'credit_note' AND status <> 'voided' AND id <> NEW.id;
  END IF;
  IF (v_prev + NEW.total) > v_total THEN
    RAISE EXCEPTION 'NC excede saldo del afectado (código CREDIT_NOTE_EXCEEDS_BALANCE)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_purchase_nc_limit ON purchase_documents;
--> statement-breakpoint
CREATE TRIGGER trg_purchase_nc_limit
  BEFORE INSERT OR UPDATE ON purchase_documents
  FOR EACH ROW EXECUTE FUNCTION check_credit_note_limit();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_sales_nc_limit ON sales_documents;
--> statement-breakpoint
CREATE TRIGGER trg_sales_nc_limit
  BEFORE INSERT OR UPDATE ON sales_documents
  FOR EACH ROW EXECUTE FUNCTION check_credit_note_limit();
