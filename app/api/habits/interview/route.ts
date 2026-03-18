import { NextRequest, NextResponse } from "next/server";
import {
  getGroqClient,
  HABIT_INTERVIEW_MODEL,
  HABIT_INTERVIEW_SYSTEM_PROMPT,
  HABIT_FINALIZE_PROMPT,
} from "@/lib/groq";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    const { habitName, messages, finalize } = (await req.json()) as {
      habitName: string;
      messages: ChatMessage[];
      finalize?: boolean;
    };

    const groq = getGroqClient();

    if (!groq) {
      // Fallback: return structured prompts when no API key
      if (finalize) {
        return NextResponse.json({
          fallback: true,
          finalize: true,
        });
      }
      return NextResponse.json({
        fallback: true,
        message: getFallbackPrompt(messages.length),
      });
    }

    if (finalize) {
      // User pressed "Done" — ask AI to produce the final summary
      const completion = await groq.chat.completions.create({
        model: HABIT_INTERVIEW_MODEL,
        messages: [
          {
            role: "system",
            content: `${HABIT_INTERVIEW_SYSTEM_PROMPT}\n\nThe user wants to build the habit: "${habitName}"`,
          },
          ...messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          {
            role: "system",
            content: HABIT_FINALIZE_PROMPT,
          },
        ],
        temperature: 0.5,
        max_tokens: 600,
      });

      const reply = completion.choices[0]?.message?.content || "";
      const jsonMatch = reply.match(/```json\s*([\s\S]*?)\s*```/);

      if (jsonMatch) {
        try {
          const extracted = JSON.parse(jsonMatch[1]);
          return NextResponse.json({
            done: true,
            extracted: {
              purpose: extracted.purpose || "",
              identity: extracted.identity || "",
              tinyVersion: extracted.tinyVersion || "",
              anchorText: extracted.anchorText || "",
            },
          });
        } catch {
          // JSON parse failed
        }
      }

      // Fallback: couldn't extract — return error
      return NextResponse.json({
        done: false,
        reply:
          "I had trouble creating your profile. Let me keep asking — tell me more about why this habit matters to you.",
      });
    }

    // Normal conversation mode — just keep chatting
    const systemPrompt = `${HABIT_INTERVIEW_SYSTEM_PROMPT}\n\nThe user wants to build the habit: "${habitName}"`;

    const completion = await groq.chat.completions.create({
      model: HABIT_INTERVIEW_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const reply = completion.choices[0]?.message?.content || "";

    // Strip any JSON the AI might produce (it shouldn't, but safety net)
    const cleanReply = reply.replace(/```json[\s\S]*?```/g, "").trim();

    return NextResponse.json({
      reply: cleanReply || "Tell me more about this habit.",
      done: false,
    });
  } catch (error) {
    console.error("Habit interview API error:", error);
    return NextResponse.json(
      { error: "Failed to get AI response" },
      { status: 500 },
    );
  }
}

function getFallbackPrompt(messageCount: number): string {
  const prompts = [
    "Why is this habit important to you? What will change in your life if you do this consistently?",
    "What kind of person do you want to become through this habit? Complete this: 'I am the type of person who...'",
    "What's the absolute smallest version of this habit you could do in just 2 minutes?",
    "When in your daily routine will you do this? Think of an anchor: 'After I ___, I will...'",
  ];
  return prompts[Math.min(messageCount, prompts.length - 1)];
}
