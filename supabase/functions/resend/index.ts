/**
 * Resend Edge Function
 *
 * Handles all Resend API interactions:
 *   - createContact  → add/upsert contact in Resend Audience
 *   - updateContact  → update contact subscription status
 *   - sendEmail      → send a transactional email
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateRequest, AuthError } from "../_shared/auth.ts";

const RESEND_API = "https://api.resend.com";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse(req);

  try {
    await authenticateRequest(req);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const { action, ...params } = await req.json();

    const headers = {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    };

    switch (action) {
      case "createContact": {
        const { email, firstName, lastName, unsubscribed = false } = params;
        if (!email) return errorResponse(req, "email is required", 400);

        const response = await fetch(`${RESEND_API}/contacts`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            email,
            first_name: firstName || undefined,
            last_name: lastName || undefined,
            unsubscribed,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          console.error("resend createContact error:", response.status, data);
          return errorResponse(req, data.message || data.name || "Failed to create contact", response.status);
        }
        return jsonResponse(req, data);
      }

      case "updateContact": {
        const { email, unsubscribed } = params;
        if (!email) return errorResponse(req, "email is required", 400);

        const response = await fetch(`${RESEND_API}/contacts`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            email,
            unsubscribed: unsubscribed ?? false,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          console.error("resend updateContact error:", response.status, data);
          return errorResponse(req, data.message || "Failed to update contact", response.status);
        }
        return jsonResponse(req, data);
      }

      case "sendEmail": {
        const { to, subject, html, text } = params;
        if (!to || !subject || !html) {
          return errorResponse(req, "to, subject, and html are required", 400);
        }

        const response = await fetch(`${RESEND_API}/emails`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            from: "Loop Mind <hi@loopmind.care>",
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
            text: text || undefined,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          console.error("resend sendEmail error:", response.status, data);
          return errorResponse(req, data.message || data.name || "Failed to send email", response.status);
        }
        return jsonResponse(req, data);
      }

      default:
        return errorResponse(req, `Unknown action: ${action}`, 400);
    }
  } catch (e) {
    if (e instanceof AuthError) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: e.status,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
    console.error("resend function error:", e);
    return errorResponse(req, e instanceof Error ? e.message : "Unknown error");
  }
});
