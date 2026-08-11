'use client'

import { useState } from 'react'
import { ThumbsUp, MessageCircle, Share2, Trash2, Send, FileText, Reply, X, Flag, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { containsInappropriateContent } from '@/lib/moderation' 
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import Link from 'next/link'
import { toast } from '@/components/ui/toast'

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
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isCopied, setIsCopied] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [isReporting, setIsReporting] = useState(false)

  const [commentToDelete, setCommentToDelete] = useState<string | null>(null)

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
    } catch (error) { console.error(error) } finally { setIsLiking(false) }
  }

  const submitComment = async (e: React.FormEvent, parentId: string | null = null) => {
    e.preventDefault()
    if (!currentUserId || isSubmitting) return

    const textToSubmit = parentId ? replyText.trim() : newComment.trim()
    if (!textToSubmit) return

    if (containsInappropriateContent(textToSubmit)) {
      toast.add({ title: "Inappropriate Content", description: "Your comment contains inappropriate language. Please keep it academic and respectful.", type: "warning" })
      return
    }

    setIsSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({ post_id: post.id, user_id: currentUserId, content: textToSubmit, parent_id: parentId })
        .select('id, content, created_at, user_id, parent_id, users(nombre, apellido)')
      
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

  const handleShare = () => {
    const url = `${window.location.origin}/posts/${post.id}`
    navigator.clipboard.writeText(url).then(() => {
      setIsCopied(true); setTimeout(() => setIsCopied(false), 2000)
    }).catch(err => console.error(err))
  }

  const handleReport = async () => {
    if (!currentUserId || !reportReason.trim() || isReporting) return
    setIsReporting(true)
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: currentUserId,
        post_id: post.id,
        reason: reportReason.trim()
      })
      if (error) throw error
      toast.add({ title: "Success", description: "Post reported successfully. Our admins will review it.", type: "success" })
      setShowReportDialog(false)
      setReportReason('')
    } catch (error: any) {
      toast.add({ title: "Error", description: "Error reporting post: " + error.message, type: "error" })
    } finally {
      setIsReporting(false)
    }
  }

  const topLevelComments = comments.filter(c => !c.parent_id)

  const renderCommentNode = (comment: any, isReply: boolean = false) => {
    const replies = comments.filter(c => c.parent_id === comment.id)
    const isCommentAuthor = currentUserId === comment.user_id
    return (
      <div key={comment.id} className={`${isReply ? 'ml-6 sm:ml-10 mt-3 border-l-2 border-border pl-3' : 'bg-muted/30 p-3 rounded-lg mt-3'}`}>
        <div className="flex justify-between items-start gap-2">
          <div>
            <p className="text-xs font-semibold text-foreground mb-1 hover:underline cursor-pointer">{comment.users?.nombre} {comment.users?.apellido}</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
          </div>
          {isCommentAuthor && (
            <button onClick={() => setCommentToDelete(comment.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1"><Trash2 size={14} /></button>
          )}
        </div>
        <div className="mt-2 flex items-center gap-4">
          <button onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText('') }} className="text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"><Reply size={12} /> Reply</button>
          <span className="text-[10px] text-muted-foreground">{new Date(comment.created_at).toLocaleDateString()}</span>
        </div>
        {replyingTo === comment.id && currentUserId && (
          <form onSubmit={(e) => submitComment(e, comment.id)} className="flex gap-2 mt-3 mb-2 relative">
            <input type="text" autoFocus value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={`Replying to ${comment.users?.nombre}...`} className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" disabled={isSubmitting}/>
            <button type="button" onClick={() => setReplyingTo(null)} className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"><X size={14} /></button>
            <button type="submit" disabled={!replyText.trim() || isSubmitting} className="p-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"><Send size={16} /></button>
          </form>
        )}
        {replies.length > 0 && <div className="mt-2">{replies.map(reply => renderCommentNode(reply, true))}</div>}
      </div>
    )
  }

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-6 mb-4 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <Link href={`/profile/${post.user_id}`} className="flex-shrink-0 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center overflow-hidden">
                {post.users?.avatar_url ? <img src={post.users.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-primary-foreground">{initials}</span>}
              </div>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/profile/${post.user_id}`} className="font-semibold text-foreground hover:underline">{authorName}</Link>
                {post.groups && (
                  <><span className="text-muted-foreground text-xs">in</span><Link href={`/groups/${post.groups.id}`} className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors">{post.groups.name}</Link></>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{authorRole} • {timeAgo}</p>
            </div>
          </div>

          {currentUserId && (
            isAuthor ? (
              <button onClick={() => setShowDeleteDialog(true)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 size={16} />
              </button>
            ) : (
              <button onClick={() => setShowReportDialog(true)} className="p-2 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors">
                <Flag size={16} />
              </button>
            )
          )}
        </div>

        {post.content && <p className="text-foreground text-sm leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>}
        {post.image_url && <div className="mb-4 rounded-lg overflow-hidden border border-border bg-muted/20"><img src={post.image_url} alt="Post attachment" className="w-full max-h-[500px] object-cover" loading="lazy"/></div>}
        {post.file_url && (
          <a href={post.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 mb-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors group w-fit pr-6">
            <div className="p-2 bg-primary/10 rounded-md text-primary group-hover:scale-110 transition-transform flex-shrink-0"><FileText size={20} /></div>
            <div className="overflow-hidden"><p className="text-sm font-medium text-foreground truncate max-w-[250px]">{post.file_name || 'Document'}</p><p className="text-xs text-muted-foreground">Click to view or download</p></div>
          </a>
        )}

        <div className="h-px bg-border my-4" />

        <div className="flex items-center justify-between">
          <button onClick={handleLike} disabled={!currentUserId || isLiking} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${hasLiked ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
            <ThumbsUp size={18} className={hasLiked ? 'fill-primary' : ''} /><span className="text-sm font-medium">{likes.length}</span>
          </button>
          <button onClick={() => setShowComments(!showComments)} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${showComments ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
            <MessageCircle size={18} /><span className="text-sm font-medium">{comments.length}</span>
          </button>
          <button onClick={handleShare} className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
            <Share2 size={18} /><span className="text-sm font-medium">{isCopied ? 'Copied!' : 'Share'}</span>
          </button>
        </div>

        {showComments && (
          <div className="mt-4 pt-4 border-t border-border">
            {currentUserId ? (
              <form onSubmit={(e) => submitComment(e, null)} className="flex gap-2 mb-4">
                <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write a public comment..." className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" disabled={isSubmitting}/>
                <button type="submit" disabled={!newComment.trim() || isSubmitting} className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"><Send size={18} /></button>
              </form>
            ) : <p className="text-xs text-muted-foreground mb-4">Log in to leave a comment.</p>}
            <div className="space-y-1">{topLevelComments.map((comment) => renderCommentNode(comment, false))}</div>
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this post? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onDelete(post.id); setShowDeleteDialog(false) }} className="bg-red-500 hover:bg-red-600 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      <AlertDialog open={!!commentToDelete} onOpenChange={() => setCommentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this comment? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteComment} className="bg-red-500 hover:bg-red-600 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}