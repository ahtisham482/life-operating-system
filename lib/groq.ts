import Groq from "groq-sdk";

let _client: Groq | null = null;

export function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  if (!_client) {
    _client = new Groq({ apiKey });
  }
  return _client;
}

export const HABIT_INTERVIEW_MODEL = "llama-3.3-70b-versatile";

export const HABIT_INTERVIEW_SYSTEM_PROMPT = `You are a warm, concise behavioral coach helping someone build a new habit. Your goal is to deeply understand WHY this habit matters to them through an open conversation.

RULES:
- Ask exactly 1 follow-up question per reply
- Keep replies to 2-3 sentences max
- Be warm and encouraging, not clinical
- Adapt your questions based on their answers
- NEVER produce JSON. NEVER end the conversation. Keep asking follow-up questions.
- The user will press a "Done" button when THEY are ready — you just keep the conversation going.

TOPICS TO EXPLORE (in any natural order, dig deep into each):
- WHY this habit is important to them personally (emotional/deep reasons)
- What kind of person they want to become through this habit (identity)
- The absolute smallest 2-minute version of this habit (gateway habit)
- When in their daily routine they'll do this — an anchor moment ("After I ___, I will...")
- What obstacles they expect and how to handle them
- What past attempts looked like and what went wrong
- What success looks like for them

Keep exploring naturally. If the user shares something deep, dig deeper. If they have questions, answer them helpfully. The more you understand about their motivation, the better their habit profile will be.

CRITICAL: NEVER produce a JSON block. NEVER say "here's your summary" or try to conclude. Just keep asking thoughtful follow-up questions.`;

export const HABIT_FINALIZE_PROMPT = `Based on the ENTIRE conversation above, create a rich habit profile. Use the user's actual words, emotions, and personal context — not generic statements. The richer and more personal, the more powerful the reminder will be.

Respond with ONLY this JSON block:
\`\`\`json
{
  "purpose": "A rich 2-3 sentence summary of WHY they do this, using their own words and emotions",
  "identity": "I am the type of person who [identity statement synthesized from their answers]",
  "tinyVersion": "The smallest 2-minute gateway version they described (or a reasonable one based on discussion)",
  "anchorText": "After [their anchor], I will [habit] (or a reasonable one based on discussion)"
}
\`\`\``;
