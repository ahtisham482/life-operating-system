import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTodayKarachi } from "@/lib/utils";

const ENGINE_NAME = "Recurring Task Extractor";

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const today = getTodayKarachi();
  let generated = 0;
  const errors: string[] = [];

  try {
    // Fetch all recurring task templates
    const { data: templates, error: fetchError } = await supabase
      .from("tasks")
      .select("*")
      .eq("recurring", true)
      .neq("status", "Done");

    if (fetchError) throw new Error(fetchError.message);
    if (!templates || templates.length === 0) {
      await logRun(supabase, "success", "No recurring templates found.", { generated: 0 });
      return NextResponse.json({ generated: 0 });
    }

    for (const template of templates) {
      try {
        if (!shouldGenerate(template, today)) continue;

        // Create a new task instance from the template
        const { error: insertError } = await supabase.from("tasks").insert({
          task_name: template.task_name,
          status: "To Do",
          priority: template.priority,
          life_area: template.life_area,
          type: template.type,
          due_date: today,
          notes: template.notes,
          recurring: false, // The generated instance is NOT itself recurring
          parent_project_id: template.parent_project_id,
        });

        if (insertError) {
          errors.push(`Failed to create instance for "${template.task_name}": ${insertError.message}`);
          continue;
        }

        // Update last_generated on the template
        await supabase
          .from("tasks")
          .update({ last_generated: today })
          .eq("id", template.id);

        generated++;
      } catch (err) {
        errors.push(`Error processing "${template.task_name}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const status = errors.length > 0 ? "warning" : "success";
    const summary = `Generated ${generated} tasks from ${templates.length} templates.${errors.length > 0 ? ` ${errors.length} errors.` : ""}`;
    await logRun(supabase, status, summary, { generated, errors, templates: templates.length });

    return NextResponse.json({ generated, errors });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logRun(supabase, "error", message, { generated, errors });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function shouldGenerate(template: Record<string, unknown>, today: string): boolean {
  const lastGenerated = template.last_generated as string | null;
  const frequency = template.frequency as string | null;
  const repeatDays = template.repeat_every_days as number | null;

  // Never generated before — generate now
  if (!lastGenerated) return true;

  const lastDate = new Date(lastGenerated);
  const todayDate = new Date(today);
  const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  switch (frequency) {
    case "Daily":
      return diffDays >= 1;
    case "Weekly":
      return diffDays >= 7;
    case "Monthly":
      return diffDays >= 30;
    case "Custom":
      return repeatDays ? diffDays >= repeatDays : diffDays >= 1;
    default:
      return diffDays >= 1;
  }
}

async function logRun(
  supabase: Awaited<ReturnType<typeof createClient>>,
  status: "success" | "warning" | "error",
  summary: string,
  details: Record<string, unknown>
) {
  await supabase.from("engine_logs").insert({
    engine_name: ENGINE_NAME,
    status,
    summary,
    details,
  });
}
