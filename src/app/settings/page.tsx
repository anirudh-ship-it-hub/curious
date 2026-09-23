import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "";
  return <SettingsClient email={user.email ?? ""} initialName={name} />;
}
