import puppeteer, { type Browser } from "puppeteer-core";

/**
 * Spike 2.0.3 §3 (ADR-009): Chromium headless como motor PDF.
 * Seguridad: sin JavaScript, red bloqueada (toda petición externa se aborta),
 * sin file:// salvo about:blank. Una instancia reutilizada por proceso.
 */
const CHROME_PATH = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browser?.connected) return browser;
  browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-first-run", "--no-default-browser-check", "--disable-gpu", "--font-render-hinting=none"],
  });
  return browser;
}

export async function browserHealth(): Promise<{ ok: boolean; version?: string }> {
  try {
    const b = await getBrowser();
    return { ok: b.connected, version: await b.version() };
  } catch {
    return { ok: false };
  }
}

export type PdfOptions = {
  orientation?: "portrait" | "landscape";
  onRequest?: (url: string, aborted: boolean) => void;
};

/** Renderiza HTML (ya escapado por las plantillas) a PDF Letter. Devuelve bytes + peticiones observadas. */
export async function renderPdf(html: string, opts: PdfOptions = {}): Promise<{ pdf: Buffer; requests: { url: string; aborted: boolean }[] }> {
  const b = await getBrowser();
  const page = await b.newPage();
  const requests: { url: string; aborted: boolean }[] = [];
  try {
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      const external = !url.startsWith("data:") && !url.startsWith("about:");
      requests.push({ url, aborted: external });
      opts.onRequest?.(url, external);
      if (external) void req.abort();
      else void req.continue();
    });
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 30000 });
    const pdf = await page.pdf({
      format: "Letter",
      landscape: opts.orientation === "landscape",
      printBackground: false,
      margin: { top: "15mm", bottom: "15mm", left: "12mm", right: "12mm" },
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>',
    });
    return { pdf: Buffer.from(pdf), requests };
  } finally {
    await page.close();
  }
}
