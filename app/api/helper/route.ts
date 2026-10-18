import { GoogleGenAI } from "@google/genai";
import { UNAVAILABLE_TEXT } from "@/lib/copy";
import {
  MAX_MESSAGE_LENGTH,
  logModelError,
  runHelper,
  runStructured,
  type HelperFields,
} from "@/lib/helper";

// Server only: the key never reaches the browser.
function client(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  return apiKey ? new GoogleGenAI({ apiKey }) : null;
}

const BODY_ERROR = 'Send JSON: {"message": string} or {"fields": {occasion, event_date, size, country}}.';
const FIELD_NAMES = ["occasion", "event_date", "size", "country"] as const;

/** Each field a string or null/absent; anything else is a bad request. */
function parseFields(raw: unknown): HelperFields | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const fields = {} as HelperFields;
  for (const name of FIELD_NAMES) {
    const value = r[name] ?? null;
    if (value !== null && typeof value !== "string") return null;
    fields[name] = value;
  }
  return fields;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: BODY_ERROR }, { status: 400 });
  }

  // Structured path: code only, no model, so it works without Gemini.
  if (body && typeof body === "object" && "fields" in body) {
    const fields = parseFields((body as { fields: unknown }).fields);
    if (!fields) return Response.json({ error: BODY_ERROR }, { status: 400 });
    return Response.json(runStructured(fields));
  }

  const raw = (body as { message?: unknown } | null)?.message;
  const message = typeof raw === "string" ? raw.trim() : "";
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return Response.json(
      { error: `message must be 1 to ${MAX_MESSAGE_LENGTH} characters.` },
      { status: 400 },
    );
  }

  // 503, not 500: the client reads it as "use the list form", which needs no model.
  const ai = client();
  if (!ai) return Response.json({ type: "message", text: UNAVAILABLE_TEXT }, { status: 503 });

  try {
    return Response.json(await runHelper(ai, message));
  } catch (error) {
    // Extract call failed (API error, rate limit, timeout): no shortlist to fall back to.
    logModelError("extract", error, message);
    return Response.json({ type: "message", text: UNAVAILABLE_TEXT }, { status: 503 });
  }
}
