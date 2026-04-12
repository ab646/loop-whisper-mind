import { supabase } from "@/integrations/supabase/client";

export interface FeedbackPost {
  id: string;
  title: string;
  description: string;
  status: string | null;
  statusLabel: string;
  statusColor: string | null;  // Notion select color: gray, brown, orange, yellow, green, blue, purple, pink, red
  votes: number;
  hasVoted: boolean;
  category: string;
  shippedLink?: string;
  createdAt: string;
}

export type SortMode = "top" | "new";

export async function getFeedbackPosts(sort: SortMode): Promise<FeedbackPost[]> {
  const { data, error } = await supabase.functions.invoke("notion-feedback", {
    body: { action: "query", params: { sort } },
  });
  if (error) throw new Error(error.message || "Failed to fetch feedback posts");
  return data.posts;
}

export async function createFeedbackPost(
  title: string,
  description: string
): Promise<FeedbackPost> {
  const { data, error } = await supabase.functions.invoke("notion-feedback", {
    body: { action: "create", params: { title, description } },
  });
  if (error) throw new Error(error.message || "Failed to create feedback post");
  return data.post;
}

export async function toggleFeedbackVote(
  pageId: string
): Promise<{ votes: number; hasVoted: boolean }> {
  const { data, error } = await supabase.functions.invoke("notion-feedback", {
    body: { action: "vote", params: { pageId } },
  });
  if (error) throw new Error(error.message || "Failed to toggle vote");
  return data;
}
