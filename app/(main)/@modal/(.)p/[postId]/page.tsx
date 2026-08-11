'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { VisualPostCard } from '@/components/visual-post-card'

export default function PostModalIntercept() {
  const params = useParams()
  const router = useRouter()
  const postId = params.postId as string 
  
  const [post, setPost] = useState<any | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  useEffect(() => {
    if (window.innerWidth < 768) {
      window.location.href = `/p/${postId}`
      return
    }

    const fetchPost = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) setCurrentUserId(session.user.id)

      const { data } = await supabase
        .from('posts')
        .select(`*, users (nombre, apellido, avatar_url), comments (id, content, created_at, user_id, parent_id, users(nombre, apellido, avatar_url)), reactions (id, user_id, reaction_type)`)
        .eq('id', postId)
        .single()
        
      if (data) setPost(data)
    }
    if (postId) fetchPost()
  }, [postId])

  if (!post) return null

  return (
    <Dialog open={true} onOpenChange={(open) => !open && router.back()}>
      <DialogContent className="sm:max-w-5xl p-0 overflow-hidden bg-background border-border shadow-2xl h-[90vh] flex flex-col hide-scrollbar">
        <DialogHeader className="sr-only">
          <DialogTitle>View Post</DialogTitle>
        </DialogHeader>
        
        <VisualPostCard post={post} currentUserId={currentUserId} layout="horizontal" />
      </DialogContent>
    </Dialog>
  )
}