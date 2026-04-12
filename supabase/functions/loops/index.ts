/**
 * @deprecated This function has been replaced by the `resend` edge function.
 * Returns 410 Gone for any in-flight requests.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(() =>
  new Response(
    JSON.stringify({ error: "This function is deprecated. Use the `resend` function instead." }),
    { status: 410, headers: { "Content-Type": "application/json" } }
  )
);
