import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ exists: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    // Use a direct query approach - check profiles table
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("user_id", (
        await supabaseAdmin.rpc("get_user_id_by_email", { lookup_email: email.toLowerCase() })
      ).data)
      .maybeSingle();

    // Simpler: just try to find user by listing with filter
    // Supabase admin API doesn't have getUserByEmail in all versions
    // Let's use a pragmatic approach
    const { count } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Actually the simplest reliable way:
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const exists = users?.users?.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    ) ?? false;

    return new Response(JSON.stringify({ exists }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ exists: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
