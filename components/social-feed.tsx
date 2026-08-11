'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PostCard } from '@/components/post-card'
import { CreatePostCard } from '@/components/create-post-card'
import { Loader2, Library, Users, Hash, Compass } from 'lucide-react'
import Link from 'next/link'

export function SocialFeed() {
  const [posts, setPosts] = useState<any[]>([])
  const [joinedGroups, setJoinedGroups] = useState<any[]>([])
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null) // null = 'All Communities'
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(false)

  // 1. Initial Load: Get User and their Joined Groups
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          setLoading(false)
          return
        }
        
        const userId = session.user.id
        setCurrentUserId(userId)

        // Fetch groups where the user is a member
        const { data: memberData, error: memberError } = await supabase
          .from('group_members')
          .select('group_id, groups(id, name, avatar_url)')
          .eq('user_id', userId)

        if (memberError) throw memberError

        // Clean up the data structure
        const myGroups = memberData?.map(m => m.groups).filter(Boolean) || []
        setJoinedGroups(myGroups)

      } catch (error) {
        console.error("Error fetching initial data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [])

  // 2. Fetch Posts whenever the active group changes
  const fetchPosts = async () => {
    if (!currentUserId) return
    setLoadingPosts(true)

    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          users (nombre, apellido, rol, email, avatar_url),
          groups (id, name),
          comments (id, content, created_at, user_id, parent_id, users(nombre, apellido)),
          reactions (id, user_id)
        `)
        .order('created_at', { ascending: false })

      if (activeGroupId) {
        // Fetch posts for the specific selected group
        query = query.eq('group_id', activeGroupId)
      } else {
        // Fetch posts for ALL joined groups
        const myGroupIds = joinedGroups.map(g => g.id)
        if (myGroupIds.length > 0) {
          query = query.in('group_id', myGroupIds)
        } else {
          // If the user hasn't joined any groups, force an empty result safely
          query = query.eq('group_id', '00000000-0000-0000-0000-000000000000') 
        }
      }

      const { data, error } = await query
      if (error) throw error
      
      setPosts(data || [])
    } catch (error) {
      console.error("Error fetching posts:", error)
    } finally {
      setLoadingPosts(false)
    }
  }

  // Re-run post fetch when activeGroupId or joinedGroups change
  useEffect(() => {
    if (!loading) {
      fetchPosts()
    }
  }, [activeGroupId, joinedGroups, loading])

  const handleDeletePost = async (postId: string) => {
    try {
      await supabase.from('posts').delete().eq('id', postId)
      setPosts(posts.filter(p => p.id !== postId))
    } catch (error) {
      console.error(error)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  const activeGroup = joinedGroups.find(g => g.id === activeGroupId)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* LEFT COLUMN / TOP COLUMN ON MOBILE: Communities Navigation */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="sticky top-20 bg-card border border-border rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-2">
              Your Communities
            </h2>
            
            <div className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 hide-scrollbar">
              {/* "All Communities" Button */}
              <button
                onClick={() => setActiveGroupId(null)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap md:whitespace-normal w-full text-left ${
                  activeGroupId === null 
                  ? 'bg-primary/10 text-primary font-semibold' 
                  : 'text-foreground hover:bg-muted'
                }`}
              >
                <div className={`p-1.5 rounded-md ${activeGroupId === null ? 'bg-primary/20' : 'bg-muted-foreground/10'}`}>
                  <Compass size={18} />
                </div>
                <span>Home Feed</span>
              </button>

              <div className="hidden md:block h-px w-full bg-border my-2" />

              {/* Joined Groups List */}
              {joinedGroups.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-4">
                  You haven't joined any communities yet.
                </p>
              ) : (
                joinedGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setActiveGroupId(group.id)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors whitespace-nowrap md:whitespace-normal w-full text-left ${
                      activeGroupId === group.id 
                      ? 'bg-primary/10 text-primary font-semibold' 
                      : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-md bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {group.avatar_url ? (
                        <img src={group.avatar_url} alt="icon" className="w-full h-full object-cover" />
                      ) : (
                        <Hash size={14} />
                      )}
                    </div>
                    <span className="truncate">{group.name}</span>
                  </button>
                ))
              )}
            </div>

            {/* Link to explore more groups */}
            <div className="mt-4 pt-4 border-t border-border px-2">
              <Link 
                href="/groups" 
                className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
              >
                <Library size={16} /> Explore Communities
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: The Feed */}
        <div className="flex-1 max-w-2xl min-w-0">
          
          {/* Feed Header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              {activeGroupId ? <Users size={24} /> : <Library size={24} />}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {activeGroupId ? activeGroup?.name : 'Home Feed'}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {activeGroupId 
                  ? 'Discussions and updates from this community.' 
                  : 'Recent activity from all your joined communities.'}
              </p>
            </div>
          </div>

          {/* Create Post Section */}
          <div className="mb-6">
            {activeGroupId ? (
              <CreatePostCard onPostCreated={fetchPosts} groupId={activeGroupId} />
            ) : (
              <div className="bg-card border border-border rounded-lg p-6 text-center shadow-sm">
                <p className="text-muted-foreground text-sm font-medium">
                  Select a specific community from the sidebar to create a post.
                </p>
              </div>
            )}
          </div>

          {/* Posts List */}
          <div className="space-y-4">
            {loadingPosts ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg shadow-sm">
                <Library className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <h3 className="font-semibold text-foreground">No posts found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {joinedGroups.length === 0 
                    ? "Join a community to see posts here." 
                    : "Be the first to share something in this community!"}
                </p>
              </div>
            ) : (
              posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId}
                  onDelete={handleDeletePost}
                />
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  )
}