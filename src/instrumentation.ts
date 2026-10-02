export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { seedGuard, assertDbRole } = await import("@/db/guard");
  seedGuard();
  await assertDbRole().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    // Sin process.exit: no existe en Edge Runtime y Next lo advierte al
    // compilar. Lanzar basta para abortar el arranque con el error visible.
    throw e;
  });
}
