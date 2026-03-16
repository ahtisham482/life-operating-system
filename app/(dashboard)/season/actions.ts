"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logMirrorSignal } from "@/lib/mirror/signals";

function revalidateSeasonPaths() {
  revalidatePath("/season");
  revalidatePath("/dashboard");
}

export async function createSeason(
  goal: string,
  startDate: string,
  endDate: string,
  leadDomain: string,
  domains: Record<string, string>
) {
  const supabase = await createClient();

  // Deactivate any existing active season
  await supabase
    .from("seasons")
    .update({ is_active: false })
    .eq("is_active", true);

  const { error } = await supabase.from("seasons").insert({
    goal,
    start_date: startDate,
    end_date: endDate,
    lead_domain: leadDomain,
    domains,
    is_active: true,
  });
  if (error) throw new Error(error.message);
  revalidateSeasonPaths();
  logMirrorSignal({
    type: "season_update",
    context: {
      action: "create",
      lead_domain: leadDomain,
      goal_length: goal.length,
      domain_count: Object.keys(domains).length,
    },
  });
}

export async function updateSeason(
  id: string,
  data: {
    goal?: string;
    startDate?: string;
    endDate?: string;
    leadDomain?: string;
    domains?: Record<string, string>;
  }
) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (data.goal !== undefined) patch.goal = data.goal;
  if (data.startDate !== undefined) patch.start_date = data.startDate;
  if (data.endDate !== undefined) patch.end_date = data.endDate;
  if (data.leadDomain !== undefined) patch.lead_domain = data.leadDomain;
  if (data.domains !== undefined) patch.domains = data.domains;

  const { error } = await supabase.from("seasons").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateSeasonPaths();
}

export async function setLeadDomain(
  seasonId: string,
  domainName: string,
  allDomains: Record<string, string>
) {
  const supabase = await createClient();

  // Enforce single-lead: set all domains to maintenance, then set the chosen one as lead
  const updatedDomains: Record<string, string> = {};
  for (const key of Object.keys(allDomains)) {
    updatedDomains[key] = key === domainName ? "lead" : "maintenance";
  }

  const { error } = await supabase
    .from("seasons")
    .update({
      lead_domain: domainName,
      domains: updatedDomains,
    })
    .eq("id", seasonId);
  if (error) throw new Error(error.message);
  revalidateSeasonPaths();
  logMirrorSignal({
    type: "season_update",
    context: {
      action: "set_lead_domain",
      lead_domain: domainName,
    },
  });
}
