import { CompanyFab } from "@/components/layout/company-fab";

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  return (
    <>
      {children}
      <CompanyFab companyId={companyId} />
    </>
  );
}
