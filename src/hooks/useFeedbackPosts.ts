import { useState, useEffect, useCallback, useRef } from "react";
import { getFeedbackPosts, FeedbackPost, SortMode } from "@/services/notionFeedbackService";

const CACHE_TTL = 30_000;

interface Cache {
  posts: FeedbackPost[];
  sort: SortMode;
  ts: number;
}

export function useFeedbackPosts() {
  const [posts, setPosts] = useState<FeedbackPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("top");
  const cacheRef = useRef<Cache | null>(null);

  const fetch = useCallback(async (sort: SortMode, force = false) => {
    const cache = cacheRef.current;
    if (!force && cache && cache.sort === sort && Date.now() - cache.ts < CACHE_TTL) {
      setPosts(cache.posts);
      setLoading(false);
      // Background refresh
      getFeedbackPosts(sort).then((fresh) => {
        cacheRef.current = { posts: fresh, sort, ts: Date.now() };
        setPosts(fresh);
      }).catch(() => {});
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getFeedbackPosts(sort);
      cacheRef.current = { posts: data, sort, ts: Date.now() };
      setPosts(data);
    } catch (e: any) {
      setError(e.message || "Failed to load ideas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch(sortMode);
  }, [sortMode, fetch]);

  const refetch = useCallback(() => fetch(sortMode, true), [sortMode, fetch]);

  return { posts, loading, error, sortMode, setSortMode, refetch };
}
