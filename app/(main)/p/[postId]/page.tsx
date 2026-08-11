'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { VisualPostCard } from '@/components/visual-post-card'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function StandalonePostPage() {
  const params = useParams()
  const router = useRouter()
  const postId = (params.postId || params.id) as string
  
  const [posts, setPosts] = useState<any[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPostAndFeed = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) setCurrentUserId(session.user.id)

        const { data: mainPost } = await supabase.from('posts').select('user_id').eq('id', postId).single()
        if (!mainPost) throw new Error("Post not found")

        const { data: allPosts } = await supabase
          .from('posts')
          .select(`*, users (nombre, apellido, avatar_url), comments (id, content, created_at, user_id, parent_id, users(nombre, apellido, avatar_url)), reactions (id, user_id, reaction_type)`)
          .eq('user_id', mainPost.user_id)
          .or('media_urls.neq.{},image_url.not.is.null')
          .order('created_at', { ascending: false })

        if (allPosts) {
          const clickedPost = allPosts.find(p => p.id === postId)
          const otherPosts = allPosts.filter(p => p.id !== postId)
          if (clickedPost) setPosts([clickedPost, ...otherPosts])
        }
      } catch (error) {
        console.error("Error loading post:", error)
      } finally {
        setLoading(false)
      }
    }

    if (postId) fetchPostAndFeed()
  }, [postId])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

  return (
    <div className="min-h-screen bg-background max-w-2xl mx-auto px-4 py-6 md:py-8">
      <button 
        onClick={() => router.back()} 
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft size={20} /> Back
      </button>
      
      <div className="space-y-6">
        {posts.map((post) => (
          <VisualPostCard key={post.id} post={post} currentUserId={currentUserId} />
        ))}
      </div>
    </div>
  )
}