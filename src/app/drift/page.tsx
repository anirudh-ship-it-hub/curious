import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DriftClient } from "./drift-client";

export default async function Drift() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null;
  return <DriftClient name={name} />;
}
