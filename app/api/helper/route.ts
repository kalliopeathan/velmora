import { GoogleGenAI } from "@google/genai";
import { MAX_MESSAGE_LENGTH, UNAVAILABLE_TEXT, runHelper } from "@/lib/helper";

// Server only: the key never reaches the browser.
function client(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  return apiKey ? new GoogleGenAI({ apiKey }) : null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send JSON: {\"message\": string}." }, { status: 400 });
  }

  const raw = (body as { message?: unknown } | null)?.message;
  const message = typeof raw === "string" ? raw.trim() : "";
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return Response.json(
      { error: `message must be 1 to ${MAX_MESSAGE_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const ai = client();
  if (!ai) return Response.json({ type: "message", text: UNAVAILABLE_TEXT }, { status: 503 });

  try {
    return Response.json(await runHelper(ai, message));
  } catch {
    // Extract call failed (API error, rate limit, timeout): no shortlist to fall back to.
    return Response.json({ type: "message", text: UNAVAILABLE_TEXT }, { status: 503 });
  }
}
