'use client'

import { useEffect, useState } from 'react'
import { CreatePostCard } from './create-post-card'
import { PostCard } from './post-card'
import { supabase } from '@/lib/supabase'

export function SocialFeed() {
  const [posts, setPosts] = useState<any[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null) // Nuevo estado para errores

  const fetchPosts = async () => {
    try {
      // 1. Obtener quién está conectado actualmente
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      
      if (session?.user) {
        setCurrentUserId(session.user.id)
      }

      // 2. Traer los posts con comentarios y reacciones anidados
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          users (nombre, apellido, rol, email),
          comments (id, content, created_at, user_id, users(nombre, apellido)),
          reactions (id, user_id)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        throw error // Esto lo manda al catch
      } 
      
      if (data) {
        setPosts(data)
      }
    } catch (error: any) {
      console.error('Error completo al cargar posts:', error)
      setErrorMsg(error.message || JSON.stringify(error))
    } finally {
      // Esto GARANTIZA que el estado de carga se quite, pase lo que pase
      setLoading(false) 
    }
  }

  // Cargar los posts al montar el componente
  useEffect(() => {
    fetchPosts()
  }, [])

  // Función para borrar
  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId)
      if (error) throw error
      setPosts(posts.filter(p => p.id !== postId))
    } catch (error: any) {
      console.error("Error deleting post:", error)
    }
  }

  return (
    <div className="min-h-screen bg-background py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
            University Community
          </h1>
          <p className="text-muted-foreground mt-2">
            Share updates, connect with peers, and stay informed
          </p>
        </div>

        {/* Create Post Card */}
        <CreatePostCard onPostCreated={fetchPosts} />

        {/* Si hay un error, lo mostramos aquí */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 text-red-500 rounded-lg">
            <h3 className="font-bold mb-1">Hubo un error cargando el muro:</h3>
            <p className="font-mono text-sm">{errorMsg}</p>
          </div>
        )}

        {/* Posts Feed */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Cargando publicaciones...</div>
          ) : posts.length === 0 && !errorMsg ? (
            <div className="text-center text-muted-foreground py-8">Aún no hay publicaciones. ¡Sé el primero!</div>
          ) : (
            posts.map((post) => (
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
  )
}