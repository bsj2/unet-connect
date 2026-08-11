'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { User, Search as SearchIcon, FileText, Users, GraduationCap, BookOpen, Video, Store, Play, Tag, Image as ImageIcon } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PostCard } from '@/components/post-card'

function SearchResults() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''

  const [users, setUsers] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [clips, setClips] = useState<any[]>([])
  const [trade, setTrade] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setUsers([]); setPosts([]); setGroups([]); setClips([]); setTrade([]);
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) setCurrentUserId(session.user.id)

        // 5 Consultas en paralelo para mantener la velocidad
        const [usersRes, postsRes, groupsRes, clipsRes, tradeRes] = await Promise.all([
          supabase.from('users').select('id, nombre, apellido, avatar_url, rol, carrera, semestre').or(`nombre.ilike.%${query}%,apellido.ilike.%${query}%`).limit(20),
          supabase.from('posts').select(`*, users (nombre, apellido, rol, email, avatar_url), comments (id, content, created_at, user_id, users(nombre, apellido)), reactions (id, user_id)`).ilike('content', `%${query}%`).order('created_at', { ascending: false }).limit(20),
          supabase.from('groups').select('*').ilike('name', `%${query}%`).limit(20),
          supabase.from('clips').select('id, video_url, content, likes_count').ilike('content', `%${query}%`).limit(20),
          supabase.from('products').select('*, seller:users(id, nombre, apellido, avatar_url)').ilike('title', `%${query}%`).eq('status', 'AVAILABLE').limit(20)
        ])

        setUsers(usersRes.data || [])
        setPosts(postsRes.data || [])
        setGroups(groupsRes.data || [])
        setClips(clipsRes.data || [])
        setTrade(tradeRes.data || [])

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
    } catch (error) { console.error(error) }
  }

  const totalResults = users.length + posts.length + groups.length + clips.length + trade.length

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Encabezado */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <SearchIcon className="w-6 h-6 text-primary" />
            Search results for &quot;{query}&quot;
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Found {totalResults} {totalResults === 1 ? 'result' : 'results'} across the network
          </p>
        </div>

        {/* Pestañas con Scroll Horizontal para Móviles */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-muted/50 p-1 border border-border rounded-lg flex overflow-x-auto hide-scrollbar justify-start sm:grid sm:grid-cols-5 w-full max-w-2xl h-auto">
            <TabsTrigger value="users" className="flex-shrink-0 flex items-center gap-2 text-xs sm:text-sm py-2 px-3">
              <User size={16} /><span>Users ({users.length})</span>
            </TabsTrigger>
            <TabsTrigger value="posts" className="flex-shrink-0 flex items-center gap-2 text-xs sm:text-sm py-2 px-3">
              <FileText size={16} /><span>Posts ({posts.length})</span>
            </TabsTrigger>
            <TabsTrigger value="clips" className="flex-shrink-0 flex items-center gap-2 text-xs sm:text-sm py-2 px-3">
              <Video size={16} /><span>Clips ({clips.length})</span>
            </TabsTrigger>
            <TabsTrigger value="trade" className="flex-shrink-0 flex items-center gap-2 text-xs sm:text-sm py-2 px-3">
              <Store size={16} /><span>Trade ({trade.length})</span>
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex-shrink-0 flex items-center gap-2 text-xs sm:text-sm py-2 px-3">
              <Users size={16} /><span>Groups ({groups.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* 1. Usuarios */}
          <TabsContent value="users" className="mt-6 outline-none">
            {loading ? ( <div className="text-center py-12 text-muted-foreground">Searching network...</div> ) : users.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg"><User className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" /><h3 className="font-semibold text-foreground">No users found</h3></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.map((u) => (
                  <Link key={u.id} href={`/profile/${u.id}`} className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:border-primary/50 hover:shadow-md transition-all group">
                    <div className="w-14 h-14 rounded-full bg-primary flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {u.avatar_url ? <img src={u.avatar_url} alt={u.nombre} className="w-full h-full object-cover" /> : <span className="text-lg font-bold text-primary-foreground">{u.nombre?.charAt(0)}{u.apellido?.charAt(0)}</span>}
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

          {/* 2. Publicaciones */}
          <TabsContent value="posts" className="mt-6 space-y-4 outline-none max-w-2xl mx-auto">
            {loading ? ( <div className="text-center py-12 text-muted-foreground">Searching posts...</div> ) : posts.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg"><FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" /><h3 className="font-semibold text-foreground">No posts found</h3></div>
            ) : (
              posts.map(post => <PostCard key={post.id} post={post} currentUserId={currentUserId} onDelete={handleDeletePost} />)
            )}
          </TabsContent>

          {/* 3. Clips */}
          <TabsContent value="clips" className="mt-6 outline-none">
            {loading ? ( <div className="text-center py-12 text-muted-foreground">Searching clips...</div> ) : clips.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg"><Video className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" /><h3 className="font-semibold text-foreground">No clips found</h3></div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {clips.map((clip) => (
                  <Link key={clip.id} href={`/clips?id=${clip.id}`} className="relative aspect-[9/16] bg-muted cursor-pointer group overflow-hidden rounded-lg block">
                    <video src={clip.video_url} className="w-full h-full object-cover" preload="metadata" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <div className="flex items-center gap-1.5 font-bold"><Play size={24} className="fill-white" /></div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 4. Trade (Productos) */}
          <TabsContent value="trade" className="mt-6 outline-none">
            {loading ? ( <div className="text-center py-12 text-muted-foreground">Searching items...</div> ) : trade.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg"><Store className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" /><h3 className="font-semibold text-foreground">No items found</h3></div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {trade.map((product) => (
                  <Link key={product.id} href={`/trade`} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col group">
                    <div className="relative aspect-square bg-muted overflow-hidden">
                      {product.image_url ? <img src={product.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Tag className="opacity-20" size={36} /></div>}
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <h4 className="font-semibold text-foreground text-sm line-clamp-1 mb-1">{product.title}</h4>
                      <span className="font-bold text-primary text-base">${product.price}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 5. Grupos */}
          <TabsContent value="groups" className="mt-6 outline-none">
            {loading ? ( <div className="text-center py-12 text-muted-foreground">Searching groups...</div> ) : groups.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg"><Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" /><h3 className="font-semibold text-foreground">No groups found</h3></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.map((g) => (
                  <div key={g.id} className="p-4 bg-card border border-border rounded-lg shadow-sm hover:border-primary/50 transition-colors cursor-pointer">
                    <h3 className="font-semibold text-foreground">{g.name || 'Unnamed Group'}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{g.description || 'No description provided.'}</p>
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