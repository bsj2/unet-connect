'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PostCard } from '@/components/post-card'
import { CreatePostCard } from '@/components/create-post-card'
import Link from 'next/link'
import { ArrowLeft, Users, UserPlus, LogOut, Library, Settings, Camera, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"

export default function GroupPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string

  const [group, setGroup] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [memberCount, setMemberCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Estados de Configuración
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editDescription, setEditDescription] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const fetchGroupData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const myId = session?.user?.id
      if (myId) setCurrentUserId(myId)

      // 1. Traer datos del grupo
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single()

      if (groupError) throw groupError
      setGroup(groupData)
      setEditDescription(groupData.description || '')

      // 2. Traer cantidad de miembros
      const { count } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
      setMemberCount(count || 0)

      // 3. Verificar si soy miembro
      if (myId) {
        const { data: memberData } = await supabase
          .from('group_members')
          .select('*')
          .eq('group_id', groupId)
          .eq('user_id', myId)
          .maybeSingle()
        
        setIsMember(!!memberData)
      }

      // 4. Traer SOLO los posts de este grupo
      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          users (nombre, apellido, rol, email, avatar_url),
          comments (id, content, created_at, user_id, users(nombre, apellido)),
          reactions (id, user_id)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })

      if (postsData) setPosts(postsData)

    } catch (error) {
      console.error("Error loading group:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (groupId) fetchGroupData()
  }, [groupId])

  // --- ACCIONES DEL GRUPO ---
  const handleJoinGroup = async () => {
    if (!currentUserId) return
    setActionLoading(true)
    try {
      const { error } = await supabase.from('group_members').insert({
        group_id: groupId,
        user_id: currentUserId,
        role: 'MEMBER'
      })
      if (error) throw error
      setIsMember(true)
      setMemberCount(prev => prev + 1)
    } catch (error: any) { alert("Error joining group: " + error.message) } finally { setActionLoading(false) }
  }

  const handleLeaveGroup = async () => {
    if (!currentUserId) return
    const confirm = window.confirm("Are you sure you want to leave this group?")
    if (!confirm) return
    
    setActionLoading(true)
    try {
      const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', currentUserId)
      if (error) throw error
      setIsMember(false)
      setMemberCount(prev => Math.max(0, prev - 1))
    } catch (error: any) { alert("Error leaving group: " + error.message) } finally { setActionLoading(false) }
  }

  const handleDeletePost = async (postId: string) => {
    try {
      await supabase.from('posts').delete().eq('id', postId)
      setPosts(posts.filter(p => p.id !== postId))
    } catch (error) { console.error(error) }
  }

  // --- CONFIGURACIÓN DEL GRUPO ---
  const handleSaveSettings = async () => {
    if (!currentUserId) return
    setIsSaving(true)
    try {
      let updatedAvatarUrl = group.avatar_url
      let updatedBannerUrl = group.banner_url

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const filePath = `${groupId}/avatar_${Date.now()}.${fileExt}`
        await supabase.storage.from('groups').upload(filePath, avatarFile)
        updatedAvatarUrl = supabase.storage.from('groups').getPublicUrl(filePath).data.publicUrl
      }

      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop()
        const filePath = `${groupId}/banner_${Date.now()}.${fileExt}`
        await supabase.storage.from('groups').upload(filePath, bannerFile)
        updatedBannerUrl = supabase.storage.from('groups').getPublicUrl(filePath).data.publicUrl
      }

      const { error } = await supabase.from('groups').update({
        description: editDescription.trim(),
        avatar_url: updatedAvatarUrl,
        banner_url: updatedBannerUrl
      }).eq('id', groupId)

      if (error) throw error

      setGroup({
        ...group,
        description: editDescription.trim(),
        avatar_url: updatedAvatarUrl,
        banner_url: updatedBannerUrl
      })

      setAvatarFile(null)
      setBannerFile(null)
      setIsSettingsOpen(false)
    } catch (error: any) {
      alert("Error al actualizar el grupo: " + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteGroup = async () => {
    const confirm = window.confirm("ATENCIÓN: ¿Estás seguro de que quieres eliminar este grupo de forma permanente? Se perderán todas las publicaciones.")
    if (!confirm) return

    setIsDeleting(true)
    try {
      const { error } = await supabase.from('groups').delete().eq('id', groupId)
      if (error) throw error
      router.push('/groups') // Redirigir al directorio de grupos
    } catch (error: any) {
      alert("Error al eliminar el grupo: " + error.message)
      setIsDeleting(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-muted-foreground">Cargando grupo...</div>
  if (!group) return <div className="text-center py-20 text-red-500">Grupo no encontrado</div>

  const isCreator = currentUserId === group.creator_id

  return (
    <div className="min-h-screen bg-background pb-10">
      
      {/* Banner del Grupo */}
      <div className="h-48 md:h-64 w-full bg-muted relative border-b border-border">
        {group.banner_url ? (
          <img src={group.banner_url} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-primary/20 to-primary/5 flex items-center justify-center"></div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabecera y Botones */}
        <div className="relative flex justify-between items-end -mt-8 md:-mt-12 mb-6">
          <div className="w-16 h-16 md:w-24 md:h-24 rounded-xl border-4 border-background bg-card flex items-center justify-center overflow-hidden z-10 shadow-md">
             {group.avatar_url ? (
               <img src={group.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
             ) : (
               <Library className="w-8 h-8 md:w-12 md:h-12 text-primary" />
             )}
          </div>

          <div className="mb-2 md:mb-4 flex items-center gap-2">
            {/* Botón Settings SOLO para el creador */}
            {isCreator && (
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors border border-border">
                  <Settings size={18} />
                  <span className="hidden sm:inline">Settings</span>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Group Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={(e) => e.target.files && setAvatarFile(e.target.files[0])} />
                    <input type="file" accept="image/*" className="hidden" ref={bannerInputRef} onChange={(e) => e.target.files && setBannerFile(e.target.files[0])} />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => avatarInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 p-4 border border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                        <Camera size={24} />
                        <span className="text-xs font-medium text-center">{avatarFile ? avatarFile.name : 'Change Icon'}</span>
                      </button>
                      <button onClick={() => bannerInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 p-4 border border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                        <ImageIcon size={24} />
                        <span className="text-xs font-medium text-center">{bannerFile ? bannerFile.name : 'Change Banner'}</span>
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Group Description</label>
                      <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="What is this group about?" className="w-full bg-muted/50 border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" rows={4} />
                    </div>
                    
                    {/* ZONA DE PELIGRO */}
                    <div className="pt-4 border-t border-border mt-4">
                      <button 
                        onClick={handleDeleteGroup}
                        disabled={isDeleting}
                        className="w-full flex items-center justify-center gap-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors"
                      >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 size={18} />}
                        Delete Group Permanently
                      </button>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <button onClick={handleSaveSettings} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2">
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Botones de Unirse/Salir (El creador NO puede salir, o si puede, el botón está disponible) */}
            {!isCreator && (
              !isMember ? (
                <button onClick={handleJoinGroup} disabled={actionLoading} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50 min-w-[120px] justify-center">
                  <UserPlus size={18} />
                  <span>Join Group</span>
                </button>
              ) : (
                <button onClick={handleLeaveGroup} disabled={actionLoading} className="flex items-center justify-center gap-2 bg-secondary hover:bg-destructive hover:text-destructive-foreground text-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors border border-border disabled:opacity-50 group min-w-[120px]">
                  <Users size={18} className="group-hover:hidden" />
                  <LogOut size={18} className="hidden group-hover:block" />
                  <span className="hidden sm:block sm:group-hover:hidden">Joined</span>
                  <span className="hidden sm:group-hover:block">Leave Group</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Información y Muro */}
        <div className="mb-8">
          <Link href="/groups" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft size={16} /> Back to groups
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {group.name}
          </h1>
          <p className="text-muted-foreground mb-4">
            {group.description || "Sin descripción."}
          </p>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground bg-muted/50 w-fit px-3 py-1.5 rounded-full">
            <Users size={16} />
            <span>{memberCount} miembros</span>
          </div>
        </div>

        <div className="h-px w-full bg-border mb-8" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="font-semibold text-foreground mb-3">About this Group</h3>
              <p className="text-sm text-muted-foreground">
                Espacio de discusión privado. Solo los miembros pueden publicar aquí.
              </p>
            </div>
          </div>

          <div className="md:col-span-2 space-y-4">
            {isMember || isCreator ? (
              <CreatePostCard onPostCreated={fetchGroupData} groupId={groupId} />
            ) : (
              <div className="bg-card border border-border rounded-lg p-6 text-center mb-6">
                <p className="text-muted-foreground text-sm">Join this group to participate in the discussion and post updates.</p>
              </div>
            )}
            
            {posts.length === 0 ? (
              <div className="text-center p-8 bg-muted/20 border border-border rounded-lg text-muted-foreground text-sm">
                No hay publicaciones en este grupo todavía.
              </div>
            ) : (
              posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId}
                  onDelete={handleDeletePost}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}