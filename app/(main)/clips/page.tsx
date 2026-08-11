'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { Heart, MessageCircle, Share2, Music, Loader2, Play, Plus, Upload, Video, Check, Send, Reply, X, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useSearchParams } from 'next/navigation'
import { containsInappropriateContent } from '@/lib/moderation' // <-- Importamos moderación
import { toast } from '@/components/ui/toast'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

function ClipsContent() {
  const searchParams = useSearchParams()
  const sharedClipId = searchParams.get('id')
  
  const [clips, setClips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [audioTitle, setAudioTitle] = useState('')

  const fetchAndSortClips = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) setCurrentUserId(session.user.id)

      const { data, error } = await supabase
        .from('clips')
        .select(`
          *,
          users (id, nombre, apellido, avatar_url),
          audios (title, artist),
          clip_likes (user_id),
          clip_comments (id, content, created_at, user_id, parent_id, users(nombre, apellido, avatar_url))
        `)

      if (error) throw error

      if (data) {
        // engagement algorithm: E = (L * 2) + (C * 3) + (S * 5) - (deltaT * 1.5)
        let scoredClips = data.map(clip => {
          const L = clip.clip_likes?.length || 0
          const C = clip.clip_comments?.length || 0
          const S = clip.shares_count || 0
          
          const createdTime = new Date(clip.created_at).getTime()
          const currentTime = new Date().getTime()
          const deltaT = (currentTime - createdTime) / (1000 * 60 * 60)

          const E = (L * 2) + (C * 3) + (S * 5) - (deltaT * 1.5)

          return { ...clip, engagementScore: E, likes_count: L, comments_count: C }
        })

        // sort by engagement score descending
        scoredClips.sort((a, b) => b.engagementScore - a.engagementScore)

        // if there's a shared clip ID in the URL, move that clip to the top of the list
        if (sharedClipId) {
          const sharedClipIndex = scoredClips.findIndex(c => c.id === sharedClipId)
          if (sharedClipIndex > -1) {
            const sharedClip = scoredClips.splice(sharedClipIndex, 1)[0]
            scoredClips = [sharedClip, ...scoredClips]
          }
        }

        setClips(scoredClips)
      }
    } catch (error) {
      console.error("Error fetching clips:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAndSortClips()
  }, [])

  const handleUpload = async () => {
    if (!currentUserId || !videoFile) return

    if (caption.trim() && containsInappropriateContent(caption)) {
      toast.add({
        title: "Inappropriate Content",
        description: "Your caption contains inappropriate language. Please keep it academic and respectful.",
        type: "warning",
      })
      return
    }

    setIsUploading(true)
    try {
      const fileExt = videoFile.name.split('.').pop()
      const filePath = `${currentUserId}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('clips').upload(filePath, videoFile)
      if (uploadError) throw uploadError
      const videoUrl = supabase.storage.from('clips').getPublicUrl(filePath).data.publicUrl
      const { data: audioData, error: audioError } = await supabase.from('audios').insert({ title: audioTitle.trim() || 'Original Audio', artist: 'Campus Creator' }).select().single()
      if (audioError) throw audioError
      const { error: clipError } = await supabase.from('clips').insert({ user_id: currentUserId, video_url: videoUrl, content: caption.trim(), audio_id: audioData.id })
      if (clipError) throw clipError
      setVideoFile(null); setCaption(''); setAudioTitle(''); setIsUploadOpen(false); fetchAndSortClips()
    } catch (error: any) { toast.add({ title: "Error", description: "Error: " + error.message, type: "error" }) } finally { setIsUploading(false) }
  }

  if (loading) return <div className="h-[calc(100vh-4rem)] flex justify-center items-center bg-black"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>

  return (
    <>
      {currentUserId && (
        <div className="fixed top-20 right-4 sm:right-8 z-50">
           <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger>
              <button className="bg-primary hover:bg-primary/90 text-primary-foreground p-3 sm:px-4 sm:py-2 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center gap-2">
                <Plus size={24} className="sm:hidden" />
                <Upload size={20} className="hidden sm:block" />
                <span className="hidden sm:inline font-semibold">Upload</span>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-card border-border">
              <DialogHeader><DialogTitle>Upload a new Clip</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><label className="text-sm font-medium">Select Video</label><div className="flex items-center gap-4"><label className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl hover:bg-muted/50 cursor-pointer"><input type="file" accept="video/mp4,video/webm,video/ogg" className="hidden" onChange={(e) => setVideoFile(e.target.files?.[0] || null)}/><Upload size={32} className="mb-2" /><span className="text-sm">{videoFile ? videoFile.name : 'Click to browse'}</span></label></div></div>
                <div className="space-y-2"><label className="text-sm font-medium">Caption</label><textarea value={caption} onChange={(e) => setCaption(e.target.value)} className="w-full bg-muted/50 border border-border rounded-lg p-3 text-sm resize-none" rows={3}/></div>
                <div className="space-y-2"><label className="text-sm font-medium">Audio Name</label><input type="text" value={audioTitle} onChange={(e) => setAudioTitle(e.target.value)} className="w-full bg-muted/50 border border-border rounded-lg p-3 text-sm"/></div>
              </div>
              <button onClick={handleUpload} disabled={isUploading || !videoFile} className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50">{isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Video className="w-5 h-5" />}{isUploading ? 'Uploading...' : 'Post Clip'}</button>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {clips.length === 0 ? (
        <div className="h-[calc(100dvh-8rem)] md:h-[calc(100vh-4rem)] w-full flex flex-col justify-center items-center text-white bg-black"><Play className="w-16 h-16 opacity-30 mb-4" /><h2 className="text-xl font-bold">No Clips Yet</h2></div>
      ) : (
        <div className="h-[calc(100dvh-8rem)] md:h-[calc(100vh-4rem)] w-full bg-black overflow-y-scroll snap-y snap-mandatory hide-scrollbar">
          {clips.map((clip) => (
            <ClipPlayer key={clip.id} clip={clip} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </>
  )
}

function ClipPlayer({ clip, currentUserId }: { clip: any, currentUserId: string | null }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  
  // interactions
  const [hasLiked, setHasLiked] = useState(clip.clip_likes?.some((l: any) => l.user_id === currentUserId) || false)
  const [likesCount, setLikesCount] = useState<number>(clip.likes_count || 0)
  const [copied, setCopied] = useState(false)
  
  // comments
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<any[]>(clip.clip_comments || [])
  
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null)

  // Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            window.history.replaceState(null, '', `/clips?id=${clip.id}`)
            if (videoRef.current) {
              videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
            }
          } else {
            if (videoRef.current) {
              videoRef.current.pause()
              setIsPlaying(false)
            }
          }
        })
      },
      { threshold: 0.6 }
    )

    if (containerRef.current) observer.observe(containerRef.current)
    return () => { if (containerRef.current) observer.unobserve(containerRef.current) }
  }, [clip.id])

  const togglePlay = () => {
    if (videoRef.current) {
      isPlaying ? videoRef.current.pause() : videoRef.current.play()
      setIsPlaying(!isPlaying)
    }
  }

  const handleLike = async () => {
    if (!currentUserId) return
    const wasLiked = hasLiked
    setHasLiked(!wasLiked)
    setLikesCount(prev => wasLiked ? prev - 1 : prev + 1)

    try {
      if (wasLiked) {
        await supabase.from('clip_likes').delete().match({ clip_id: clip.id, user_id: currentUserId })
      } else {
        await supabase.from('clip_likes').insert({ clip_id: clip.id, user_id: currentUserId })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/clips?id=${clip.id}`
      await navigator.clipboard.writeText(url)
      
      await supabase.rpc('increment_clip_shares', { row_id: clip.id }) 

      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) { console.error(err) }
  }

  const submitComment = async (e: React.FormEvent, parentId: string | null = null) => {
    e.preventDefault()
    if (!currentUserId || isSubmitting) return

    const textToSubmit = parentId ? replyText.trim() : newComment.trim()
    if (!textToSubmit) return

    if (containsInappropriateContent(textToSubmit)) {
      toast.add({
        title: "Inappropriate Content",
        description: "Your comment contains inappropriate language. Please keep it academic and respectful.",
        type: "warning",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('clip_comments')
        .insert({ 
          clip_id: clip.id, 
          user_id: currentUserId, 
          content: textToSubmit,
          parent_id: parentId
        })
        .select('id, content, created_at, user_id, parent_id, users(nombre, apellido, avatar_url)')
        .single()

      if (error) throw error
      if (data) {
        setComments([...comments, data])
        if (parentId) {
          setReplyText('')
          setReplyingTo(null)
        } else {
          setNewComment('')
        }
      }
    } catch (error: any) { toast.add({ title: "Error", description: "Error submitting comment: " + error.message, type: "error" }) } finally { setIsSubmitting(false) }
  }

  const handleDeleteComment = async (commentId: string) => {
    setCommentToDelete(commentId)
  }

  const confirmDeleteComment = async () => {
  if (!commentToDelete) return
  
  try {
    const { error } = await supabase.from('clip_comments').delete().eq('id', commentToDelete)
    if (error) throw error
    setComments(prev => prev.filter(c => c.id !== commentToDelete && c.parent_id !== commentToDelete))
  } catch (error: any) {
    toast.add({ title: "Error", description: "Error deleting comment: " + error.message, type: "error" })
  } finally {
    setCommentToDelete(null)
  }
}

  const topLevelComments = comments.filter((c: any) => !c.parent_id)

  const renderCommentNode = (comment: any, isReply: boolean = false) => {
    const replies = comments.filter((c: any) => c.parent_id === comment.id)
    const isCommentAuthor = currentUserId === comment.user_id

    return (
      <div key={comment.id} className={`${isReply ? 'ml-7 sm:ml-9 mt-3 border-l-2 border-border pl-3' : 'mt-4'}`}>
        <div className="flex gap-3 text-sm group/comment">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center overflow-hidden flex-shrink-0 mt-0.5">
            {comment.users?.avatar_url ? <img src={comment.users.avatar_url} className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-white">{comment.users?.nombre?.charAt(0)}</span>}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-foreground">{comment.users?.nombre}</span>
                  <span className="text-xs text-muted-foreground font-medium">{new Date(comment.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-foreground/90 whitespace-pre-wrap">{comment.content}</p>
              </div>
              
              {isCommentAuthor && (
                <button 
                  onClick={() => handleDeleteComment(comment.id)} 
                  className="text-muted-foreground hover:text-destructive transition-colors p-1 opacity-0 group-hover/comment:opacity-100" 
                  title="Delete comment"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            
            <div className="mt-1 flex items-center gap-4">
              <button 
                data-protected="true"
                onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText('') }}
                className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                <Reply size={12} /> Reply
              </button>
            </div>

            {replyingTo === comment.id && currentUserId && (
              <form onSubmit={(e) => submitComment(e, comment.id)} className="flex gap-2 mt-3 mb-2 relative animate-in fade-in zoom-in-95">
                <input
                  type="text"
                  autoFocus
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Replying to ${comment.users?.nombre}...`}
                  className="flex-1 bg-muted border border-border rounded-full px-4 py-1.5 text-sm focus:outline-none focus:border-primary pr-16"
                  disabled={isSubmitting}
                />
                <button type="button" onClick={() => setReplyingTo(null)} className="absolute right-9 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
                <button type="submit" disabled={!replyText.trim() || isSubmitting} className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80 disabled:opacity-50">
                  <Send size={14} />
                </button>
              </form>
            )}
          </div>
        </div>
        
        {replies.length > 0 && (
          <div className="mt-1">
            {replies.map((reply: any) => renderCommentNode(reply, true))}
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
      <AlertDialogAction 
        onClick={confirmDeleteComment} 
        className="bg-red-500 hover:bg-red-600 text-white"
      >
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full h-full snap-start snap-always bg-black flex items-center justify-center">
      <video ref={videoRef} src={clip.video_url} className="absolute inset-0 w-full h-full object-contain cursor-pointer" loop playsInline onClick={togglePlay} />

      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer bg-black/20" onClick={togglePlay}>
          <div className="bg-black/50 p-4 rounded-full text-white transition-transform hover:scale-110"><Play size={48} className="fill-white" /></div>
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-4 pb-6 md:pb-8 z-20">
        <div className="flex items-end justify-between w-full h-full">
          
          <div className="w-[75%] text-white pointer-events-auto mt-auto">
            <Link href={`/profile/${clip.user_id}`} className="font-bold text-[17px] hover:underline mb-2 block drop-shadow-md">
              @{clip.users?.nombre || 'User'}
            </Link>
            <p className="text-sm mb-3 drop-shadow-md line-clamp-3">{clip.content}</p>
            <div className="flex items-center gap-2 text-sm bg-black/40 rounded-full px-3 py-1.5 w-fit backdrop-blur-sm">
              <Music size={14} className="animate-spin-slow" />
              <span className="truncate max-w-[150px] font-medium">{clip.audios?.title || 'Original Audio'}</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 pb-2 pointer-events-auto mt-auto">
            <Link href={`/profile/${clip.user_id}`} className="w-12 h-12 rounded-full overflow-hidden border-2 border-white mb-2">
              {clip.users?.avatar_url ? <img src={clip.users.avatar_url} alt="Creator" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-primary flex items-center justify-center font-bold text-white">{clip.users?.nombre?.charAt(0) || 'U'}</div>}
            </Link>

            <button data-protected="true" onClick={handleLike} className="flex flex-col items-center gap-1 group">
              <div className="p-3 bg-black/20 rounded-full backdrop-blur-sm transition-colors">
                <Heart size={28} className={hasLiked ? "fill-red-500 text-red-500" : "text-white fill-transparent"} />
              </div>
              <span className="text-white text-xs font-semibold drop-shadow-md">{likesCount}</span>
            </button>

            {/* comment button */}
            <Dialog open={showComments} onOpenChange={setShowComments}>
              <DialogTrigger>
                <button className="flex flex-col items-center gap-1 group">
                  <div className="p-3 bg-black/20 rounded-full backdrop-blur-sm transition-colors">
                    <MessageCircle size={28} className="text-white fill-transparent" />
                  </div>
                  <span className="text-white text-xs font-semibold drop-shadow-md">{comments.length}</span>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] h-[75vh] flex flex-col bg-card border-border">
                <DialogHeader><DialogTitle>Comments</DialogTitle></DialogHeader>
                
                <div className="flex-1 overflow-y-auto space-y-2 py-4 hide-scrollbar">
                  {comments.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-4">No comments yet. Be the first to comment!</p>
                  ) : (
                    topLevelComments.map((comment: any) => renderCommentNode(comment))
                  )}
                </div>
                {currentUserId ? (
                  <form onSubmit={(e) => submitComment(e, null)} className="mt-auto border-t border-border pt-4 flex gap-2 relative">
                  <input 
                    type="text" 
                    value={newComment} 
                    onChange={e => setNewComment(e.target.value)} 
                    placeholder="Add a comment..." 
                    className="flex-1 bg-muted border border-border rounded-full px-4 py-2.5 text-sm outline-none pr-12 focus:ring-1 focus:ring-primary" 
                    disabled={isSubmitting}
                  />
                  {newComment.trim() && (
                    <button type="submit" disabled={isSubmitting} className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-primary font-semibold text-sm hover:text-primary/80 disabled:opacity-50">
                      Post
                    </button>
                  )}
                </form>
                )
              : (<p className="text-center text-muted-foreground text-sm py-4">Please sign in to add a comment.</p>)}
                
              </DialogContent>
            </Dialog>

            <button onClick={handleShare} className="flex flex-col items-center gap-1 group">
              <div className="p-3 bg-black/20 rounded-full backdrop-blur-sm transition-colors">
                {copied ? <Check size={28} className="text-green-400" /> : <Share2 size={28} className="text-white fill-transparent" />}
              </div>
              <span className="text-white text-xs font-semibold drop-shadow-md">{clip.shares_count || 'Share'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CampusClipsPage() {
  return (
    <Suspense fallback={
      <div className="h-[calc(100vh-4rem)] flex justify-center items-center bg-black">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    }>
      <ClipsContent />
    </Suspense>
  )
}