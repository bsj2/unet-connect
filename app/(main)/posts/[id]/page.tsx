'use client'

import { useEffect, useState } from 'react'
import { PostCard } from '@/components/post-card'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function PostPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string

  const [post, setPost] = useState<any>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setCurrentUserId(session.user.id)
        }

        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            users (nombre, apellido, rol, email),
            comments (id, content, created_at, user_id, parent_id, users(nombre, apellido)),
            reactions (id, user_id)
          `)
          .eq('id', postId)
          .single()

        if (error) throw error
        if (data) setPost(data)
      } catch (error: any) {
        setErrorMsg(error.message || "Error al cargar la publicación")
      } finally {
        setLoading(false)
      }
    }

    if (postId) {
      fetchPost()
    }
  }, [postId])

  const handleDeletePost = async (id: string) => {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', id)
      if (error) throw error
      router.push('/')
    } catch (error: any) {
      console.error("Error deleting post:", error)
    }
  }

  if (loading) return <div className="text-center py-10 text-muted-foreground">Cargando publicación...</div>
  if (errorMsg || !post) return <div className="text-center py-10 text-red-500">{errorMsg || "Publicación no encontrada"}</div>

  return (
    <div className="min-h-screen bg-background py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} />
            Back to feed
          </Link>
        </div>
        
        <PostCard
          post={post}
          currentUserId={currentUserId}
          onDelete={handleDeletePost}
        />
      </div>
    </div>
  )
}