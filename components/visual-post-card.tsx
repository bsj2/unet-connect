'use client'

import { useState, useRef } from 'react'
import { MessageCircle, MapPin, ChevronLeft, ChevronRight, Trash2, Heart } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface VisualPostCardProps {
  post: any
  currentUserId: string | null
  onDelete?: (id: string) => void
}

// Mantenemos las keys en español por la base de datos (según Módulo 2), pero las etiquetas en UI serán en inglés
const REACTION_TYPES = {
  'ME_GUSTA': { icon: '👍', label: 'Like', color: 'text-blue-500' },
  'ME_ENCANTA': { icon: '❤️', label: 'Love', color: 'text-red-500' },
  'ME_SIRVE': { icon: '💡', label: 'Helpful', color: 'text-yellow-500' },
  'ME_ESTRESA': { icon: '😫', label: 'Stressful', color: 'text-orange-500' },
}

// Función para formatear fechas estilo Instagram
function formatTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return `${diffInSeconds}s`
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes}m`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d`
  const diffInWeeks = Math.floor(diffInDays / 7)
  return `${diffInWeeks}w`
}

export function VisualPostCard({ post, currentUserId, onDelete }: VisualPostCardProps) {
  const images = post.media_urls && post.media_urls.length > 0 ? post.media_urls : (post.image_url ? [post.image_url] : [])
  const [currentImageIdx, setCurrentImageIdx] = useState(0)

  // Estados de Reacciones
  const [reactions, setReactions] = useState<any[]>(post.reactions || [])
  const myReaction = reactions.find(r => r.user_id === currentUserId)
  const [isHoveringReaction, setIsHoveringReaction] = useState(false)
  const [isReacting, setIsReacting] = useState(false)

  // Ref para el Long Press en móviles
  const touchTimer = useRef<NodeJS.Timeout | null>(null)

  // Estados de Comentarios
  const [comments, setComments] = useState<any[]>(post.comments || [])
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isAuthor = currentUserId === post.user_id

  const nextImage = () => setCurrentImageIdx(prev => (prev === images.length - 1 ? 0 : prev + 1))
  const prevImage = () => setCurrentImageIdx(prev => (prev === 0 ? images.length - 1 : prev - 1))

  const handleReact = async (type: string = 'ME_GUSTA') => {
    if (!currentUserId || isReacting) return
    setIsReacting(true)
    setIsHoveringReaction(false)

    try {
      if (myReaction && myReaction.reaction_type === type) {
        await supabase.from('reactions').delete().eq('id', myReaction.id)
        setReactions(reactions.filter(r => r.id !== myReaction.id))
      } else if (myReaction) {
        await supabase.from('reactions').update({ reaction_type: type }).eq('id', myReaction.id)
        setReactions(reactions.map(r => r.id === myReaction.id ? { ...r, reaction_type: type } : r))
      } else {
        const { data } = await supabase.from('reactions').insert({ post_id: post.id, user_id: currentUserId, reaction_type: type }).select().single()
        if (data) setReactions([...reactions, data])
      }
    } catch (error) {
      console.error("Error reacting:", error)
    } finally {
      setIsReacting(false)
    }
  }

  // Funciones para soporte móvil (Long Press)
  const handleTouchStart = () => {
    touchTimer.current = setTimeout(() => {
      setIsHoveringReaction(true)
    }, 400) // 400ms para abrir el menú
  }

  const handleTouchEnd = () => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current)
    }
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUserId || !newComment.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({ post_id: post.id, user_id: currentUserId, content: newComment.trim() })
        .select()
      
      if (error) throw error
      if (data) {
        // Simulamos la estructura de usuario para que se vea de inmediato
        const { data: userData } = await supabase.from('users').select('nombre, apellido, avatar_url').eq('id', currentUserId).single()
        const newCommentWithUser = { ...data[0], users: userData || { nombre: 'You', apellido: '' } }
        setComments([...comments, newCommentWithUser])
        setNewComment('')
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm mb-6 text-left">
      
      {/* 1. CABECERA */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${post.user_id}`} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
            {post.users?.avatar_url ? (
              <img src={post.users.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-white">{post.users?.nombre?.charAt(0)}</span>
            )}
          </Link>
          <div className="flex flex-col">
            <Link href={`/profile/${post.user_id}`} className="font-semibold text-sm hover:underline text-foreground">
              {post.users?.nombre} {post.users?.apellido}
            </Link>
            {post.location && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin size={12} /> {post.location}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium mr-2">
            {formatTimeAgo(post.created_at)}
          </span>
          {isAuthor && onDelete && (
            <button onClick={() => onDelete(post.id)} className="p-2 text-muted-foreground hover:text-red-500 rounded-full transition-colors">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 2. CARRUSEL DE IMÁGENES */}
      {images.length > 0 && (
        <div className="relative aspect-square w-full bg-black flex items-center justify-center group">
          <img 
            src={images[currentImageIdx]} 
            alt="Post content" 
            className="w-full h-full object-contain"
          />
          
          {images.length > 1 && (
            <>
              <button onClick={prevImage} className="absolute left-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70">
                <ChevronLeft size={20} />
              </button>
              <button onClick={nextImage} className="absolute right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70">
                <ChevronRight size={20} />
              </button>
              
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {images.map((_: any, idx: number) => (
                  <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentImageIdx ? 'bg-primary' : 'bg-white/50'}`} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 3. BARRA DE INTERACCIONES Y TEXTO */}
      <div className="p-4">
        <div className="flex items-center gap-4 mb-3">
          
          {/* Botón de Reacción con soporte Desktop Hover y Mobile Long-Press */}
          <div 
            className="relative"
            onMouseEnter={() => setIsHoveringReaction(true)}
            onMouseLeave={() => setIsHoveringReaction(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <button 
              onClick={() => handleReact('ME_GUSTA')}
              className={`flex items-center gap-1.5 font-medium transition-colors ${
                myReaction 
                  ? (REACTION_TYPES[myReaction.reaction_type as keyof typeof REACTION_TYPES]?.color || 'text-blue-500') 
                  : 'text-foreground hover:text-muted-foreground'
              }`}
            >
              {myReaction ? (
                <span className="text-[26px] leading-none select-none">
                  {REACTION_TYPES[myReaction.reaction_type as keyof typeof REACTION_TYPES]?.icon || '👍'}
                </span>
              ) : (
                <Heart size={26} className="stroke-[1.5]" />
              )}
            </button>

            {/* Menú Flotante de Reacciones */}
            {isHoveringReaction && (
              // Este contenedor con pb-2 actúa como "puente" para evitar que el mouse se salga al subir
              <div className="absolute bottom-full left-0 pb-2 z-50">
                <div className="bg-card border border-border shadow-lg rounded-full px-3 py-2 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                  {Object.entries(REACTION_TYPES).map(([key, config]) => (
                    <button 
                      key={key} 
                      onClick={() => handleReact(key)}
                      className="text-2xl hover:scale-125 transition-transform select-none"
                      title={config.label}
                    >
                      {config.icon}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={() => setShowComments(!showComments)} 
            className="flex items-center gap-1.5 text-foreground hover:text-muted-foreground transition-colors"
          >
             <MessageCircle 
               size={26} 
               className={`transition-all ${showComments ? "fill-foreground stroke-foreground" : "stroke-[1.5] fill-transparent"}`} 
             />
          </button>
        </div>

        {reactions.length > 0 && (
          <p className="text-sm font-semibold mb-2 text-foreground">
            {reactions.length} {reactions.length === 1 ? 'reaction' : 'reactions'}
          </p>
        )}

        {(post.content || (post.hashtags && post.hashtags.length > 0)) && (
          <div className="text-sm mb-2 text-foreground">
            <span className="font-semibold mr-2">{post.users?.nombre}</span>
            <span className="whitespace-pre-wrap">{post.content}</span>
            
            {post.hashtags && post.hashtags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {post.hashtags.map((tag: string, idx: number) => (
                  <Link key={idx} href={`/search?q=${encodeURIComponent(tag)}`} className="text-primary hover:underline font-medium">
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. SECCIÓN DE COMENTARIOS */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="space-y-4 mb-4 max-h-60 overflow-y-auto hide-scrollbar">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">No comments yet. Be the first!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 text-sm">
                    {/* Avatar del comentario */}
                    <Link href={`/profile/${comment.user_id}`} className="w-7 h-7 rounded-full bg-primary flex items-center justify-center overflow-hidden flex-shrink-0 mt-0.5">
                      {comment.users?.avatar_url ? (
                        <img src={comment.users.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-white">{comment.users?.nombre?.charAt(0)}</span>
                      )}
                    </Link>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Link href={`/profile/${comment.user_id}`} className="font-semibold text-foreground hover:underline">
                          {comment.users?.nombre} {comment.users?.apellido}
                        </Link>
                        <span className="text-xs text-muted-foreground font-medium">
                          {formatTimeAgo(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-foreground/90 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <form onSubmit={submitComment} className="flex gap-2 relative mt-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-transparent border-b border-border py-2 text-sm focus:outline-none focus:border-primary transition-colors pr-12 text-foreground placeholder:text-muted-foreground"
                disabled={isSubmitting}
              />
              {newComment.trim() && (
                <button type="submit" disabled={isSubmitting} className="absolute right-0 top-1/2 -translate-y-1/2 text-primary font-semibold text-sm hover:text-primary/80">
                  Post
                </button>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  )
}