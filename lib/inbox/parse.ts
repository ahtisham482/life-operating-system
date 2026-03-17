import Groq from "groq-sdk";
import type { ParsedRoute } from "@/lib/db/schema";
import { getTodayKarachi } from "@/lib/utils";

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not configured. Add it to your Vercel Environment Variables and redeploy."
    );
  }
  return new Groq({ apiKey });
}

const SYSTEM_PROMPT = `You are an intelligent intent parser for a Life Operating System. Given a user's natural language input, classify it into one or more modules and extract structured data.

Today's date: {{TODAY}}

Available modules and their data schemas:

1. **tasks** — One-time actions or to-dos
   Data: { "taskName": string, "dueDate": "YYYY-MM-DD" | null, "priority": "🔴 High" | "🟡 Medium" | "🟢 Low" | null, "lifeArea": "💼 Job" | "🚀 Business Building" | "📖 Personal Dev" | "🏠 Home & Life" | null, "type": "✅ Task" }

2. **expenses** — Financial transactions (currency is PKR)
   Data: { "item": string, "amountPkr": number, "category": "Food & Drinks" | "Transport" | "Bills & Utilities" | "Shopping" | "Health" | "Business" | "Entertainment" | "Other", "date": "YYYY-MM-DD", "type": "Need" | "Desire" }

3. **journal** — Emotional reflections, mood entries, thoughts
   Data: { "title": string, "entry": string, "mood": "😊 Good" | "😐 Neutral" | "😔 Low" | "🔥 Fired Up" | "😤 Frustrated", "category": "General" | "Dopamine Reset" | "Financial" | "Work" | "Mindset", "date": "YYYY-MM-DD" }

4. **books** — Book mentions, completions, reading notes
   Data: { "title": string, "status": "Up Next" | "Reading" | "Done", "insight": string | null }

5. **weekly** — Weekly focus areas, priorities, intentions for the current week
   Data: { "leadPriority": string, "maintenanceActions": string | null, "removingPausing": string | null }

6. **season** — Long-term goals (quarterly/90-day), seasonal objectives
   Data: { "goal": string, "leadDomain": "Career & Business" | "Health & Fitness" | "Relationships" | "Finance" | "Learning & Growth" | "Spiritual" }

7. **checkin** — Daily mood/energy check-ins, self-ratings
   Data: { "leadScore": number (1-5), "mood": string, "reflection": string, "blockers": string }

8. **habits** — Recurring behaviors, daily routines, habit tracking
   Data: { "habitDescription": string, "taskName": string, "frequency": "Daily" | "Weekly" | "Monthly", "type": "🔁 Habit" }

Rules:
- A single input can map to MULTIPLE modules (e.g., "Spent $20 on Atomic Habits" → expenses + books)
- For habits, route to tasks with type "🔁 Habit" and recurring=true
- Calculate relative dates (tomorrow, next Saturday, etc.) from today's date
- If the user says "$" assume PKR currency
- Set confidence between 0.0 and 1.0 for each route
- CRITICAL: NEVER return an empty routes array. Always make your best classification, even with low confidence.
- If the input is vague or unclear, still classify with your best guess at lower confidence (0.3-0.5).
- Always include a brief human-readable "summary" for each route

Additionally, ALWAYS generate 2-3 follow-up questions that would help gather more context. These questions should:
- Be specific to the detected intent (NOT generic "tell me more")
- Help extract missing data fields (priority, due date, category, amount, etc.)
- Help the user provide context they'll need later when reviewing the entry
- Examples: "What priority level should this task have?", "When does this need to be done by?", "How much did this cost in PKR?"

Respond with a JSON object:
{
  "routes": [{ "module": string, "confidence": number, "summary": string, "data": object }],
  "followUpQuestions": ["specific question 1", "specific question 2", "specific question 3"]
}`;

export type ParseOutput = {
  routes: ParsedRoute[];
  followUpQuestions: string[];
};

export async function parseInboxInput(rawInput: string): Promise<ParseOutput> {
  const today = getTodayKarachi();
  const prompt = SYSTEM_PROMPT.replace("{{TODAY}}", today);

  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: rawInput },
    ],
    temperature: 0.1,
    max_tokens: 1024,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return {
      routes: [],
      followUpQuestions: [
        "What would you like to capture?",
        "Can you describe what this is about in more detail?",
        "Is this a task, expense, habit, or journal entry?",
      ],
    };
  }

  try {
    const parsed = JSON.parse(content);
    // Handle both { routes: [...] } and [...] formats
    const routes: ParsedRoute[] = Array.isArray(parsed)
      ? parsed
      : parsed.routes ?? parsed.result ?? [];

    const followUpQuestions: string[] =
      parsed.followUpQuestions ??
      parsed.follow_up_questions ??
      parsed.questions ??
      [];

    // Validate and clamp confidence
    const validRoutes = routes
      .filter((r: ParsedRoute) => r.module && r.data && r.summary)
      .map((r: ParsedRoute) => ({
        ...r,
        confidence: Math.max(0, Math.min(1, r.confidence ?? 0.5)),
      }));

    // Ensure we always have follow-up questions
    const finalQuestions =
      followUpQuestions.length > 0
        ? followUpQuestions
        : generateDefaultQuestions(validRoutes);

    return { routes: validRoutes, followUpQuestions: finalQuestions };
  } catch {
    return {
      routes: [],
      followUpQuestions: [
        "What would you like to capture?",
        "Can you provide more details about this?",
        "Is this a task, expense, habit, or journal entry?",
      ],
    };
  }
}

function generateDefaultQuestions(routes: ParsedRoute[]): string[] {
  if (routes.length === 0) {
    return [
      "What would you like to capture?",
      "Can you describe what this is about?",
      "Is this a task, expense, habit, or journal entry?",
    ];
  }

  const questions: string[] = [];
  for (const route of routes) {
    switch (route.module) {
      case "tasks":
        if (!route.data.priority)
          questions.push("What priority level should this task have?");
        if (!route.data.dueDate)
          questions.push("When does this need to be done by?");
        if (!route.data.lifeArea)
          questions.push("Which area of your life does this relate to?");
        break;
      case "expenses":
        if (!route.data.amountPkr)
          questions.push("How much did you spend (in PKR)?");
        if (!route.data.category)
          questions.push("What category is this expense?");
        break;
      case "habits":
        if (!route.data.frequency)
          questions.push("How often should this habit repeat?");
        questions.push("What time of day works best for this habit?");
        break;
      case "journal":
        questions.push("How are you feeling about this?");
        questions.push("What led to this thought or feeling?");
        break;
      default:
        questions.push("Any additional context you'd like to add?");
    }
  }

  questions.push("Any additional details that would be helpful?");
  return questions.slice(0, 3);
}
