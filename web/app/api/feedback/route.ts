import { track } from "@vercel/analytics/server";

// Google Form that backs the feedback Sheet (responses are readable/exportable
// there — no Vercel Pro needed). These ids aren't secret; they're public form
// field names. Override the form id with GOOGLE_FORM_ID if you fork the form.
const GOOGLE_FORM_ID =
  process.env.GOOGLE_FORM_ID ??
  "1FAIpQLSeMiDsEofWIQyjHxAgJBECJvtIQUq-7tbPaWxeoQNFuUd2n2Q";
const ENTRY = {
  name: "entry.1957471552",
  email: "entry.1759093621",
  wallet: "entry.1892039617",
  rating: "entry.1572784825",
  feedback: "entry.1784582130",
};

/**
 * Collect in-app product feedback.
 *
 * - Records a `feedback` analytics event (rating + path).
 * - Forwards the response to the Google Form so it lands in the linked Sheet,
 *   where it can be read and exported (works on any plan).
 */
export async function POST(req: Request) {
  let body: {
    rating?: unknown;
    message?: unknown;
    contact?: unknown;
    name?: unknown;
    wallet?: unknown;
    path?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return Response.json(
      { error: "Rating must be between 1 and 5." },
      { status: 400 },
    );
  }

  const message = String(body.message ?? "").trim().slice(0, 2000);
  const contact = String(body.contact ?? "").trim().slice(0, 200);
  const name = String(body.name ?? "").trim().slice(0, 120);
  const wallet = String(body.wallet ?? "").trim().slice(0, 80);
  const path = String(body.path ?? "").trim().slice(0, 200);

  try {
    await track("feedback", { rating, hasMessage: message.length > 0, path });
  } catch {
    /* analytics is best-effort */
  }

  // Forward to the Google Form (server-side, so no CORS issues).
  const form = new URLSearchParams();
  form.set(ENTRY.rating, String(rating));
  if (name) form.set(ENTRY.name, name);
  if (contact) form.set(ENTRY.email, contact);
  if (wallet) form.set(ENTRY.wallet, wallet);
  if (message) form.set(ENTRY.feedback, message);
  const formUrl = `https://docs.google.com/forms/d/e/${GOOGLE_FORM_ID}/formResponse`;
  try {
    await fetch(formUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
  } catch {
    /* best-effort — don't fail the user's submission if Google is unreachable */
  }

  // Optional extra sink (Discord/Slack/Telegram-style), if configured.
  const webhook = process.env.FEEDBACK_WEBHOOK_URL;
  if (webhook) {
    const content = [
      `Halka feedback — ${rating}/5`,
      message ? `Message: ${message}` : "Message: (none)",
      `Wallet: ${wallet || "—"}`,
      `Contact: ${contact || "—"}`,
      `Page: ${path || "—"}`,
    ].join("\n");
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content, rating, message, wallet, contact, path }),
      });
    } catch {
      /* best-effort */
    }
  }

  return Response.json({ ok: true });
}
