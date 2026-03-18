import { NextRequest, NextResponse } from "next/server";
import {
  getGroqClient,
  HABIT_INTERVIEW_MODEL,
  HABIT_INTERVIEW_SYSTEM_PROMPT,
} from "@/lib/groq";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    const { habitName, messages } = (await req.json()) as {
      habitName: string;
      messages: ChatMessage[];
    };

    const groq = getGroqClient();

    if (!groq) {
      // Fallback: return structured prompts when no API key
      return NextResponse.json({
        fallback: true,
        message: getFallbackPrompt(messages.length),
      });
    }

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

    // Count how many answers the user has given
    const userAnswerCount = messages.filter((m) => m.role === "user").length;

    // Check if the reply contains the final JSON summary
    const jsonMatch = reply.match(/```json\s*([\s\S]*?)\s*```/);

    // Safety net: only accept the profile when the user has answered at least 4 questions
    if (jsonMatch && userAnswerCount >= 4) {
      try {
        const extracted = JSON.parse(jsonMatch[1]);
        return NextResponse.json({
          reply,
          done: true,
          extracted: {
            purpose: extracted.purpose || "",
            identity: extracted.identity || "",
            tinyVersion: extracted.tinyVersion || "",
            anchorText: extracted.anchorText || "",
          },
        });
      } catch {
        // JSON parse failed, treat as normal reply
      }
    }

    // If AI produced JSON too early, strip it and return just the text
    const cleanReply = jsonMatch
      ? reply.replace(/```json[\s\S]*?```/g, "").trim() ||
        "Tell me more about this habit."
      : reply;

    return NextResponse.json({ reply: cleanReply, done: false });
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
