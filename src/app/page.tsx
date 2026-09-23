import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HomeClient } from "./home-client";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null;
  return <HomeClient name={name} />;
}
