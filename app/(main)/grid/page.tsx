'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Heart, MessageCircle, Grid3X3, ImageIcon, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Link from 'next/link'

export default function GridPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<any | null>(null)

  useEffect(() => {
    const fetchGridPosts = async () => {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            users (nombre, apellido, avatar_url),
            reactions (id),
            comments (id)
          `)
          .not('image_url', 'is', null)
          .order('created_at', { ascending: false })

        if (error) throw error
        setPosts(data || [])
      } catch (error) {
        console.error("Error fetching grid posts:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchGridPosts()
  }, [])

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Grid3X3 size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gallery Grid</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Explora todas las fotos compartidas en la red.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border rounded-lg">
            <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <h3 className="font-semibold text-foreground">No hay fotos aún</h3>
            <p className="text-sm text-muted-foreground mt-1">Las publicaciones con imágenes aparecerán aquí.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 md:gap-4">
            {posts.map((post) => (
              <div 
                key={post.id} 
                className="relative aspect-square cursor-pointer group bg-muted overflow-hidden rounded-sm md:rounded-xl"
                onClick={() => setSelectedPost(post)}
              >
                <img 
                  src={post.image_url} 
                  alt="Post content" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-6 text-white">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Heart size={20} className="fill-white" />
                    <span>{post.reactions?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold">
                    <MessageCircle size={20} className="fill-white" />
                    <span>{post.comments?.length || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-border shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Visor de imagen</DialogTitle>
          </DialogHeader>
          
          {selectedPost && (
            <div className="flex flex-col md:flex-row max-h-[85vh]">
              <div className="flex-1 bg-black flex items-center justify-center relative min-h-[300px] md:min-h-[500px]">
                <img 
                  src={selectedPost.image_url} 
                  alt="Selected post" 
                  className="w-full h-full object-contain"
                />
              </div>
              
              <div className="w-full md:w-80 bg-card p-4 flex flex-col border-l border-border max-h-[30vh] md:max-h-none overflow-y-auto">
                <Link href={`/profile/${selectedPost.user_id}`} className="flex items-center gap-3 mb-4 hover:opacity-80 transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center overflow-hidden flex-shrink-0">
                    {selectedPost.users?.avatar_url ? (
                      <img src={selectedPost.users.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-primary-foreground">
                        {selectedPost.users?.nombre?.charAt(0)}{selectedPost.users?.apellido?.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">
                      {selectedPost.users?.nombre} {selectedPost.users?.apellido}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(selectedPost.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
                
                {selectedPost.content && (
                  <p className="text-sm text-foreground whitespace-pre-wrap mb-4">
                    {selectedPost.content}
                  </p>
                )}

                <div className="mt-auto pt-4 border-t border-border flex items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Heart size={16} /> {selectedPost.reactions?.length || 0}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <MessageCircle size={16} /> {selectedPost.comments?.length || 0}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}