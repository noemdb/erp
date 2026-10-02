import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/app/api/uploadthing/core";
import { GlobalLoading } from "@/components/layout/global-loading";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "ERP-TributarioLite — Del registro al cierre",
  description:
    "Registra compras, ventas, pagos y retenciones una sola vez y deriva Libro de Compras, Libro de Ventas, Resumen de IVA y comprobantes de IVA/ISLR.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-VE" data-scroll-behavior="smooth">
      <body>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
          <Toaster>
            {children}
            <GlobalLoading />
          </Toaster>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
