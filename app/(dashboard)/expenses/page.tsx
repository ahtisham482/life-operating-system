export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb, getTodayKarachi } from "@/lib/utils";
import { ExpenseForm } from "./expense-form";
import { QuickExpense } from "./quick-expense";
import { CategoryFilter } from "./category-filter";
import { Badge } from "@/components/ui/badge";
import type { Expense } from "@/lib/db/schema";
import { DeleteExpenseButton } from "./delete-expense-button";

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
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 animate-slide-up" style={{ animationDelay: "0s", animationFillMode: "both" }}>
        <div className="space-y-2 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-serif tracking-tight text-gradient-primary">
            Financial Tracking
          </h1>
          <p className="text-[11px] font-mono text-[#FFF8F0]/30 tracking-wider">
            {allExpenses.length} total expenses
          </p>
        </div>
        <ExpenseForm />
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-[#FF6B6B]/20 to-transparent" />

      {/* Quick Entry */}
      <section className="glass-card rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "0.03s", animationFillMode: "both" }}>
        <p className="text-[9px] font-mono tracking-[0.35em] text-[#FFF8F0]/40 uppercase mb-4">Quick Entry</p>
        <QuickExpense />
      </section>

      {/* Filter bar — single dropdown */}
      <div className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: "0.06s", animationFillMode: "both" }}>
        <label className="text-[9px] font-mono tracking-[0.35em] text-[#FFF8F0]/40 uppercase shrink-0">
          Filter
        </label>
        <CategoryFilter current={params.category || ""} />
      </div>

      {/* Split View: Table + Monthly Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-slide-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
        {/* Left: Expense Table (col-span-3) */}
        <div className="lg:col-span-3">
          {filtered.length === 0 ? (
            <div className="py-16 text-center glass-card rounded-2xl">
              <p className="text-[11px] font-mono text-[#FFF8F0]/25 tracking-widest uppercase">
                No expenses found. Add your first expense.
              </p>
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="bg-[#FFF8F0]/[0.02] border-b border-[#FFF8F0]/[0.04]">
                    <th className="px-5 py-3 text-left text-[9px] font-mono uppercase tracking-[0.25em] text-[#FFF8F0]/25">
                      Item
                    </th>
                    <th className="px-5 py-3 text-left text-[9px] font-mono uppercase tracking-[0.25em] text-[#FFF8F0]/25">
                      Amount
                    </th>
                    <th className="px-5 py-3 text-left text-[9px] font-mono uppercase tracking-[0.25em] text-[#FFF8F0]/25">
                      Category
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

        {/* Right: Monthly Summary (col-span-2) */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-2xl p-6 space-y-6 sticky top-8">
            <p className="text-[9px] font-mono tracking-[0.35em] text-[#FFF8F0]/40 uppercase">
              Monthly Summary
            </p>

            {/* Total Spent */}
            <div className="space-y-1">
              <p className="text-[10px] font-mono text-[#FFF8F0]/25 uppercase tracking-wider">Total Spent</p>
              <p className="text-3xl font-serif text-[#FF6B6B] stat-number">
                PKR {monthTotal.toLocaleString()}
              </p>
              <p className="text-[10px] font-mono text-[#FFF8F0]/20">
                Today: PKR {todaySpending.toLocaleString()}
              </p>
            </div>

            {/* Divider */}
            <div className="h-px bg-[#FFF8F0]/[0.06]" />

            {/* Need vs Desire */}
            <div className="space-y-3">
              <p className="text-[10px] font-mono text-[#FFF8F0]/25 uppercase tracking-wider">Need vs Desire</p>
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-[#FFF8F0]/50">Need</span>
                    <span className="text-[10px] font-mono text-primary/70">{needPct}%</span>
                  </div>
                  <div className="h-2 bg-[#FFF8F0]/[0.05] rounded-full overflow-hidden">
                    <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${needPct}%` }} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-[#FFF8F0]/50">Desire</span>
                    <span className="text-[10px] font-mono text-[#FFF8F0]/40">{desirePct}%</span>
                  </div>
                  <div className="h-2 bg-[#FFF8F0]/[0.05] rounded-full overflow-hidden">
                    <div className="h-full bg-[#FFF8F0]/20 rounded-full transition-all" style={{ width: `${desirePct}%` }} />
                  </div>
                </div>
              </div>

              {desirePct > 30 && (
                <p className="text-[10px] font-mono text-red-400/70 tracking-wider mt-1">
                  Desires at {desirePct}% — above 30% target
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-[#FFF8F0]/[0.06]" />

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[9px] font-mono text-[#FFF8F0]/20 uppercase">Needs</p>
                <p className="text-sm font-mono text-[#FFF8F0]/70 stat-number">PKR {needTotal.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] font-mono text-[#FFF8F0]/20 uppercase">Desires</p>
                <p className="text-sm font-mono text-[#FFF8F0]/70 stat-number">PKR {desireTotal.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpenseRow({ expense }: { expense: Expense }) {
  return (
    <tr className="border-t border-[#FFF8F0]/[0.04] transition-colors hover:bg-[#FFF8F0]/[0.02]">
      <td className="px-5 py-3.5">
        <span className="font-serif text-[#FFF8F0]/90">{expense.item}</span>
        {expense.notes && (
          <p className="text-[10px] text-[#FFF8F0]/25 mt-0.5 line-clamp-1">
            {expense.notes}
          </p>
        )}
        <p className="text-[10px] text-[#FFF8F0]/20 font-mono mt-0.5">{expense.date}</p>
      </td>
      <td className="px-5 py-3.5 font-mono text-[#FFF8F0]/90 stat-number">
        {Number(expense.amountPkr).toLocaleString()}
      </td>
      <td className="px-5 py-3.5">
        <span className="text-[11px] text-[#FFF8F0]/40 whitespace-nowrap block">{expense.category}</span>
        <Badge
          variant={expense.type === "Need" ? "default" : "secondary"}
          className="mt-1"
        >
          {expense.type}
        </Badge>
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
