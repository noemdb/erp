import { getSessionUser } from "@/modules/identity/session";
import { LandingContent } from "./landing-content";

export default async function Home() {
  let userName: string | null = null;
  try {
    userName = (await getSessionUser())?.name ?? null;
  } catch {
    userName = null;
  }
  return <LandingContent userName={userName} />;
}
