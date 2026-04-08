import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateRequest, AuthError } from "../_shared/auth.ts";

const LOOPS_API_BASE = "https://app.loops.so/api/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse(req);

  try {
    const { userId } = await authenticateRequest(req);

    const LOOPS_API_KEY = Deno.env.get("LOOPS_API_KEY");
    if (!LOOPS_API_KEY) throw new Error("LOOPS_API_KEY is not configured");

    const { action, ...params } = await req.json();

    const headers = {
      Authorization: `Bearer ${LOOPS_API_KEY}`,
      "Content-Type": "application/json",
    };

    switch (action) {
      // --- Contact Management ---
      case "createContact": {
        const { email, firstName, lastName, properties } = params;
        if (!email) return errorResponse(req, "email is required", 400);

        const response = await fetch(`${LOOPS_API_BASE}/contacts/create`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            email,
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            userId,
            ...properties,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          console.error("Loops createContact error:", response.status, data);
          return errorResponse(req, data.message || "Failed to create contact", response.status);
        }
        return jsonResponse(req, data);
      }

      case "updateContact": {
        const { email, properties } = params;
        if (!email) return errorResponse(req, "email is required", 400);

        const response = await fetch(`${LOOPS_API_BASE}/contacts/update`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ email, ...properties }),
        });

        const data = await response.json();
        if (!response.ok) {
          console.error("Loops updateContact error:", response.status, data);
          return errorResponse(req, data.message || "Failed to update contact", response.status);
        }
        return jsonResponse(req, data);
      }

      // --- Send Event (triggers automation/campaigns) ---
      case "sendEvent": {
        const { email, eventName, eventProperties } = params;
        if (!email || !eventName) return errorResponse(req, "email and eventName are required", 400);

        const response = await fetch(`${LOOPS_API_BASE}/events/send`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            email,
            eventName,
            eventProperties: eventProperties || {},
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          console.error("Loops sendEvent error:", response.status, data);
          return errorResponse(req, data.message || "Failed to send event", response.status);
        }
        return jsonResponse(req, data);
      }

      // --- Send Transactional Email ---
      case "sendTransactional": {
        const { email, transactionalId, dataVariables } = params;
        if (!email || !transactionalId) {
          return errorResponse(req, "email and transactionalId are required", 400);
        }

        const response = await fetch(`${LOOPS_API_BASE}/transactional`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            email,
            transactionalId,
            dataVariables: dataVariables || {},
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          console.error("Loops sendTransactional error:", response.status, data);
          return errorResponse(req, data.message || "Failed to send transactional email", response.status);
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
    console.error("loops error:", e);
    return errorResponse(req, e instanceof Error ? e.message : "Unknown error");
  }
});
