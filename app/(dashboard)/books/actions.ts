"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type BookActionFormData = {
  actionItem: string;
  bookName: string;
  status: string;
  phaseNumber: number;
  phaseName: string;
  itemType: string;
  order: number;
  lifeArea: string | null;
  inputNeeded: boolean;
  dependsOn: string | null;
  pageContent: string | null;
};

function revalidateBookPaths() {
  revalidatePath("/books");
}

export async function createBookAction(data: BookActionFormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("book_action_items").insert({
    action_item: data.actionItem,
    book_name: data.bookName,
    status: data.status || "To Do",
    phase_number: data.phaseNumber,
    phase_name: data.phaseName,
    item_type: data.itemType,
    order: data.order,
    life_area: data.lifeArea || null,
    input_needed: data.inputNeeded,
    depends_on: data.dependsOn || null,
    page_content: data.pageContent || null,
  });
  if (error) throw new Error(error.message);
  revalidateBookPaths();
}

export async function updateBookAction(
  id: string,
  data: Partial<BookActionFormData>
) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (data.actionItem !== undefined) patch.action_item = data.actionItem;
  if (data.bookName !== undefined) patch.book_name = data.bookName;
  if (data.status !== undefined) patch.status = data.status;
  if (data.phaseNumber !== undefined) patch.phase_number = data.phaseNumber;
  if (data.phaseName !== undefined) patch.phase_name = data.phaseName;
  if (data.itemType !== undefined) patch.item_type = data.itemType;
  if (data.order !== undefined) patch.order = data.order;
  if (data.lifeArea !== undefined) patch.life_area = data.lifeArea;
  if (data.inputNeeded !== undefined) patch.input_needed = data.inputNeeded;
  if (data.dependsOn !== undefined) patch.depends_on = data.dependsOn;
  if (data.pageContent !== undefined) patch.page_content = data.pageContent;

  const { error } = await supabase
    .from("book_action_items")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateBookPaths();
}

export async function deleteBookAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("book_action_items")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateBookPaths();
}

// ─────────────────────────────────────────
// PRESCRIBED BOOKS
// ─────────────────────────────────────────
export async function cyclePrescribedBookStatus(id: string, currentStatus: string) {
  const next = currentStatus === "unread" ? "reading" : currentStatus === "reading" ? "done" : "unread";
  const supabase = await createClient();
  const { error } = await supabase.from("prescribed_books").update({ status: next }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateBookPaths();
}

// ─────────────────────────────────────────
// CUSTOM BOOKS
// ─────────────────────────────────────────
export async function addCustomBook(title: string, status: string, insight: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("custom_books").insert({
    title,
    status: status || "Up Next",
    insight: insight || null,
  });
  if (error) throw new Error(error.message);
  revalidateBookPaths();
}

export async function deleteCustomBook(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("custom_books").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateBookPaths();
}
