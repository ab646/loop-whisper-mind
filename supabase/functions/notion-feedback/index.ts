import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateRequest, AuthError } from "../_shared/auth.ts";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse(req);

  try {
    const NOTION_API_KEY = Deno.env.get("NOTION_API_KEY");
    const DB_ID = Deno.env.get("NOTION_FEEDBACK_DB_ID");
    if (!NOTION_API_KEY || !DB_ID) {
      throw new Error("Notion environment variables are not configured");
    }

    const { userId, adminClient } = await authenticateRequest(req);

    // Get user info from auth
    const { data: { user }, error: userError } = await adminClient.auth.admin.getUserById(userId);
    if (userError || !user) throw new AuthError("Could not fetch user", 401);

    const userEmail = user.email || "";
    const userName = user.user_metadata?.display_name || user.user_metadata?.full_name || "Anonymous";

    const notionHeaders = {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    };

    const { action, params } = await req.json();

    switch (action) {
      case "query": {
        const { sort = "top" } = params || {};
        const sorts = sort === "new"
          ? [{ property: "Created", direction: "descending" }]
          : [{ property: "Votes", direction: "descending" }];

        const response = await fetch(`${NOTION_API}/databases/${DB_ID}/query`, {
          method: "POST",
          headers: notionHeaders,
          body: JSON.stringify({
            sorts,
            filter: {
              property: "Status",
              select: { does_not_equal: "Closed" },
            },
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          console.error("Notion query error:", response.status, err);
          return errorResponse(req, "Failed to fetch feedback posts", response.status);
        }

        const data = await response.json();
        const posts = data.results.map((page: any) => mapNotionPage(page, userId));
        return jsonResponse(req, { posts });
      }

      case "create": {
        const { title, description } = params || {};
        if (!title || typeof title !== "string" || title.trim().length < 3) {
          return errorResponse(req, "Title must be at least 3 characters", 400);
        }
        if (title.length > 120) {
          return errorResponse(req, "Title must be 120 characters or less", 400);
        }
        if (description && description.length > 500) {
          return errorResponse(req, "Description must be 500 characters or less", 400);
        }

        const now = new Date().toISOString().split("T")[0];
        const response = await fetch(`${NOTION_API}/pages`, {
          method: "POST",
          headers: notionHeaders,
          body: JSON.stringify({
            parent: { database_id: DB_ID },
            properties: {
              Title: { title: [{ text: { content: title.trim() } }] },
              Description: { rich_text: [{ text: { content: (description || "").trim() } }] },
              Status: { select: { name: "Open" } },
              Votes: { number: 1 },
              Voters: { rich_text: [{ text: { content: userId } }] },
              "Author Name": { rich_text: [{ text: { content: userName } }] },
              "Author Email": { email: userEmail },
              "Author ID": { rich_text: [{ text: { content: userId } }] },
              Category: { select: { name: "Feature" } },
              Created: { date: { start: now } },
            },
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          console.error("Notion create error:", response.status, err);
          return errorResponse(req, "Failed to create feedback post", response.status);
        }

        const page = await response.json();
        return jsonResponse(req, { post: mapNotionPage(page, userId) });
      }

      case "vote": {
        const { pageId } = params || {};
        if (!pageId) return errorResponse(req, "pageId is required", 400);

        // Read current page
        const getResp = await fetch(`${NOTION_API}/pages/${pageId}`, {
          method: "GET",
          headers: notionHeaders,
        });
        if (!getResp.ok) {
          return errorResponse(req, "Failed to fetch post for voting", getResp.status);
        }

        const page = await getResp.json();
        const votersStr = page.properties?.Voters?.rich_text?.[0]?.text?.content || "";
        const currentVotes = page.properties?.Votes?.number || 0;
        const voters = votersStr ? votersStr.split(",").map((v: string) => v.trim()).filter(Boolean) : [];

        const hasVoted = voters.includes(userId);
        let newVoters: string[];
        let newVotes: number;

        if (hasVoted) {
          newVoters = voters.filter((v: string) => v !== userId);
          newVotes = Math.max(0, currentVotes - 1);
        } else {
          newVoters = [...voters, userId];
          newVotes = currentVotes + 1;
        }

        const patchResp = await fetch(`${NOTION_API}/pages/${pageId}`, {
          method: "PATCH",
          headers: notionHeaders,
          body: JSON.stringify({
            properties: {
              Voters: { rich_text: [{ text: { content: newVoters.join(",") } }] },
              Votes: { number: newVotes },
            },
          }),
        });

        if (!patchResp.ok) {
          const err = await patchResp.text();
          console.error("Notion vote error:", patchResp.status, err);
          return errorResponse(req, "Failed to update vote", patchResp.status);
        }

        return jsonResponse(req, { votes: newVotes, hasVoted: !hasVoted });
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
    console.error("notion-feedback error:", e);
    return errorResponse(req, e instanceof Error ? e.message : "Unknown error");
  }
});

function mapNotionPage(page: any, userId: string) {
  const props = page.properties || {};
  const title = props.Title?.title?.[0]?.text?.content || "";
  const description = props.Description?.rich_text?.[0]?.text?.content || "";
  const status = props.Status?.select?.name || "Open";
  const votes = props.Votes?.number || 0;
  const votersStr = props.Voters?.rich_text?.[0]?.text?.content || "";
  const voters = votersStr ? votersStr.split(",").map((v: string) => v.trim()).filter(Boolean) : [];
  const authorName = props["Author Name"]?.rich_text?.[0]?.text?.content || "Anonymous";
  const category = props.Category?.select?.name || "Feature";
  const shippedLink = props["Shipped Link"]?.url || undefined;
  const createdAt = props.Created?.date?.start || page.created_time || "";

  const STATUS_LABELS: Record<string, string> = {
    Open: "Open",
    "Under Review": "Reviewing",
    Planned: "Planned",
    "In Progress": "Building",
    Shipped: "Shipped",
    Closed: "Closed",
  };

  return {
    id: page.id,
    title,
    description,
    status: status.toLowerCase().replace(/ /g, "_"),
    statusLabel: STATUS_LABELS[status] || status,
    votes,
    hasVoted: voters.includes(userId),
    authorName,
    category,
    shippedLink,
    createdAt,
  };
}
