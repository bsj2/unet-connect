"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  User,
  Search as SearchIcon,
  FileText,
  Users,
  GraduationCap,
  BookOpen,
  Video,
  Store,
  Play,
  Tag,
  Image as ImageIcon,
  Library,
  UsersIcon,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "@/components/post-card";
import { VisualPostCard } from "@/components/visual-post-card";

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const initialTab = searchParams.get("tab") || "users";

  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [clips, setClips] = useState<any[]>([]);
  const [trade, setTrade] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState(initialTab);

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setUsers([]);
        setPosts([]);
        setGroups([]);
        setClips([]);
        setTrade([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setCurrentUserId(session.user.id);
        }

        const searchTerm = query.trim().replace(/^#/, "");
        const escapedSearchTerm = searchTerm.replace(/[,%()]/g, " ");

        // First find users matching the search term.
        // Their IDs are then used to find posts authored by them.
        const usersRes = await supabase
          .from("users")
          .select("id, nombre, apellido, avatar_url, rol, carrera, semestre")
          .or(
            `nombre.ilike.%${escapedSearchTerm}%,apellido.ilike.%${escapedSearchTerm}%`,
          )
          .limit(20);

        const matchingUserIds = (usersRes.data || []).map((user) => user.id);

        const fetchPosts = async (type: "post" | "VISUAL") => {
          const baseSelect = `
        *,
        users (
          nombre,
          apellido,
          rol,
          email,
          avatar_url
        ),
        comments (
          id,
          content,
          created_at,
          user_id,
          users(nombre, apellido)
        ),
        reactions (
          id,
          user_id
        )
      `;

          // Search by post content
          const contentQuery = supabase
            .from("posts")
            .select(baseSelect)
            .eq("type", type)
            .ilike("content", `%${escapedSearchTerm}%`)
            .order("created_at", { ascending: false })
            .limit(20);

          // Search inside hashtags.
          // Casting to text allows partial searches such as:
          // "math" → ["mathematics", "math", "mathclass"]
          const hashtagQuery = supabase
            .from("posts")
            .select(baseSelect)
            .eq("type", type)
            .filter("hashtags::text", "ilike", `%${escapedSearchTerm}%`)
            .order("created_at", { ascending: false })
            .limit(20);

          const queries = [contentQuery, hashtagQuery];

          if (matchingUserIds.length > 0) {
            queries.push(
              supabase
                .from("posts")
                .select(baseSelect)
                .eq("type", type)
                .in("user_id", matchingUserIds)
                .order("created_at", { ascending: false })
                .limit(20),
            );
          }

          const results = await Promise.all(queries);

          const allPosts = results.flatMap((result) => {
            if (result.error) {
              console.error(`Error searching ${type} posts:`, result.error);
              return [];
            }

            return result.data || [];
          });

          // Remove duplicates because the same post can match
          // content, hashtags, and author.
          const uniquePosts = Array.from(
            new Map(allPosts.map((post) => [post.id, post])).values(),
          );

          return uniquePosts.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );
        };

        const fetchClips = async () => {
          const clipSelect = `
              id, video_url, likes_count, clip_likes(user_id)
            `;

          const queries: any[] = [];

          const contentQuery = supabase
            .from("clips")
            .select(clipSelect)
            .ilike("content", `%${searchTerm}%`)
            .limit(20);

          queries.push(contentQuery);

          if (matchingUserIds.length > 0) {
            queries.push(
              supabase
                .from("clips")
                .select(clipSelect)
                .in("user_id", matchingUserIds)
                .limit(20),
            );
          }

          const results = await Promise.all(queries);
          const allClips = results.flatMap((r) => r.data || []);

          const uniqueClips = Array.from(
            new Map(allClips.map((c: any) => [c.id, c])).values(),
          );

          return uniqueClips;
        };

        const [communityPosts, visualPosts, groupsRes, clipsRes, tradeRes] =
          await Promise.all([
            fetchPosts("post"),
            fetchPosts("VISUAL"),
            supabase
              .from("groups")
              .select("*")
              .ilike("name", `%${escapedSearchTerm}%`)
              .limit(20),
            fetchClips(),
            supabase
              .from("products")
              .select("*, seller:users(id, nombre, apellido, avatar_url)")
              .ilike("title", `%${escapedSearchTerm}%`)
              .eq("status", "AVAILABLE")
              .limit(20),
          ]);

        setUsers(usersRes.data || []);
        setPosts([...communityPosts, ...visualPosts]);
        setGroups(groupsRes.data || []);
        setClips(clipsRes || []);
        setTrade(tradeRes.data || []);
      } catch (error) {
        console.error("Error al buscar:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId);

      if (error) throw error;

      setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const totalResults =
    users.length + posts.length + groups.length + clips.length + trade.length;
  const communityPosts = posts.filter((post) => post.type === "post");
  const visualPosts = posts.filter((post) => post.type === "VISUAL");

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <SearchIcon className="w-6 h-6 text-primary" />
            Search results for &quot;{query}&quot;
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Found {totalResults} {totalResults === 1 ? "result" : "results"}{" "}
            across the network
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-muted/50 p-1 border border-border rounded-lg flex overflow-x-auto hide-scrollbar justify-start sm:grid sm:grid-cols-6 w-full max-w-4xl h-auto">
            <TabsTrigger
              value="users"
              className="flex-shrink-0 flex items-center gap-2 text-xs sm:text-sm py-2 px-3"
            >
              <User size={16} />
              <span>Users ({users.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="community"
              className="flex-shrink-0 flex items-center gap-2 text-xs sm:text-sm py-2 px-3"
            >
              <FileText size={16} />
              <span>Community ({communityPosts.length})</span>
            </TabsTrigger>

            <TabsTrigger
              value="feed"
              className="flex-shrink-0 flex items-center gap-2 text-xs sm:text-sm py-2 px-3"
            >
              <ImageIcon size={16} />
              <span>Feed ({visualPosts.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="clips"
              className="flex-shrink-0 flex items-center gap-2 text-xs sm:text-sm py-2 px-3"
            >
              <Video size={16} />
              <span>Clips ({clips.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="trade"
              className="flex-shrink-0 flex items-center gap-2 text-xs sm:text-sm py-2 px-3"
            >
              <Store size={16} />
              <span>Trade ({trade.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="groups"
              className="flex-shrink-0 flex items-center gap-2 text-xs sm:text-sm py-2 px-3"
            >
              <Users size={16} />
              <span>Groups ({groups.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6 outline-none">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Searching network...
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg">
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <h3 className="font-semibold text-foreground">
                  No users found
                </h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.map((u) => (
                  <Link
                    key={u.id}
                    href={`/profile/${u.id}`}
                    className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:border-primary/50 hover:shadow-md transition-all group"
                  >
                    <div className="w-14 h-14 rounded-full bg-primary flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {u.avatar_url ? (
                        <img
                          src={u.avatar_url}
                          alt={u.nombre}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-bold text-primary-foreground">
                          {u.nombre?.charAt(0)}
                          {u.apellido?.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {u.nombre} {u.apellido}
                      </h3>
                      <p className="text-xs text-muted-foreground font-medium truncate">
                        {u.rol}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                        {u.carrera && (
                          <span className="flex items-center gap-1 truncate max-w-[180px]">
                            <BookOpen size={12} /> {u.carrera}
                          </span>
                        )}
                        {u.semestre && (
                          <span className="flex items-center gap-1">
                            <GraduationCap size={12} /> Sem. {u.semestre}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="community"
            className="mt-6 space-y-4 outline-none max-w-2xl mx-auto"
          >
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Searching community posts...
              </div>
            ) : communityPosts.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <h3 className="font-semibold text-foreground">
                  No community posts found
                </h3>
              </div>
            ) : (
              communityPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId}
                  onDelete={handleDeletePost}
                />
              ))
            )}
          </TabsContent>
          <TabsContent
            value="feed"
            className="mt-6 space-y-8 outline-none max-w-2xl mx-auto"
          >
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Searching visual posts...
              </div>
            ) : visualPosts.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg">
                <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <h3 className="font-semibold text-foreground">
                  No visual posts found
                </h3>
              </div>
            ) : (
              visualPosts.map((post) => (
                <VisualPostCard
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId}
                  onDelete={handleDeletePost}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="clips" className="mt-6 outline-none">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Searching clips...
              </div>
            ) : clips.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg">
                <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <h3 className="font-semibold text-foreground">
                  No clips found
                </h3>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {clips.map((clip) => (
                  <Link
                    key={clip.id}
                    href={`/clips?id=${clip.id}`}
                    className="relative aspect-[9/16] bg-muted cursor-pointer group overflow-hidden rounded-sm md:rounded-lg block"
                  >
                    <video
                      src={clip.video_url}
                      className="w-full h-full object-cover"
                      preload="metadata"
                    />

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Play size={24} className="fill-white" />
                        <span>
                          {clip.clip_likes?.length || clip.likes_count || 0}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="trade" className="mt-6 outline-none">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Searching items...
              </div>
            ) : trade.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg">
                <Store className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <h3 className="font-semibold text-foreground">
                  No items found
                </h3>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {trade.map((product) => (
                  <Link
                    key={product.id}
                    href={`/trade`}
                    className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col group"
                  >
                    <div className="relative aspect-square bg-muted overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Tag className="opacity-20" size={36} />
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <h4 className="font-semibold text-foreground text-sm line-clamp-1 mb-1">
                        {product.title}
                      </h4>
                      <span className="font-bold text-primary text-base">
                        ${product.price}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="groups" className="mt-6 outline-none">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Searching groups...
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <h3 className="font-semibold text-foreground">
                  No groups found
                </h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map((group) => (
                  <Link
                    key={group.id}
                    href={`/groups/${group.id}`}
                    className="flex flex-col p-5 bg-card border border-border rounded-xl shadow-sm hover:border-primary/50 hover:shadow-md transition-all group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                      <Library size={24} />
                    </div>
                    <h3 className="font-bold text-foreground text-lg mb-1 truncate">
                      {group.name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                      {group.description || "No description provided."}
                    </p>
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mt-auto pt-4 border-t border-border/50">
                      <UsersIcon size={14} />
                      <span>
                        {group.group_members?.[0]?.count || 0} members
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-20 text-muted-foreground">
          Loading search...
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
