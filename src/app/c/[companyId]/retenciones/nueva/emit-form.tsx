"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { previewIvaAction, issueIvaAction } from "@/modules/withholdings/actions";

type Eligible = { id: string; docNumber: string; rif: string; ivaCausado: string; total: string };

export function EmitForm({ companyId, eligible }: { companyId: string; eligible: Eligible[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<string[]>([]);
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [preview, setPreview] = useState<{ total: string; lines: { invoiceNumber: string; retainedAmount: string }[] } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function doPreview() {
    setMsg(null);
    const res = await previewIvaAction(companyId, sel, fecha);
    if (!res.ok) setMsg(`${res.error.code}: ${res.error.message}`);
    else setPreview(res);
  }

  async function doIssue() {
    setBusy(true);
    const res = await issueIvaAction(companyId, sel, fecha);
    if (!res.ok) {
      setMsg(`${res.error.code}: ${res.error.message}`);
      setBusy(false);
    } else router.push(`/c/${companyId}/retenciones/${res.id}`);
  }

  return (
    <div>
      <label>Fecha emisión <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
      <table>
        <thead><tr><th></th><th>Factura</th><th>RIF</th><th>IVA</th><th>Total</th></tr></thead>
        <tbody>
          {eligible.map((p) => (
            <tr key={p.id}>
              <td><input type="checkbox" checked={sel.includes(p.id)} onChange={(e) => setSel(e.target.checked ? [...sel, p.id] : sel.filter((x) => x !== p.id))} /></td>
              <td>{p.docNumber}</td><td>{p.rif}</td><td>{p.ivaCausado}</td><td>{p.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={doPreview} disabled={sel.length === 0}>Previsualizar cálculo</button>
      {preview && (
        <div>
          <p>Total a retener: {preview.total}</p>
          <ul>{preview.lines.map((l) => <li key={l.invoiceNumber}>{l.invoiceNumber}: {l.retainedAmount}</li>)}</ul>
          <button onClick={doIssue} disabled={busy}>{busy ? "Emitiendo…" : "Emitir comprobante"}</button>
        </div>
      )}
      {msg && <p role="alert">{msg}</p>}
    </div>
  );
}
