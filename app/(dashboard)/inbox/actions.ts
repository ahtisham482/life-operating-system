"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { parseInboxInput } from "@/lib/inbox/parse";
import { executeRoutes } from "@/lib/inbox/execute";
import type { ParsedRoute } from "@/lib/db/schema";

export async function parseCapture(rawInput: string) {
  const { routes, followUpQuestions } = await parseInboxInput(rawInput);

  // Save to engine_logs as pending parse
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("engine_logs")
    .insert({
      engine_name: "inbox_capture",
      status: "warning", // pending — will update to success on confirm
      summary: rawInput,
      details: {
        parsed_result: routes,
        capture_status: "pending",
        follow_up_questions: followUpQuestions,
      },
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  return { id: data.id, routes, followUpQuestions };
}

export async function enrichCapture(
  captureId: string,
  originalInput: string,
  answers: { question: string; answer: string }[]
) {
  // Build enriched input by combining original + answers
  const answersText = answers
    .filter((a) => a.answer.trim())
    .map((a) => `Q: ${a.question}\nA: ${a.answer}`)
    .join("\n\n");

  const enrichedInput = answersText
    ? `${originalInput}\n\nAdditional context provided by the user:\n${answersText}`
    : originalInput;

  const { routes, followUpQuestions } = await parseInboxInput(enrichedInput);

  // Update engine log with enriched data
  const supabase = await createClient();
  await supabase
    .from("engine_logs")
    .update({
      details: {
        parsed_result: routes,
        capture_status: "pending",
        original_input: originalInput,
        enrichment_answers: answers,
        follow_up_questions: followUpQuestions,
      },
    })
    .eq("id", captureId);

  return { routes, followUpQuestions };
}

export async function confirmCapture(
  captureId: string,
  routes: ParsedRoute[],
  captureContext?: string
) {
  const results = await executeRoutes(routes, captureContext);

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
        capture_context: captureContext || null,
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
