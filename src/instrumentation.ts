export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { seedGuard, assertDbRole } = await import("@/db/guard");
  seedGuard();
  await assertDbRole().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
