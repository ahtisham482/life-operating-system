"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { parseInboxInput } from "@/lib/inbox/parse";
import { executeRoutes } from "@/lib/inbox/execute";
import type { ParsedRoute } from "@/lib/db/schema";

export async function parseCapture(rawInput: string) {
  const routes = await parseInboxInput(rawInput);

  // Save to engine_logs as pending parse
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("engine_logs")
    .insert({
      engine_name: "inbox_capture",
      status: "warning", // pending — will update to success on confirm
      summary: rawInput,
      details: { parsed_result: routes, capture_status: "pending" },
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  return { id: data.id, routes };
}

export async function confirmCapture(captureId: string, routes: ParsedRoute[]) {
  const results = await executeRoutes(routes);

  // Update log to confirmed
  const supabase = await createClient();
  const { error } = await supabase
    .from("engine_logs")
    .update({
      status: "success",
      details: {
        parsed_result: routes,
        capture_status: "confirmed",
        execution_results: results,
        executed_at: new Date().toISOString(),
      },
    })
    .eq("id", captureId);
  if (error) throw new Error(error.message);

  revalidatePath("/inbox");
  revalidatePath("/engines");
  return results;
}

export async function discardCapture(captureId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("engine_logs")
    .update({
      status: "error",
      details: { capture_status: "discarded" },
    })
    .eq("id", captureId);
  if (error) throw new Error(error.message);
  revalidatePath("/inbox");
}
