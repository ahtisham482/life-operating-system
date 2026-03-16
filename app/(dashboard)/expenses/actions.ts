"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ExpenseFormData = {
  item: string;
  amountPkr: number;
  category: string;
  date: string;
  type: string;
  notes: string | null;
};

function revalidateExpensePaths() {
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function createExpense(data: ExpenseFormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    item: data.item,
    amount_pkr: data.amountPkr,
    category: data.category,
    date: data.date,
    type: data.type,
    notes: data.notes || null,
  });
  if (error) throw new Error(error.message);
  revalidateExpensePaths();
}

export async function updateExpense(id: string, data: Partial<ExpenseFormData>) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (data.item !== undefined) patch.item = data.item;
  if (data.amountPkr !== undefined) patch.amount_pkr = data.amountPkr;
  if (data.category !== undefined) patch.category = data.category;
  if (data.date !== undefined) patch.date = data.date;
  if (data.type !== undefined) patch.type = data.type;
  if (data.notes !== undefined) patch.notes = data.notes;

  const { error } = await supabase.from("expenses").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateExpensePaths();
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateExpensePaths();
}
