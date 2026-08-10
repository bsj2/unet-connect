'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { User, Search as SearchIcon, FileText, Users, GraduationCap, BookOpen } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PostCard } from '@/components/post-card' // Importamos la tarjeta de publicación

function SearchResults() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''

  const [users, setUsers] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setUsers([]); setPosts([]); setGroups([]);
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) setCurrentUserId(session.user.id)

        // Ejecutamos las 3 consultas al mismo tiempo para mayor velocidad
        const [usersRes, postsRes, groupsRes] = await Promise.all([
          // 1. Usuarios
          supabase.from('users')
            .select('id, nombre, apellido, avatar_url, rol, carrera, semestre')
            .or(`nombre.ilike.%${query}%,apellido.ilike.%${query}%`)
            .limit(20),
          
          // 2. Publicaciones (con uniones a usuarios, comentarios y reacciones)
          supabase.from('posts')
            .select(`
              *,
              users (nombre, apellido, rol, email, avatar_url),
              comments (id, content, created_at, user_id, users(nombre, apellido)),
              reactions (id, user_id)
            `)
            .ilike('content', `%${query}%`)
            .order('created_at', { ascending: false })
            .limit(20),

          // 3. Grupos (Asumimos columnas genericas, si falla no rompe la página)
          supabase.from('groups')
            .select('*')
            .ilike('name', `%${query}%`)
            .limit(20)
        ])

        setUsers(usersRes.data || [])
        setPosts(postsRes.data || [])
        setGroups(groupsRes.data || [])

      } catch (error) {
        console.error("Error al buscar:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [query])

  const handleDeletePost = async (postId: string) => {
    try {
      await supabase.from('posts').delete().eq('id', postId)
      setPosts(posts.filter(p => p.id !== postId))
    } catch (error) {
      console.error(error)
    }
  }

  const totalResults = users.length + posts.length + groups.length

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Encabezado de resultados */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <SearchIcon className="w-6 h-6 text-primary" />
            Search results for &quot;{query}&quot;
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Found {totalResults} {totalResults === 1 ? 'result' : 'results'} across the network
          </p>
        </div>

        {/* Sistema de Pestañas funcional */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-muted/50 p-1 border border-border rounded-lg grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="users" className="flex items-center gap-2 text-xs sm:text-sm">
              <User size={16} />
              <span>Users ({users.length})</span>
            </TabsTrigger>
            <TabsTrigger value="posts" className="flex items-center gap-2 text-xs sm:text-sm">
              <FileText size={16} />
              <span>Posts ({posts.length})</span>
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2 text-xs sm:text-sm">
              <Users size={16} />
              <span>Groups ({groups.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Pestaña: Usuarios */}
          <TabsContent value="users" className="mt-6">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Searching network...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg">
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <h3 className="font-semibold text-foreground">No users found</h3>
                <p className="text-sm text-muted-foreground mt-1">Try searching with a different name or surname.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.map((u) => (
                  <Link key={u.id} href={`/profile/${u.id}`} className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:border-primary/50 hover:shadow-md transition-all group">
                    <div className="w-14 h-14 rounded-full bg-primary flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-primary-foreground">{u.nombre?.charAt(0)}{u.apellido?.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{u.nombre} {u.apellido}</h3>
                      <p className="text-xs text-muted-foreground font-medium truncate">{u.rol}</p>
                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                        {u.carrera && <span className="flex items-center gap-1 truncate max-w-[180px]"><BookOpen size={12} /> {u.carrera}</span>}
                        {u.semestre && <span className="flex items-center gap-1"><GraduationCap size={12} /> Sem. {u.semestre}</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Pestaña: Publicaciones */}
          <TabsContent value="posts" className="mt-6 space-y-4">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Searching posts...</div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <h3 className="font-semibold text-foreground">No posts found</h3>
                <p className="text-sm text-muted-foreground mt-1">No publications match your search terms.</p>
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
          </TabsContent>

          {/* Pestaña: Grupos */}
          <TabsContent value="groups" className="mt-6">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Searching groups...</div>
            ) : groups.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <h3 className="font-semibold text-foreground">No groups found</h3>
                <p className="text-sm text-muted-foreground mt-1">Groups feature might be coming soon or no match found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.map((g) => (
                  <div key={g.id} className="p-4 bg-card border border-border rounded-lg shadow-sm">
                    <h3 className="font-semibold text-foreground">{g.name || 'Unnamed Group'}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{g.description}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

        </Tabs>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-muted-foreground">Loading search...</div>}>
      <SearchResults />
    </Suspense>
  )
}