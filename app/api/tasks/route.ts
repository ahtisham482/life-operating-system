import { fromDb } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Task } from "@/lib/db/schema";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { user, supabase };
}

// GET /api/tasks
export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const lifeArea = searchParams.get("lifeArea");
    const excludeDone = searchParams.get("excludeDone") === "true";

    let query = supabase.from("tasks").select("*").order("created_at", { ascending: true });
    if (status) query = query.eq("status", status);
    if (lifeArea) query = query.eq("life_area", lifeArea);
    if (excludeDone) query = query.neq("status", "Done");

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data: (data || []).map((r) => fromDb<Task>(r)) });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/tasks", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/tasks
export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireAuth();
    const body = await request.json();

    if (!body.taskName || typeof body.taskName !== "string") {
      return NextResponse.json({ error: "taskName is required" }, { status: 400 });
    }

    const { data: created, error } = await supabase
      .from("tasks")
      .insert({
        task_name: body.taskName,
        status: body.status ?? "To Do",
        priority: body.priority ?? null,
        life_area: body.lifeArea ?? null,
        type: body.type ?? null,
        due_date: body.dueDate ?? null,
        notes: body.notes ?? null,
        recurring: body.recurring ?? false,
        frequency: body.frequency ?? null,
        repeat_every_days: body.repeatEveryDays ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data: fromDb<Task>(created) }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/tasks", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
