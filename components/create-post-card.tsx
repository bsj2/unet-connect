'use client'

import { useState, useRef } from 'react'
import { Image as ImageIcon, FileText, Loader2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { containsInappropriateContent } from '@/lib/moderation' // <-- Importamos el filtro
import { toast } from './ui/toast'

interface CreatePostCardProps {
  onPostCreated: () => void
  groupId?: string
}

export function CreatePostCard({ onPostCreated, groupId }: CreatePostCardProps) {
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePost = async () => {
    if (!text.trim() && !selectedImage && !selectedFile) return

    if (text.trim() && containsInappropriateContent(text)) {
      toast.add({ title: "Inappropriate Content", description: "Your post contains inappropriate content. Please revise it.", type: "warning" })
      return
    }

    setIsSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        toast.add({ title: "Not Logged In", description: "You must be logged in to create a post.", type: "error" })
        setIsSubmitting(false)
        return
      }

      let image_url = null
      let file_url = null

      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${session.user.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('post_media')
          .upload(filePath, selectedImage)

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('post_media').getPublicUrl(filePath)
        image_url = data.publicUrl
      }

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${session.user.id}/docs/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('post_media')
          .upload(filePath, selectedFile)

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('post_media').getPublicUrl(filePath)
        file_url = data.publicUrl
      }

      const { error } = await supabase.from('posts').insert({
        user_id: session.user.id,
        content: text.trim(),
        type: 'post',
        image_url: image_url,
        file_url: file_url,
        file_name: selectedFile ? selectedFile.name : null,
        group_id: groupId || null 
      })

      if (error) throw error

      setText('')
      setSelectedImage(null)
      setSelectedFile(null)
      onPostCreated()
      
    } catch (error: any) {
      toast.add({ title: "Error", description: "Error publishing post: " + error.message, type: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-primary">You</span>
        </div>

        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share something with your university community..."
            className="w-full bg-muted/50 border border-border rounded-lg p-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent resize-none"
            rows={3}
            disabled={isSubmitting}
          />

          {(selectedImage || selectedFile) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedImage && (
                <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-md text-sm">
                  <ImageIcon size={14} />
                  <span className="truncate max-w-[150px]">{selectedImage.name}</span>
                  <button onClick={() => setSelectedImage(null)} className="hover:text-red-500"><X size={14} /></button>
                </div>
              )}
              {selectedFile && (
                <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-md text-sm">
                  <FileText size={14} />
                  <span className="truncate max-w-[150px]">{selectedFile.name}</span>
                  <button onClick={() => setSelectedFile(null)} className="hover:text-red-500"><X size={14} /></button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={imageInputRef} 
                onChange={(e) => e.target.files && setSelectedImage(e.target.files[0])} 
              />
              <input 
                type="file" 
                accept=".pdf,.doc,.docx,.txt" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])} 
              />

              <button
                onClick={() => imageInputRef.current?.click()}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                title="Attach image"
                disabled={isSubmitting}
              >
                <ImageIcon size={20} />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                title="Attach Document"
                disabled={isSubmitting}
              >
                <FileText size={20} />
              </button>
            </div>

            <button
              onClick={handlePost}
              disabled={(!text.trim() && !selectedImage && !selectedFile) || isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}