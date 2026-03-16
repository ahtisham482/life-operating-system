export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb, getTodayKarachi } from "@/lib/utils";
import { ExpenseForm } from "./expense-form";
import { Badge } from "@/components/ui/badge";
import type { Expense } from "@/lib/db/schema";
import { DeleteExpenseButton } from "./delete-expense-button";

const CATEGORIES = [
  "Food & Drinks",
  "Transport",
  "Bills & Utilities",
  "Shopping",
  "Health",
  "Business",
  "Entertainment",
  "Other",
];

const TYPES = ["Need", "Desire"];

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; type?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("expenses")
    .select("*")
    .order("date", { ascending: false });

  const allExpenses = (rows || []).map((r) => fromDb<Expense>(r));

  // Filter
  const filtered = allExpenses.filter((exp) => {
    if (params.category && exp.category !== params.category) return false;
    if (params.type && exp.type !== params.type) return false;
    return true;
  });

  // Summary stats (computed on all expenses, not filtered)
  const today = getTodayKarachi();
  const currentMonth = today.slice(0, 7); // YYYY-MM

  const todaySpending = allExpenses
    .filter((e) => e.date === today)
    .reduce((sum, e) => sum + Number(e.amountPkr), 0);

  const monthExpenses = allExpenses.filter(
    (e) => e.date.slice(0, 7) === currentMonth
  );
  const monthTotal = monthExpenses.reduce(
    (sum, e) => sum + Number(e.amountPkr),
    0
  );

  const needTotal = monthExpenses
    .filter((e) => e.type === "Need")
    .reduce((sum, e) => sum + Number(e.amountPkr), 0);
  const desireTotal = monthExpenses
    .filter((e) => e.type === "Desire")
    .reduce((sum, e) => sum + Number(e.amountPkr), 0);

  const needPct = monthTotal > 0 ? Math.round((needTotal / monthTotal) * 100) : 0;
  const desirePct = monthTotal > 0 ? Math.round((desireTotal / monthTotal) * 100) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-serif tracking-widest uppercase text-foreground">
            Expenses
          </h1>
          <p className="text-xs font-mono text-muted-foreground tracking-wider">
            {allExpenses.length} total expenses
          </p>
        </div>
        <ExpenseForm />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-border/50 rounded-lg p-4 bg-card/30">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Today
          </p>
          <p className="text-lg font-serif text-foreground mt-1">
            PKR {todaySpending.toLocaleString()}
          </p>
        </div>
        <div className="border border-border/50 rounded-lg p-4 bg-card/30">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            This Month
          </p>
          <p className="text-lg font-serif text-foreground mt-1">
            PKR {monthTotal.toLocaleString()}
          </p>
        </div>
        <div className="border border-border/50 rounded-lg p-4 bg-card/30">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Need vs Desire
          </p>
          <p className="text-sm font-mono text-foreground mt-1">
            <span className="text-primary">{needPct}% Need</span>
            {" / "}
            <span className="text-muted-foreground">{desirePct}% Desire</span>
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {["", ...CATEGORIES].map((c) => (
          <a
            key={c}
            href={c ? `?category=${encodeURIComponent(c)}` : "/expenses"}
            className={`px-3 py-1 rounded text-[10px] font-mono uppercase tracking-widest border transition-colors ${
              (params.category ?? "") === c
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
            }`}
          >
            {c || "All"}
          </a>
        ))}
        <span className="mx-1 text-border">|</span>
        {["", ...TYPES].map((t) => (
          <a
            key={t}
            href={t ? `?type=${encodeURIComponent(t)}` : "/expenses"}
            className={`px-3 py-1 rounded text-[10px] font-mono uppercase tracking-widest border transition-colors ${
              (params.type ?? "") === t
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
            }`}
          >
            {t || "All Types"}
          </a>
        ))}
      </div>

      {/* Expense Table */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground font-mono text-sm border border-border/30 rounded-lg">
          No expenses found. Add your first expense.
        </div>
      ) : (
        <div className="border border-border/50 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-card border-b border-border/50">
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Item
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Amount (PKR)
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Date
                </th>
                <th className="px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((expense, i) => (
                <ExpenseRow key={expense.id} expense={expense} even={i % 2 === 0} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ExpenseRow({ expense, even }: { expense: Expense; even: boolean }) {
  return (
    <tr className={`border-t border-border/30 ${even ? "" : "bg-card/20"}`}>
      <td className="px-4 py-3">
        <span className="font-serif">{expense.item}</span>
        {expense.notes && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {expense.notes}
          </p>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-foreground">
        {Number(expense.amountPkr).toLocaleString()}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {expense.category}
      </td>
      <td className="px-4 py-3">
        <Badge
          variant={expense.type === "Need" ? "default" : "secondary"}
        >
          {expense.type}
        </Badge>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
        {expense.date}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <ExpenseForm expense={expense} />
          <DeleteExpenseButton id={expense.id} />
        </div>
      </td>
    </tr>
  );
}
