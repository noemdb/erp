import Link from "next/link";
import type { ReactNode } from "react";
import MenuBook from "@mui/icons-material/MenuBook";
import ArrowBack from "@mui/icons-material/ArrowBack";
import CheckCircle from "@mui/icons-material/CheckCircle";
import Schedule from "@mui/icons-material/Schedule";
import { redirect } from "next/navigation";
import { getSessionUser, listMemberships } from "@/modules/identity/session";
import { AppHeader, PageFooter } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { DOC_SECTIONS, type DocSection } from "./content";

function StatusBadge({ status }: { status: DocSection["status"] }) {
  if (status === "disponible")
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle className="h-3 w-3" aria-hidden /> Disponible
      </Badge>
    );
  return (
    <Badge variant="warning" className="gap-1">
      <Schedule className="h-3 w-3" aria-hidden /> Próximamente
    </Badge>
  );
}

function Sidebar({ current }: { current?: string }) {
  return (
    <nav aria-label="Documentación" className="space-y-6">
      {DOC_SECTIONS.map((s) => (
        <div key={s.id}>
          <p className="text-xs font-semibold uppercase tracking-wider text-periwinkle-400">
            {s.id}. {s.title}
          </p>
          <p className="mt-0.5 text-xs text-periwinkle-500">{s.tagline}</p>
          <ul className="mt-2 space-y-1">
            {s.pages.map((p) => {
              const active = current === p.href;
              const href = p.available ? p.href : "/docs";
              return (
                <li key={p.href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "block rounded-md bg-[#120c27] px-3 py-2 text-sm font-medium text-white"
                        : "block rounded-md px-3 py-2 text-sm text-periwinkle-700 transition-colors hover:bg-periwinkle-100 hover:text-[#120c27]"
                    }
                  >
                    {p.title}
                    {!p.available && (
                      <span className="ml-2 text-xs opacity-60">(pronto)</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function DocsShell({
  user,
  companyCount,
  current,
  breadcrumb,
  children,
}: {
  user: { name: string; email: string };
  companyCount: number;
  current?: string;
  breadcrumb?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title="Documentación"
        back={{ href: "/dashboard", label: "Dashboard" }}
        user={user}
        companyCount={companyCount}
      />
      <main className="mx-auto max-w-6xl px-6 pb-16">
        <div className="flex items-center gap-2 pt-8 text-sm text-periwinkle-500">
          <MenuBook className="h-4 w-4" aria-hidden />
          <Link href="/docs" className="hover:text-[#120c27]">
            Docs
          </Link>
          {breadcrumb}
        </div>
        <div className="mt-4 grid gap-10 lg:grid-cols-[260px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Sidebar current={current} />
            <Link
              href="/dashboard"
              className="mt-6 inline-flex items-center gap-1.5 text-sm text-periwinkle-500 hover:text-[#120c27]"
            >
              <ArrowBack className="h-4 w-4" aria-hidden /> Volver al dashboard
            </Link>
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </main>
      <PageFooter context="Documentación de usuario" />
    </div>
  );
}

export async function getDocsSession() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const memberships = await listMemberships(user.id);
  return { user, companyCount: memberships.length };
}

export function DocCallout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-periwinkle-200 bg-periwinkle-100/50 px-4 py-3 text-sm">
      <p className="font-semibold text-[#120c27]">{title}</p>
      <div className="mt-1 text-periwinkle-700">{children}</div>
    </div>
  );
}

export function StepList({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li
          key={s.title}
          className="flex gap-3 rounded-md border border-periwinkle-200 px-4 py-3"
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#120c27] to-[#352574] text-sm font-bold text-white"
            aria-hidden
          >
            {i + 1}
          </span>
          <div>
            <p className="text-sm font-semibold">{s.title}</p>
            <p className="mt-0.5 text-sm text-periwinkle-600">{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function DocArticle({
  user,
  companyCount,
  current,
  crumb,
  section,
  title,
  intro,
  steps,
  callouts,
  prev,
  next,
}: {
  user: { name: string; email: string };
  companyCount: number;
  current: string;
  crumb: string;
  section: string;
  title: string;
  intro: string;
  steps: { title: string; body: string }[];
  callouts: { title: string; body: ReactNode }[];
  prev?: { href: string; label: string };
  next?: { href: string; label: string };
}) {
  return (
    <DocsShell
      user={user}
      companyCount={companyCount}
      current={current}
      breadcrumb={
        <>
          <span aria-hidden>/</span>
          <span className="text-periwinkle-900">{crumb}</span>
        </>
      }
    >
      <Badge variant="outline">{section}</Badge>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-periwinkle-500">{intro}</p>
      <div className="mt-6">
        <StepList steps={steps} />
      </div>
      <div className="mt-6 space-y-3">
        {callouts.map((c) => (
          <DocCallout key={c.title} title={c.title}>
            {c.body}
          </DocCallout>
        ))}
      </div>
      <p className="mt-6 flex gap-4 text-sm">
        {prev && (
          <Link
            href={prev.href}
            className="text-periwinkle-500 hover:text-[#120c27]"
          >
            ← {prev.label}
          </Link>
        )}
        {next && (
          <Link
            href={next.href}
            className="font-semibold text-[#352574] hover:underline"
          >
            Siguiente: {next.label} →
          </Link>
        )}
        {!next && (
          <Link
            href="/docs"
            className="font-semibold text-[#352574] hover:underline"
          >
            Volver al índice →
          </Link>
        )}
      </p>
    </DocsShell>
  );
}

export { StatusBadge };
