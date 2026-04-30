import { NextRequest, NextResponse } from "next/server";
import { buildLessonPrompt, fallbackLesson, UserProfile } from "../../../lib/prompts";

function extractText(data: any): string {
  if (typeof data?.output_text === "string") return data.output_text;
  const parts: string[] = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string") parts.push(content.text);
    }
  }
  return parts.join("\n");
}

function safeJsonParse(text: string) {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("JSON object not found");
  return JSON.parse(cleaned.slice(first, last + 1));
}

function validateLesson(lesson: any) {
  if (!lesson || !Array.isArray(lesson.questions) || lesson.questions.length !== 5) {
    throw new Error("Invalid lesson shape");
  }
  lesson.questions.forEach((q: any) => {
    if (!q.q || !Array.isArray(q.options) || q.options.length !== 3 || ![0, 1, 2].includes(q.answer)) {
      throw new Error("Invalid question shape");
    }
  });
  return lesson;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const profile = (body.profile || { exp: 0, sessions: [], weak: {} }) as UserProfile;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ lesson: fallbackLesson, source: "fallback", warning: "OPENAI_API_KEY is not set." });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.2",
        input: buildLessonPrompt(profile),
        temperature: 0.4,
        max_output_tokens: 2500,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json({ lesson: fallbackLesson, source: "fallback", warning: detail }, { status: 200 });
    }

    const data = await response.json();
    const text = extractText(data);
    const lesson = validateLesson(safeJsonParse(text));
    return NextResponse.json({ lesson, source: "openai" });
  } catch (error: any) {
    return NextResponse.json({ lesson: fallbackLesson, source: "fallback", warning: error?.message || "Unknown error" }, { status: 200 });
  }
}
