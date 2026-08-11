'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Loader2, X, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog"
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

interface StoriesBarProps {
  currentUserId: string | null
}

export function StoriesBar({ currentUserId }: StoriesBarProps) {
  const [groupedStories, setGroupedStories] = useState<any[]>([])
  
  // Estados para "Mi Historia"
  const [myStories, setMyStories] = useState<any[]>([])
  const [myGroupFull, setMyGroupFull] = useState<any | null>(null)
  const [showOptionsDialog, setShowOptionsDialog] = useState(false)
  
  const [loading, setLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  
  // Estados para el visor interactivo de historias
  const [activeStoryGroup, setActiveStoryGroup] = useState<any | null>(null)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)

  // Estado para confirmación de borrado
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchStories = async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('stories')
        .select('*, users(id, nombre, apellido, avatar_url)')
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: true })

      if (error) throw error

      const grouped = (data || []).reduce((acc: any, story: any) => {
        const uid = story.user_id
        if (!acc[uid]) {
          acc[uid] = { user: story.users, stories: [] }
        }
        acc[uid].stories.push(story)
        return acc
      }, {})

      const myGroupRaw = currentUserId && grouped[currentUserId] ? grouped[currentUserId] : null
      setMyStories(myGroupRaw ? myGroupRaw.stories : [])
      setMyGroupFull(myGroupRaw)

      const othersGroups = Object.keys(grouped)
        .filter(uid => uid !== currentUserId)
        .map(uid => grouped[uid])

      setGroupedStories(othersGroups)
    } catch (error) {
      console.error("Error fetching stories:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStories()
  }, [currentUserId])

  // Resetear el índice a 0 cada vez que abrimos un grupo de historias nuevo
  useEffect(() => {
    if (activeStoryGroup) {
      setCurrentStoryIndex(0)
    }
  }, [activeStoryGroup])

  const handleUploadStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUserId) return

    setIsUploading(true)
    setShowOptionsDialog(false)
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${currentUserId}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('stories').upload(filePath, file)
      if (uploadError) throw uploadError

      const publicUrl = supabase.storage.from('stories').getPublicUrl(filePath).data.publicUrl

      const { error: dbError } = await supabase.from('stories').insert({
        user_id: currentUserId,
        media_url: publicUrl
      })
      if (dbError) throw dbError

      await fetchStories()
    } catch (error: any) {
      alert("Error uploading story: " + error.message)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteStory = async () => {
    if (!activeStoryGroup || !currentUserId) return
    setIsDeleting(true)
    
    try {
      const storyId = activeStoryGroup.stories[currentStoryIndex].id
      
      const { error } = await supabase.from('stories').delete().eq('id', storyId)
      if (error) throw error

      // Si era la única historia, cerramos el visor. Si no, ajustamos la vista actual.
      if (activeStoryGroup.stories.length <= 1) {
        setActiveStoryGroup(null)
      } else {
        const newStories = [...activeStoryGroup.stories]
        newStories.splice(currentStoryIndex, 1)
        setActiveStoryGroup({ ...activeStoryGroup, stories: newStories })
        if (currentStoryIndex >= newStories.length) {
          setCurrentStoryIndex(newStories.length - 1)
        }
      }

      await fetchStories()
    } catch (error: any) {
      alert("Error deleting story: " + error.message)
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleMyStoryClick = () => {
    if (isUploading) return
    if (myStories.length > 0) {
      setShowOptionsDialog(true)
    } else {
      fileInputRef.current?.click()
    }
  }

  // Navegación dentro del visor de historias
  const nextStory = () => {
    if (activeStoryGroup && currentStoryIndex < activeStoryGroup.stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1)
    } else {
      setActiveStoryGroup(null) // Cierra el visor si ya no hay más historias
    }
  }

  const prevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1)
    }
  }

  if (loading) {
    return <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar px-2"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground m-auto" /></div>
  }

  const isMyActiveStory = activeStoryGroup?.user?.id === currentUserId

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 pt-2 hide-scrollbar px-2">
        
        {/* MI HISTORIA */}
        <div className="flex flex-col items-center gap-1 min-w-[72px] cursor-pointer" onClick={handleMyStoryClick}>
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleUploadStory} disabled={isUploading} />
          
          <div className="relative">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center p-[2px] ${myStories.length > 0 ? 'bg-gradient-to-tr from-yellow-400 to-fuchsia-600' : 'bg-muted'}`}>
              <div className="w-full h-full rounded-full border-2 border-background overflow-hidden bg-secondary flex items-center justify-center">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : myStories.length > 0 ? (
                  <img src={myStories[myStories.length - 1].media_url} alt="My story" className="w-full h-full object-cover" />
                ) : (
                  <Plus className="w-6 h-6 text-foreground" />
                )}
              </div>
            </div>
            {myStories.length === 0 && !isUploading && (
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center border-2 border-background">
                <Plus size={12} strokeWidth={3} />
              </div>
            )}
          </div>
          <span className="text-xs font-medium text-foreground truncate w-16 text-center mt-1">
            Your story
          </span>
        </div>

        {/* HISTORIAS DE OTROS USUARIOS */}
        {groupedStories.map((group, index) => (
          <div key={index} className="flex flex-col items-center gap-1 min-w-[72px] cursor-pointer group" onClick={() => setActiveStoryGroup(group)}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center p-[2px] bg-gradient-to-tr from-yellow-400 to-fuchsia-600 hover:scale-105 transition-transform">
              <div className="w-full h-full rounded-full border-2 border-background overflow-hidden bg-secondary">
                {group.user?.avatar_url ? (
                  <img src={group.user.avatar_url} alt={group.user.nombre} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground font-bold">
                    {group.user?.nombre?.charAt(0)}{group.user?.apellido?.charAt(0)}
                  </div>
                )}
              </div>
            </div>
            <span className="text-xs font-medium text-foreground truncate w-16 text-center mt-1">
              {group.user?.nombre}
            </span>
          </div>
        ))}
      </div>

      {/* DIALOG DE OPCIONES PARA MI HISTORIA */}
      <Dialog open={showOptionsDialog} onOpenChange={setShowOptionsDialog}>
        <DialogContent className="sm:max-w-[300px]">
          <DialogHeader>
            <DialogTitle>Your Story</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            <button 
              onClick={() => { setShowOptionsDialog(false); setActiveStoryGroup(myGroupFull); }}
              className="w-full text-left px-4 py-3 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors text-foreground"
            >
              View your story
            </button>
            <button 
              onClick={() => { setShowOptionsDialog(false); fileInputRef.current?.click(); }}
              className="w-full text-left px-4 py-3 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors text-foreground"
            >
              Add to your story
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* VISOR DE HISTORIAS INTERACTIVO */}
      <Dialog open={!!activeStoryGroup} onOpenChange={(open) => !open && setActiveStoryGroup(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-black border-border shadow-2xl h-[80vh] flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>Viewing Story</DialogTitle>
          </DialogHeader>
          
          {activeStoryGroup && (
            <div className="flex-1 relative flex flex-col">
              
              {/* Barras de progreso superiores */}
              <div className="absolute top-2 left-2 right-2 flex gap-1 z-50 pointer-events-none">
                {activeStoryGroup.stories.map((_: any, idx: number) => (
                  <div 
                    key={idx} 
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      idx === currentStoryIndex ? 'bg-white' : idx < currentStoryIndex ? 'bg-white/70' : 'bg-white/30'
                    }`} 
                  />
                ))}
              </div>

              {/* Cabecera (Botones X y Delete, y datos del usuario) */}
              <div className="absolute top-0 left-0 right-0 p-4 pt-6 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent z-50 pointer-events-none">
                
                {/* Info del usuario (Izquierda) */}
                <div className="flex items-center gap-3 pointer-events-auto">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-primary flex-shrink-0 border border-white/20">
                    {activeStoryGroup.user?.avatar_url ? (
                       <img src={activeStoryGroup.user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-xs text-white font-bold">
                        {activeStoryGroup.user?.nombre?.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span className="text-white font-semibold text-sm drop-shadow-md">
                    {activeStoryGroup.user?.nombre} {activeStoryGroup.user?.apellido}
                  </span>
                  <span className="text-white/70 text-xs ml-2">
                    {new Date(activeStoryGroup.stories[currentStoryIndex].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Acciones (Derecha) */}
                <div className="flex items-center gap-2 pointer-events-auto">
                  {isMyActiveStory && (
                    <button 
                      onClick={() => setShowDeleteDialog(true)}
                      className="p-2 text-white/80 hover:text-white hover:bg-red-500/80 rounded-full transition-colors drop-shadow-md cursor-pointer"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                  <button 
                    onClick={() => setActiveStoryGroup(null)}
                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors drop-shadow-md cursor-pointer"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Áreas de clic invisibles para navegar */}
              <div className="absolute inset-0 z-10 flex">
                <div 
                  className="w-1/3 h-full cursor-pointer" 
                  onClick={(e) => { e.stopPropagation(); prevStory(); }} 
                />
                <div 
                  className="w-2/3 h-full cursor-pointer" 
                  onClick={(e) => { e.stopPropagation(); nextStory(); }} 
                />
              </div>

              {/* Imagen actual de la historia */}
              <div className="flex-1 bg-black flex items-center justify-center">
                 <img 
                   src={activeStoryGroup.stories[currentStoryIndex].media_url} 
                   alt="Story" 
                   className="w-full h-full object-contain"
                 />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG DE CONFIRMACIÓN DE BORRADO */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Story</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this story? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault()
                handleDeleteStory()
              }}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}