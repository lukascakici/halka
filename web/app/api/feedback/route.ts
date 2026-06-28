import { track } from "@vercel/analytics/server";

/**
 * Collect in-app product feedback.
 *
 * - Always records a `feedback` analytics event (rating + path) so responses
 *   show up in the Vercel Analytics dashboard as a summary.
 * - If `FEEDBACK_WEBHOOK_URL` is set, forwards a readable message to it
 *   (Discord/Slack/Tally-style endpoints all accept the `content` field).
 */
export async function POST(req: Request) {
  let body: {
    rating?: unknown;
    message?: unknown;
    contact?: unknown;
    path?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return Response.json({ error: "Rating must be between 1 and 5." }, {
      status: 400,
    });
  }

  const message = String(body.message ?? "").trim().slice(0, 2000);
  const contact = String(body.contact ?? "").trim().slice(0, 200);
  const path = String(body.path ?? "").trim().slice(0, 200);

  // Summary lives in the analytics dashboard.
  try {
    await track("feedback", { rating, hasMessage: message.length > 0, path });
  } catch {
    /* analytics is best-effort */
  }

  // Optional readable feed for the team.
  const webhook = process.env.FEEDBACK_WEBHOOK_URL;
  if (webhook) {
    const content = [
      `Halka feedback — ${rating}/5`,
      message ? `Message: ${message}` : "Message: (none)",
      `Contact: ${contact || "—"}`,
      `Page: ${path || "—"}`,
    ].join("\n");
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content, rating, message, contact, path }),
      });
    } catch {
      /* webhook is best-effort — don't fail the user's submission */
    }
  }

  return Response.json({ ok: true });
}
