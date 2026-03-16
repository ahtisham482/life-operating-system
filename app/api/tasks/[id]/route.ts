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

// GET /api/tasks/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await requireAuth();
    const { id } = await params;
    const { data: task, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !task) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: fromDb<Task>(task) });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/tasks/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.taskName !== undefined) patch.task_name = body.taskName;
    if (body.status !== undefined) patch.status = body.status;
    if (body.priority !== undefined) patch.priority = body.priority;
    if (body.lifeArea !== undefined) patch.life_area = body.lifeArea;
    if (body.type !== undefined) patch.type = body.type;
    if (body.dueDate !== undefined) patch.due_date = body.dueDate;
    if (body.notes !== undefined) patch.notes = body.notes;
    if (body.recurring !== undefined) patch.recurring = body.recurring;
    if (body.frequency !== undefined) patch.frequency = body.frequency;
    if (body.repeatEveryDays !== undefined) patch.repeat_every_days = body.repeatEveryDays;

    const { data: updated, error } = await supabase
      .from("tasks")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error || !updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: fromDb<Task>(updated) });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/tasks/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await requireAuth();
    const { id } = await params;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
