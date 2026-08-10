'use client'

import { useState } from 'react'
import { ThumbsUp, MessageCircle, Share2, Trash2, Send, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Link from 'next/link'

interface PostCardProps {
  post: any
  currentUserId: string | null
  onDelete: (id: string) => void
}

export function PostCard({ post, currentUserId, onDelete }: PostCardProps) {
  const [likes, setLikes] = useState<any[]>(post.reactions || [])
  const hasLiked = likes.some(like => like.user_id === currentUserId)
  const [isLiking, setIsLiking] = useState(false)

  const [comments, setComments] = useState<any[]>(post.comments || [])
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isCopied, setIsCopied] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false) // Estado para el modal de borrar

  const date = new Date(post.created_at)
  const timeAgo = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const authorName = post.users ? `${post.users.nombre} ${post.users.apellido}` : 'Unknown User'
  const authorRole = post.users?.rol || 'Member'
  const initials = post.users ? `${post.users.nombre.charAt(0)}${post.users.apellido.charAt(0)}` : 'U'
  const isAuthor = currentUserId === post.user_id

  const handleLike = async () => {
    if (!currentUserId || isLiking) return
    setIsLiking(true)
    try {
      if (hasLiked) {
        await supabase.from('reactions').delete().match({ post_id: post.id, user_id: currentUserId })
        setLikes(likes.filter(l => l.user_id !== currentUserId))
      } else {
        const { data } = await supabase.from('reactions').insert({ post_id: post.id, user_id: currentUserId }).select()
        if (data) setLikes([...likes, data[0]])
      }
    } catch (error) {
      console.error("Error toggling like:", error)
    } finally {
      setIsLiking(false)
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
        .select('id, content, created_at, user_id, users(nombre, apellido)')
      
      if (error) throw error
      if (data) {
        setComments([...comments, data[0]])
        setNewComment('')
      }
    } catch (error) {
      console.error("Error posting comment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleShare = () => {
    const url = `${window.location.origin}/posts/${post.id}`
    navigator.clipboard.writeText(url).then(() => {
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }).catch(err => console.error('Error copying text: ', err))
  }

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-6 mb-4 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
        {/* Header del Post */}
        <div className="flex items-start justify-between mb-4">
        <Link href={`/profile/${post.user_id}`} className="flex items-start gap-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {post.users?.avatar_url ? (
              <img src={post.users.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-primary-foreground">{initials}</span>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-foreground hover:underline">{authorName}</h3>
            <p className="text-xs text-muted-foreground">{authorRole} • {timeAgo}</p>
          </div>
        </Link>
        {isAuthor && (
          <button 
            onClick={() => setShowDeleteDialog(true)}
            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

        {/* Contenido */}
        {/* Contenido de texto */}
        {post.content && (
          <p className="text-foreground text-sm leading-relaxed mb-4 whitespace-pre-wrap">
            {post.content}
          </p>
        )}

        {/* Contenedor de Imagen (si existe) */}
        {post.image_url && (
          <div className="mb-4 rounded-lg overflow-hidden border border-border bg-muted/20">
            <img 
              src={post.image_url} 
              alt="Post attachment" 
              className="w-full max-h-[500px] object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Contenedor de Archivo Adjunto (si existe) */}
        {post.file_url && (
          <a 
            href={post.file_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 mb-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors group w-fit pr-6"
          >
            <div className="p-2 bg-primary/10 rounded-md text-primary group-hover:scale-110 transition-transform flex-shrink-0">
              <FileText size={20} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-foreground truncate max-w-[250px]" title={post.file_name || 'Document'}>
                {post.file_name || 'Document'}
              </p>
              <p className="text-xs text-muted-foreground">Click to view or download</p>
            </div>
          </a>
        )}

        <div className="h-px bg-border my-4" />
        <div className="h-px bg-border my-4" />

        {/* Botones de Interacción */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleLike}
            disabled={!currentUserId || isLiking}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              hasLiked ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <ThumbsUp size={18} className={hasLiked ? 'fill-primary' : ''} />
            <span className="text-sm font-medium">{likes.length}</span>
          </button>

          <button 
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              showComments ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <MessageCircle size={18} />
            <span className="text-sm font-medium">{comments.length}</span>
          </button>

          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <Share2 size={18} />
            <span className="text-sm font-medium">{isCopied ? 'Copied!' : 'Share'}</span>
          </button>
        </div>

        {/* Sección de Comentarios */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-border">
            {currentUserId ? (
              <form onSubmit={submitComment} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isSubmitting}
                />
                <button type="submit" disabled={!newComment.trim() || isSubmitting} className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
                  <Send size={18} />
                </button>
              </form>
            ) : (
              <p className="text-xs text-muted-foreground mb-4">Log in to leave a comment.</p>
            )}

            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs font-semibold text-foreground mb-1">
                    {comment.users?.nombre} {comment.users?.apellido}
                  </p>
                  <p className="text-sm text-foreground">{comment.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Diálogo de Confirmación de Borrado */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                onDelete(post.id)
                setShowDeleteDialog(false)
              }}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}