'use client'

import { useState, useRef } from 'react'
import { MessageCircle, MapPin, ChevronLeft, ChevronRight, Trash2, Heart, Share2, Check, Reply, X, Send, Flag, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { containsInappropriateContent } from '@/lib/moderation' 
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
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
import { toast } from '@/components/ui/toast' // Asegurado el path correcto de tu toast

interface VisualPostCardProps {
  post: any
  currentUserId: string | null
  onDelete?: (id: string) => void
  layout?: 'vertical' | 'horizontal' 
}

const REACTION_TYPES = {
  'ME_GUSTA': { icon: '👍', label: 'Like', color: 'text-blue-500' },
  'ME_ENCANTA': { icon: '❤️', label: 'Love', color: 'text-red-500' },
  'ME_SIRVE': { icon: '💡', label: 'Helpful', color: 'text-yellow-500' },
  'ME_ESTRESA': { icon: '😫', label: 'Stressful', color: 'text-orange-500' },
}

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

export function VisualPostCard({ post, currentUserId, onDelete, layout = 'vertical' }: VisualPostCardProps) {
  const isHorizontal = layout === 'horizontal'
  const images = post.media_urls && post.media_urls.length > 0 ? post.media_urls : (post.image_url ? [post.image_url] : [])
  const [currentImageIdx, setCurrentImageIdx] = useState(0)

  const [reactions, setReactions] = useState<any[]>(post.reactions || [])
  const myReaction = reactions.find(r => r.user_id === currentUserId)
  const [isHoveringReaction, setIsHoveringReaction] = useState(false)
  const [isReacting, setIsReacting] = useState(false)
  const touchTimer = useRef<NodeJS.Timeout | null>(null)

  const [comments, setComments] = useState<any[]>(post.comments || [])
  const [showComments, setShowComments] = useState(isHorizontal) 
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [copied, setCopied] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null)

  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [isReporting, setIsReporting] = useState(false)

  const isAuthor = currentUserId === post.user_id

  const nextImage = () => setCurrentImageIdx(prev => (prev === images.length - 1 ? 0 : prev + 1))
  const prevImage = () => setCurrentImageIdx(prev => (prev === 0 ? images.length - 1 : prev - 1))

  const handleReact = async (type: string = 'ME_GUSTA') => {
    if (!currentUserId || isReacting) return
    setIsReacting(true); setIsHoveringReaction(false)
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
    } catch (error) { console.error(error) } finally { setIsReacting(false) }
  }

  const handleTouchStart = () => { touchTimer.current = setTimeout(() => setIsHoveringReaction(true), 400) }
  const handleTouchEnd = () => { if (touchTimer.current) clearTimeout(touchTimer.current) }

  const submitComment = async (e: React.FormEvent, parentId: string | null = null) => {
    e.preventDefault()
    if (!currentUserId || isSubmitting) return

    const textToSubmit = parentId ? replyText.trim() : newComment.trim()
    if (!textToSubmit) return

    if (containsInappropriateContent(textToSubmit)) {
      toast.add({ title: "Inappropriate Content", description: "Your comment contains inappropriate content. Please revise it.", type: "warning" })
      return
    }

    setIsSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({ post_id: post.id, user_id: currentUserId, content: textToSubmit, parent_id: parentId })
        .select('id, content, created_at, user_id, parent_id, users(nombre, apellido, avatar_url)')
      
      if (error) throw error
      if (data) {
        setComments([...comments, data[0]])
        if (parentId) { setReplyText(''); setReplyingTo(null) } else { setNewComment('') }
      }
    } catch (error: any) { toast.add({ title: "Error", description: "Error submitting comment: " + error.message, type: "error" }) } finally { setIsSubmitting(false) }
  }

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return
    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentToDelete)
      if (error) throw error
      setComments(prev => prev.filter(c => c.id !== commentToDelete && c.parent_id !== commentToDelete))
    } catch (error: any) { 
      toast.add({ title: "Error", description: "Error deleting comment: " + error.message, type: "error" }) 
    } finally {
      setCommentToDelete(null)
    }
  }

  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/p/${post.id}`
      await navigator.clipboard.writeText(url)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch (err) { console.error(err) }
  }

  const handleReport = async () => {
    if (!currentUserId || !reportReason.trim() || isReporting) return
    setIsReporting(true)
    try {
      const { error } = await supabase.from('reports').insert({ reporter_id: currentUserId, post_id: post.id, reason: reportReason.trim() })
      if (error) throw error
      toast.add({ title: "Post Reported", description: "Post reported successfully. Our admins will review it.", type: "success" })
      setShowReportDialog(false); setReportReason('')
    } catch (error: any) { toast.add({ title: "Error", description: "Error reporting post: " + error.message, type: "error" }) } finally { setIsReporting(false) }
  }

  const renderHeader = () => (
    <div className={`p-4 flex items-center justify-between ${isHorizontal ? 'border-b border-border' : ''}`}>
      <div className="flex items-center gap-3">
        <Link href={`/profile/${post.user_id}`} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
          {post.users?.avatar_url ? <img src={post.users.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-white">{post.users?.nombre?.charAt(0)}</span>}
        </Link>
        <div className="flex flex-col">
          <Link href={`/profile/${post.user_id}`} className="font-semibold text-sm hover:underline text-foreground leading-tight">
            {post.users?.nombre} {post.users?.apellido}
          </Link>
          {/* Ubicación Integrada Visualmente */}
          {post.location && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin size={12} className="text-primary/70" /> {post.location}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {!isHorizontal && <span className="text-xs text-muted-foreground font-medium mr-2">{formatTimeAgo(post.created_at)}</span>}
        {currentUserId && (
          isAuthor && onDelete ? (
            <button onClick={() => onDelete(post.id)} className="p-2 text-muted-foreground hover:text-red-500 rounded-full transition-colors"><Trash2 size={16} /></button>
          ) : (
            <button onClick={() => setShowReportDialog(true)} className="p-2 text-muted-foreground hover:text-orange-500 rounded-full transition-colors"><Flag size={16} /></button>
          )
        )}
      </div>
    </div>
  )

  const renderCarousel = () => {
    if (images.length === 0) return null
    return (
      <div className={`relative w-full bg-black flex items-center justify-center group ${isHorizontal ? 'flex-1' : 'aspect-square'}`}>
        <img src={images[currentImageIdx]} alt="Post content" className="w-full h-full object-contain" />
        {images.length > 1 && (
          <>
            <button onClick={prevImage} className="absolute left-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"><ChevronLeft size={20} /></button>
            <button onClick={nextImage} className="absolute right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"><ChevronRight size={20} /></button>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {images.map((_: any, idx: number) => (
                <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentImageIdx ? 'bg-primary' : 'bg-white/50'}`} />
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  const renderInteractions = () => (
    <div className={`flex items-center gap-4 mb-3 ${isHorizontal ? 'mt-2' : ''}`}>
      <div className="relative" onMouseEnter={() => setIsHoveringReaction(true)} onMouseLeave={() => setIsHoveringReaction(false)} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <button data-protected="true" onClick={() => handleReact('ME_GUSTA')} className={`flex items-center gap-1.5 font-medium transition-colors ${myReaction ? (REACTION_TYPES[myReaction.reaction_type as keyof typeof REACTION_TYPES]?.color || 'text-blue-500') : 'text-foreground hover:text-muted-foreground'}`}>
          {myReaction ? <span className="text-[26px] leading-none select-none">{REACTION_TYPES[myReaction.reaction_type as keyof typeof REACTION_TYPES]?.icon || '👍'}</span> : <Heart size={26} className="stroke-[1.5]" />}
        </button>
        {isHoveringReaction && (
          <div className="absolute bottom-full left-0 pb-2 z-50">
            <div className="bg-card border border-border shadow-lg rounded-full px-3 py-2 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
              {Object.entries(REACTION_TYPES).map(([key, config]) => (
                <button data-protected="true" key={key} onClick={() => handleReact(key)} className="text-2xl hover:scale-125 transition-transform select-none" title={config.label}>{config.icon}</button>
              ))}
            </div>
          </div>
        )}
      </div>
      <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 text-foreground hover:text-muted-foreground transition-colors">
         <MessageCircle size={26} className={`transition-all ${showComments ? "fill-foreground stroke-foreground" : "stroke-[1.5] fill-transparent"}`} />
      </button>
      <button onClick={handleShare} className="flex items-center gap-1.5 text-foreground hover:text-muted-foreground transition-colors ml-auto" title="Copy link">
        {copied ? <Check size={24} className="text-green-500" /> : <Share2 size={24} className="stroke-[1.5]" />}
      </button>
    </div>
  )

  const renderContent = () => (
    <>
      {(post.content || (post.hashtags && post.hashtags.length > 0)) && (
        <div className="mb-4 text-foreground text-sm">
          {post.content && (
            <p className="mb-2">
              <span className="font-semibold mr-2">{post.users?.nombre} {post.users?.apellido}</span>
              <span className="whitespace-pre-wrap">{post.content}</span>
            </p>
          )}
          
          {/* Hashtags Integrados Visualmente */}
          {post.hashtags && post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {post.hashtags.map((tag: string, idx: number) => (
                <Link 
                  key={idx} 
                  href={`/search?q=${encodeURIComponent(tag)}`} 
                  className="text-primary hover:text-primary/80 hover:underline font-medium text-[13px] bg-primary/10 px-2 py-0.5 rounded-md transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
          
          {isHorizontal && <div className="text-xs text-muted-foreground font-medium mt-3">{formatTimeAgo(post.created_at)}</div>}
        </div>
      )}
    </>
  )

  const topLevelComments = comments.filter(c => !c.parent_id)
  
  const renderCommentNode = (comment: any, isReply: boolean = false) => {
    const replies = comments.filter(c => c.parent_id === comment.id)
    const isCommentAuthor = currentUserId === comment.user_id
    
    return (
      <div key={comment.id} className={`${isReply ? 'ml-7 sm:ml-9 mt-3 border-l-2 border-border pl-3' : 'mt-4'}`}>
        <div className="flex gap-3 text-sm group/comment">
          <Link href={`/profile/${comment.user_id}`} className="w-7 h-7 rounded-full bg-primary flex items-center justify-center overflow-hidden flex-shrink-0 mt-0.5">
            {comment.users?.avatar_url ? <img src={comment.users.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-white">{comment.users?.nombre?.charAt(0)}</span>}
          </Link>
          <div className="flex-1">
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Link href={`/profile/${comment.user_id}`} className="font-semibold text-foreground hover:underline">{comment.users?.nombre}</Link>
                  <span className="text-xs text-muted-foreground font-medium">{formatTimeAgo(comment.created_at)}</span>
                </div>
                <p className="text-foreground/90 whitespace-pre-wrap">{comment.content}</p>
              </div>
              {isCommentAuthor && (
                <button onClick={() => setCommentToDelete(comment.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 opacity-0 group-hover/comment:opacity-100" title="Delete comment"><Trash2 size={14} /></button>
              )}
            </div>
            <div className="mt-1 flex items-center gap-4">
              <button data-protected="true" onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText('') }} className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"><Reply size={12} /> Reply</button>
            </div>
            {replyingTo === comment.id && currentUserId && (
              <form onSubmit={(e) => submitComment(e, comment.id)} className="flex gap-2 mt-3 mb-2 relative animate-in fade-in zoom-in-95">
                <input type="text" autoFocus value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={`Replying to ${comment.users?.nombre}...`} className="flex-1 bg-muted border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary pr-16" disabled={isSubmitting}/>
                <button type="button" onClick={() => setReplyingTo(null)} className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"><X size={14} /></button>
                <button type="submit" disabled={!replyText.trim() || isSubmitting} className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80 disabled:opacity-50"><Send size={14} /></button>
              </form>
            )}
          </div>
        </div>
        {replies.length > 0 && <div className="mt-1">{replies.map(reply => renderCommentNode(reply, true))}</div>}
      </div>
    )
  }

  const renderCommentsList = () => (
    <div className={`space-y-1 ${isHorizontal ? 'pb-2' : 'mb-4 max-h-60 overflow-y-auto hide-scrollbar'}`}>
      {comments.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Be the first!</p> : topLevelComments.map(comment => renderCommentNode(comment))}
    </div>
  )

  const renderCommentInput = () => (
    <form onSubmit={(e) => submitComment(e, null)} className={`flex gap-2 relative ${isHorizontal ? '' : 'mt-2 border-t border-border pt-4'}`}>
      <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." className="flex-1 bg-transparent border-b border-border py-2 text-sm focus:outline-none focus:border-primary transition-colors pr-12 text-foreground placeholder:text-muted-foreground" disabled={isSubmitting} />
      {newComment.trim() && <button data-protected="true" type="submit" disabled={isSubmitting} className="absolute right-0 top-1/2 -translate-y-1/2 text-primary font-semibold text-sm hover:text-primary/80">Post</button>}
    </form>
  )

  const renderReportModal = () => (
    <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Report Post</DialogTitle></DialogHeader>
        <div className="py-4">
          <label className="text-sm font-medium mb-2 block">Why are you reporting this post?</label>
          <select 
            value={reportReason} 
            onChange={(e) => setReportReason(e.target.value)}
            className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary appearance-none"
          >
            <option value="">Select a reason...</option>
            <option value="Spam or inappropriate advertising">Spam or inappropriate advertising</option>
            <option value="Offensive or non-academic language">Offensive or non-academic language</option>
            <option value="Harassment or bullying">Harassment or bullying</option>
            <option value="Misinformation">Misinformation</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <DialogFooter>
          <button onClick={() => setShowReportDialog(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={handleReport} disabled={!reportReason || isReporting} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center gap-2 disabled:opacity-50">
            {isReporting && <Loader2 className="w-4 h-4 animate-spin" />} Submit Report
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return (
    <>
      {isHorizontal ? (
        <div className="flex flex-col md:flex-row w-full h-full bg-card overflow-hidden text-left">
          <div className="bg-black min-h-[40vh] md:min-h-0 flex flex-col relative h-full">{renderCarousel()}</div>
          <div className="w-full md:w-[400px] flex flex-col border-l border-border bg-card h-full">
            {renderHeader()}
            <div className="flex-1 overflow-y-auto hide-scrollbar p-4">{renderContent()}{renderCommentsList()}</div>
            <div className="p-4 border-t border-border mt-auto">
              {renderInteractions()}
              {reactions.length > 0 && <p className="text-sm font-semibold mb-2 text-foreground">{reactions.length} {reactions.length === 1 ? 'reaction' : 'reactions'}</p>}
              {!post.content && <div className="text-xs text-muted-foreground font-medium mb-3">{formatTimeAgo(post.created_at)}</div>}
              {renderCommentInput()}
            </div>
          </div>
          {renderReportModal()}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm mb-6 text-left flex flex-col">
          {renderHeader()}
          {renderCarousel()}
          <div className="p-4">
            {renderInteractions()}
            {reactions.length > 0 && <p className="text-sm font-semibold mb-2 text-foreground">{reactions.length} {reactions.length === 1 ? 'reaction' : 'reactions'}</p>}
            {renderContent()}
            {showComments && <>{renderCommentsList()}{renderCommentInput()}</>}
          </div>
          {renderReportModal()}
        </div>
      )}

      <AlertDialog open={!!commentToDelete} onOpenChange={() => setCommentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteComment} className="bg-red-500 hover:bg-red-600 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}