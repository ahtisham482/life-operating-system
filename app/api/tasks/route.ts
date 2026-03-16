import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq, ne, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

// GET /api/tasks
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const lifeArea = searchParams.get("lifeArea");
    const excludeDone = searchParams.get("excludeDone") === "true";

    let result = await db.select().from(tasks).orderBy(tasks.createdAt);

    if (status) result = result.filter((t) => t.status === status);
    if (lifeArea) result = result.filter((t) => t.lifeArea === lifeArea);
    if (excludeDone) result = result.filter((t) => t.status !== "Done");

    return NextResponse.json({ data: result });
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
    await requireAuth();
    const body = await request.json();

    if (!body.taskName || typeof body.taskName !== "string") {
      return NextResponse.json({ error: "taskName is required" }, { status: 400 });
    }

    const [created] = await db
      .insert(tasks)
      .values({
        taskName: body.taskName,
        status: body.status ?? "To Do",
        priority: body.priority ?? undefined,
        lifeArea: body.lifeArea ?? undefined,
        type: body.type ?? undefined,
        dueDate: body.dueDate ?? undefined,
        notes: body.notes ?? undefined,
        recurring: body.recurring ?? false,
        frequency: body.frequency ?? undefined,
        repeatEveryDays: body.repeatEveryDays ?? undefined,
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/tasks", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
