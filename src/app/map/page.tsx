import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MapClient } from "./map-client";

export default async function CuriosityMapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <MapClient />;
}
