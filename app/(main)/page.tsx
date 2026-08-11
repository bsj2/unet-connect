"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, ImageIcon } from "lucide-react";
import { StoriesBar } from "@/components/stories-bar";
import { VisualPostCard } from "@/components/visual-post-card";

export default function InstagramFeedPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisualFeed = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) setCurrentUserId(session.user.id);

        const { data, error } = await supabase
          .from("posts")
          .select(
            `
            *,
            users (nombre, apellido, avatar_url),
            comments (id, content, created_at, user_id, parent_id, users(nombre, apellido, avatar_url)),
            reactions (id, user_id)
          `,
          )
          .or("media_urls.neq.{},image_url.not.is.null")
          .is("group_id", null)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setPosts(data || []);
      } catch (error) {
        console.error("Error fetching visual feed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVisualFeed();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20 pt-4">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* section 1: stories */}
        <div className="mb-8">
          <StoriesBar currentUserId={currentUserId} />
        </div>

        <div className="h-px w-full bg-border mb-8" />

        {/* section 2: visual feed */}
        <div className="space-y-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 bg-card border border-border rounded-xl shadow-sm">
              <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h3 className="font-semibold text-foreground">
                There are no visual posts yet
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Follow other users to see their posts here.
              </p>
            </div>
          ) : (
            posts.map(post => (
              <VisualPostCard 
                key={post.id} 
                post={post} 
                currentUserId={currentUserId} 
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
