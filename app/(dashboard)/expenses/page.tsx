export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb, getTodayKarachi } from "@/lib/utils";
import { ExpenseForm } from "./expense-form";
import { QuickExpense } from "./quick-expense";
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
  "Sadqa / Charity",
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

  const filtered = allExpenses.filter((exp) => {
    if (params.category && exp.category !== params.category) return false;
    if (params.type && exp.type !== params.type) return false;
    return true;
  });

  const today = getTodayKarachi();
  const currentMonth = today.slice(0, 7);

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
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between animate-slide-up" style={{ animationDelay: "0s", animationFillMode: "both" }}>
        <div className="space-y-2">
          <p className="text-[9px] font-mono tracking-[0.35em] text-white/20 uppercase">
            Financial Tracking
          </p>
          <h1 className="text-3xl font-serif tracking-tight text-gradient-primary">
            Expenses
          </h1>
          <p className="text-[11px] font-mono text-white/30 tracking-wider">
            {allExpenses.length} total expenses
          </p>
        </div>
        <ExpenseForm />
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-[#C49E45]/20 to-transparent" />

      {/* Quick Entry */}
      <section className="glass-card rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "0.03s", animationFillMode: "both" }}>
        <p className="text-[9px] font-mono tracking-[0.35em] text-white/40 uppercase mb-4">Quick Entry</p>
        <QuickExpense />
      </section>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: "0.05s", animationFillMode: "both" }}>
        <div className="glass-card rounded-2xl p-6 hover:border-white/[0.08] transition-all">
          <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">
            Today
          </p>
          <p className="text-xl font-serif text-white/90 mt-2 stat-number">
            PKR {todaySpending.toLocaleString()}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-6 hover:border-white/[0.08] transition-all">
          <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">
            This Month
          </p>
          <p className="text-xl font-serif text-white/90 mt-2 stat-number">
            PKR {monthTotal.toLocaleString()}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-6 hover:border-white/[0.08] transition-all">
          <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">
            Need vs Desire
          </p>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full bg-primary/60 rounded-full" style={{ width: `${needPct}%` }} />
              </div>
              <span className="text-[10px] font-mono text-primary/70 w-8 text-right">{needPct}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full bg-white/20 rounded-full" style={{ width: `${desirePct}%` }} />
              </div>
              <span className="text-[10px] font-mono text-white/40 w-8 text-right">{desirePct}%</span>
            </div>
            {desirePct > 30 && (
              <p className="text-[9px] font-mono text-red-400/70 mt-2 tracking-wider">
                Desires at {desirePct}% — above 30% target
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-1.5 flex-wrap animate-slide-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
        {["", ...CATEGORIES].map((c) => (
          <a
            key={c}
            href={c ? `?category=${encodeURIComponent(c)}` : "/expenses"}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest border transition-all ${
              (params.category ?? "") === c
                ? "border-[#C49E45]/20 bg-[#C49E45]/[0.08] text-[#C49E45]"
                : "border-white/[0.05] text-white/40 hover:text-white/90 hover:border-white/[0.08]"
            }`}
          >
            {c || "All"}
          </a>
        ))}
        <span className="mx-1 text-white/[0.05] self-center">|</span>
        {["", ...TYPES].map((t) => (
          <a
            key={t}
            href={t ? `?type=${encodeURIComponent(t)}` : "/expenses"}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest border transition-all ${
              (params.type ?? "") === t
                ? "border-[#C49E45]/20 bg-[#C49E45]/[0.08] text-[#C49E45]"
                : "border-white/[0.05] text-white/40 hover:text-white/90 hover:border-white/[0.08]"
            }`}
          >
            {t || "All Types"}
          </a>
        ))}
      </div>

      {/* Expense Table */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center glass-card rounded-2xl">
          <p className="text-[11px] font-mono text-white/25 tracking-widest uppercase">
            No expenses found. Add your first expense.
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/[0.04]">
                <th className="px-5 py-3 text-left text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">
                  Item
                </th>
                <th className="px-5 py-3 text-left text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">
                  Amount (PKR)
                </th>
                <th className="px-5 py-3 text-left text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">
                  Category
                </th>
                <th className="px-5 py-3 text-left text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">
                  Type
                </th>
                <th className="px-5 py-3 text-left text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">
                  Date
                </th>
                <th className="px-5 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((expense) => (
                <ExpenseRow key={expense.id} expense={expense} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ExpenseRow({ expense }: { expense: Expense }) {
  return (
    <tr className="border-t border-white/[0.04] transition-colors hover:bg-white/[0.02]">
      <td className="px-5 py-3.5">
        <span className="font-serif text-white/90">{expense.item}</span>
        {expense.notes && (
          <p className="text-[10px] text-white/25 mt-0.5 line-clamp-1">
            {expense.notes}
          </p>
        )}
      </td>
      <td className="px-5 py-3.5 font-mono text-white/90 stat-number">
        {Number(expense.amountPkr).toLocaleString()}
      </td>
      <td className="px-5 py-3.5 text-[11px] text-white/40 whitespace-nowrap">
        {expense.category}
      </td>
      <td className="px-5 py-3.5">
        <Badge
          variant={expense.type === "Need" ? "default" : "secondary"}
        >
          {expense.type}
        </Badge>
      </td>
      <td className="px-5 py-3.5 text-[11px] text-white/25 font-mono">
        {expense.date}
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1 justify-end">
          <ExpenseForm expense={expense} />
          <DeleteExpenseButton id={expense.id} />
        </div>
      </td>
    </tr>
  );
}
