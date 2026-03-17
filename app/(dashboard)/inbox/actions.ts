"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { parseInboxInput } from "@/lib/inbox/parse";
import { executeRoutes } from "@/lib/inbox/execute";
import type { ParsedRoute } from "@/lib/db/schema";

export async function parseCapture(rawInput: string) {
  const routes = await parseInboxInput(rawInput);

  // Save to inbox_captures as pending
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inbox_captures")
    .insert({
      raw_input: rawInput,
      parsed_result: routes,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  return { id: data.id, routes };
}

export async function confirmCapture(captureId: string, routes: ParsedRoute[]) {
  const results = await executeRoutes(routes);

  // Update capture status
  const supabase = await createClient();
  const { error } = await supabase
    .from("inbox_captures")
    .update({
      parsed_result: routes,
      status: "confirmed",
      executed_at: new Date().toISOString(),
    })
    .eq("id", captureId);
  if (error) throw new Error(error.message);

  revalidatePath("/inbox");
  return results;
}

export async function discardCapture(captureId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("inbox_captures")
    .update({ status: "discarded" })
    .eq("id", captureId);
  if (error) throw new Error(error.message);
  revalidatePath("/inbox");
}

export async function getInboxHistory() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inbox_captures")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}
