'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { UserPlus, UserCheck, Clock, UserMinus, Check, X as XIcon, BookOpen, GraduationCap, Camera, Loader2, Image as ImageIcon, Users, UserPlus2, Info, Play, MessageSquare, Store, Tag } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ProfileGrid } from '@/components/profile-grid'
import { PostCard } from '@/components/post-card' // Asegúrate de ajustar la ruta si difiere
import Link from 'next/link'

export default function ProfilePage() {
  const params = useParams()
  const profileId = params.id as string

  const [profile, setProfile] = useState<any>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Estados de Edición
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editBio, setEditBio] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  // Estados de Amistad y Seguidores
  const [connectionStatus, setConnectionStatus] = useState<'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'ACCEPTED'>('NONE')
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [friendsCount, setFriendsCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followId, setFollowId] = useState<string | null>(null)
  const [followersCount, setFollowersCount] = useState(0)
  const [isConnectionLoading, setIsConnectionLoading] = useState(false)
  
  // Estados para las distintas publicaciones
  const [communityPosts, setCommunityPosts] = useState<any[]>([])
  const [clips, setClips] = useState<any[]>([])
  const [tradeProducts, setTradeProducts] = useState<any[]>([])

  const fetchProfileData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const myId = session?.user?.id
      if (myId) setCurrentUserId(myId)

      // 1. Traer datos del perfil
      const { data: profileData } = await supabase.from('users').select('*').eq('id', profileId).single()
      setProfile(profileData)
      if (profileData) setEditBio(profileData.biografia || '')

      // 2. Traer conteos de amigos y seguidores
      const { count: fCount } = await supabase.from('connections').select('*', { count: 'exact', head: true }).eq('type', 'FRIEND').eq('status', 'ACCEPTED').or(`sender_id.eq.${profileId},receiver_id.eq.${profileId}`)
      setFriendsCount(fCount || 0)
      const { count: folCount } = await supabase.from('connections').select('*', { count: 'exact', head: true }).eq('type', 'FOLLOW').eq('status', 'ACCEPTED').eq('receiver_id', profileId)
      setFollowersCount(folCount || 0)

      // 3. Traer publicaciones de Comunidad (Posts de texto/discusión)
      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          users (nombre, apellido, avatar_url),
          comments (id, content, created_at, user_id, users(nombre, apellido, avatar_url)),
          reactions (id, user_id, reaction_type)
        `)
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })

      setCommunityPosts(postsData || [])

      // 4. Traer Clips del usuario
      const { data: clipsData } = await supabase
        .from('clips')
        .select('id, video_url, likes_count, clip_likes(user_id)')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })
      
      setClips(clipsData || [])

      // 5. Traer artículos/servicios de UNET-Trade
      const { data: tradeData } = await supabase
        .from('products')
        .select('*, seller:users(id, nombre, apellido, avatar_url)')
        .eq('seller_id', profileId)
        .order('created_at', { ascending: false })

      setTradeProducts(tradeData || [])

      // Check de estado de relaciones
      if (myId && myId !== profileId) {
        const { data: friendData } = await supabase.from('connections').select('*').eq('type', 'FRIEND').or(`and(sender_id.eq.${myId},receiver_id.eq.${profileId}),and(sender_id.eq.${profileId},receiver_id.eq.${myId})`).maybeSingle()
        if (friendData) {
          setConnectionId(friendData.id)
          if (friendData.status === 'ACCEPTED') setConnectionStatus('ACCEPTED')
          else if (friendData.status === 'PENDING') setConnectionStatus(friendData.sender_id === myId ? 'PENDING_SENT' : 'PENDING_RECEIVED')
        }
        const { data: followData } = await supabase.from('connections').select('*').eq('type', 'FOLLOW').eq('sender_id', myId).eq('receiver_id', profileId).maybeSingle()
        if (followData) { setIsFollowing(true); setFollowId(followData.id) }
      }
    } catch (error) { console.error(error) } finally { setLoading(false) }
  }

  useEffect(() => {
    if (profileId) fetchProfileData()
  }, [profileId])

  const handleDeletePost = (postId: string) => {
    setCommunityPosts(prev => prev.filter(p => p.id !== postId))
  }

  const toggleFollow = async () => {
    if (!currentUserId) return
    setIsConnectionLoading(true)
    try {
      if (isFollowing && followId) {
        await supabase.from('connections').delete().eq('id', followId)
        setIsFollowing(false); setFollowId(null); setFollowersCount(prev => Math.max(0, prev - 1))
      } else {
        const { data, error } = await supabase.from('connections').insert({ sender_id: currentUserId, receiver_id: profileId, type: 'FOLLOW', status: 'ACCEPTED' }).select().single()
        if (error) throw error
        setIsFollowing(true); setFollowId(data.id); setFollowersCount(prev => prev + 1)
      }
    } catch (error) { console.error(error) } finally { setIsConnectionLoading(false) }
  }

  const sendFriendRequest = async () => {
    if (!currentUserId) return
    setIsConnectionLoading(true)
    try {
      const { data, error } = await supabase.from('connections').insert({ sender_id: currentUserId, receiver_id: profileId, type: 'FRIEND', status: 'PENDING' }).select().single()
      if (error) throw error
      setConnectionId(data.id); setConnectionStatus('PENDING_SENT')
    } catch (error) { console.error(error) } finally { setIsConnectionLoading(false) }
  }

  const cancelOrRemoveFriend = async () => {
    if (!connectionId) return
    setIsConnectionLoading(true)
    try {
      await supabase.from('connections').delete().eq('id', connectionId)
      setConnectionId(null); setConnectionStatus('NONE')
      if (connectionStatus === 'ACCEPTED') setFriendsCount(prev => Math.max(0, prev - 1))
    } catch (error) { console.error(error) } finally { setIsConnectionLoading(false) }
  }

  const acceptFriendRequest = async () => {
    if (!connectionId) return
    setIsConnectionLoading(true)
    try {
      await supabase.from('connections').update({ status: 'ACCEPTED' }).eq('id', connectionId)
      setConnectionStatus('ACCEPTED'); setFriendsCount(prev => prev + 1)
    } catch (error) { console.error(error) } finally { setIsConnectionLoading(false) }
  }

  const handleSaveProfile = async () => {
    if (!currentUserId) return
    setIsSaving(true)
    try {
      let updatedAvatarUrl = profile.avatar_url; let updatedBannerUrl = profile.banner_url
      if (avatarFile) {
        const filePath = `${currentUserId}/avatar_${Date.now()}.${avatarFile.name.split('.').pop()}`
        await supabase.storage.from('profiles').upload(filePath, avatarFile)
        updatedAvatarUrl = supabase.storage.from('profiles').getPublicUrl(filePath).data.publicUrl
      }
      if (bannerFile) {
        const filePath = `${currentUserId}/banner_${Date.now()}.${bannerFile.name.split('.').pop()}`
        await supabase.storage.from('profiles').upload(filePath, bannerFile)
        updatedBannerUrl = supabase.storage.from('profiles').getPublicUrl(filePath).data.publicUrl
      }
      await supabase.from('users').update({ biografia: editBio.trim(), avatar_url: updatedAvatarUrl, banner_url: updatedBannerUrl }).eq('id', currentUserId)
      setProfile({ ...profile, biografia: editBio.trim(), avatar_url: updatedAvatarUrl, banner_url: updatedBannerUrl })
      setAvatarFile(null); setBannerFile(null); setIsEditOpen(false)
    } catch (error: any) { alert(error.message) } finally { setIsSaving(false) }
  }

  if (loading) return <div className="text-center py-20 text-muted-foreground">Cargando perfil...</div>
  if (!profile) return <div className="text-center py-20 text-red-500">Perfil no encontrado</div>

  const isMyProfile = currentUserId === profile.id
  const initials = `${profile.nombre?.charAt(0) || ''}${profile.apellido?.charAt(0) || ''}`

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="h-48 md:h-64 w-full bg-muted relative border-b border-border">
        {profile.banner_url && <img src={profile.banner_url} alt="Cover" className="w-full h-full object-cover" />}
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex justify-between items-end -mt-12 md:-mt-16 mb-6">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-background bg-primary flex items-center justify-center overflow-hidden z-10 shadow-md">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl md:text-5xl font-bold text-primary-foreground">{initials}</span>
            )}
          </div>

          <div className="mb-2 md:mb-4 flex items-center gap-2">
            {!isMyProfile ? (
              <>
                <button onClick={toggleFollow} disabled={isConnectionLoading} className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50 ${isFollowing ? 'bg-secondary hover:bg-destructive hover:text-destructive-foreground text-foreground border border-border' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}`}>
                  <UserPlus2 size={18} />
                  <span className="hidden sm:inline">{isFollowing ? 'Unfollow' : 'Follow'}</span>
                </button>
                {connectionStatus === 'NONE' && (
                  <button onClick={sendFriendRequest} disabled={isConnectionLoading} className="flex items-center gap-2 bg-secondary text-foreground border border-border hover:bg-secondary/80 px-4 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50">
                    <UserPlus size={18} />
                    <span className="hidden sm:inline">Add Friend</span>
                  </button>
                )}
                {connectionStatus === 'PENDING_SENT' && (
                  <button onClick={cancelOrRemoveFriend} disabled={isConnectionLoading} className="flex items-center gap-2 bg-muted hover:bg-destructive hover:text-destructive-foreground text-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50 group">
                    <Clock size={18} className="group-hover:hidden" />
                    <XIcon size={18} className="hidden group-hover:block" />
                    <span className="hidden sm:inline group-hover:hidden">Request Sent</span>
                    <span className="hidden sm:inline group-hover:block">Cancel</span>
                  </button>
                )}
                {connectionStatus === 'PENDING_RECEIVED' && (
                  <button onClick={acceptFriendRequest} disabled={isConnectionLoading} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50">
                    <Check size={18} />
                    <span className="hidden sm:inline">Accept</span>
                  </button>
                )}
                {connectionStatus === 'ACCEPTED' && (
                  <button onClick={cancelOrRemoveFriend} disabled={isConnectionLoading} className="flex items-center gap-2 bg-secondary hover:bg-destructive hover:text-destructive-foreground text-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50 group border border-border">
                    <UserCheck size={18} className="group-hover:hidden" />
                    <UserMinus size={18} className="hidden group-hover:block" />
                    <span className="hidden sm:inline group-hover:hidden">Friends</span>
                    <span className="hidden sm:inline group-hover:block">Unfriend</span>
                  </button>
                )}
              </>
            ) : (
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogTrigger className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors border border-border outline-none">
                  Edit Profile
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
                  <div className="space-y-6 py-4">
                    <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={(e) => e.target.files && setAvatarFile(e.target.files[0])} />
                    <input type="file" accept="image/*" className="hidden" ref={bannerInputRef} onChange={(e) => e.target.files && setBannerFile(e.target.files[0])} />
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => avatarInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 p-4 border border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                        <Camera size={24} /><span className="text-xs font-medium text-center">{avatarFile ? avatarFile.name : 'Change Avatar'}</span>
                      </button>
                      <button onClick={() => bannerInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 p-4 border border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                        <ImageIcon size={24} /><span className="text-xs font-medium text-center">{bannerFile ? bannerFile.name : 'Change Cover'}</span>
                      </button>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Biography</label>
                      <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Tell the community about yourself..." className="w-full bg-muted/50 border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" rows={4} />
                    </div>
                  </div>
                  <DialogFooter>
                    <button onClick={handleSaveProfile} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2">
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Bloque Superior: Info y Bio juntas */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{profile.nombre} {profile.apellido}</h1>
          <p className="text-muted-foreground font-medium mb-4">{profile.rol} en la UNET</p>
          
          <div className="flex flex-col md:flex-row gap-6 mb-6">
            <div className="flex items-center gap-6 text-sm flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-lg">{followersCount}</span>
                <span className="text-muted-foreground">Followers</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-lg">{friendsCount}</span>
                <span className="text-muted-foreground">Friends</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground items-center">
              {profile.carrera && <div className="flex items-center gap-1.5 bg-muted px-3 py-1 rounded-full"><BookOpen size={14} /><span>{profile.carrera}</span></div>}
              {profile.semestre && <div className="flex items-center gap-1.5 bg-muted px-3 py-1 rounded-full"><GraduationCap size={14} /><span>Semestre {profile.semestre}</span></div>}
            </div>
          </div>

          {/* Biografía Integrada */}
          <div className="bg-muted/30 border border-border rounded-lg p-4 max-w-2xl">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
              <Info size={16} className="text-primary"/> About
            </h3>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {profile.biografia ? profile.biografia : <span className="text-muted-foreground italic">No biography provided yet.</span>}
            </p>
          </div>
        </div>

        <div className="h-px w-full bg-border mb-8" />

        {/* Bloque Inferior: Pestanias para todos los tipos de publicaciones */}
        <div className="w-full">
          <Tabs defaultValue="grid" className="w-full mt-4">
            <TabsList className="w-full grid grid-cols-4 bg-transparent border-b border-border rounded-none h-12 p-0 mb-6">
              <TabsTrigger 
                value="grid" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground rounded-none shadow-none h-full text-xs sm:text-sm font-semibold transition-none"
              >
                Grid
              </TabsTrigger>
              <TabsTrigger 
                value="posts" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground rounded-none shadow-none h-full text-xs sm:text-sm font-semibold transition-none"
              >
                Posts
              </TabsTrigger>
              <TabsTrigger 
                value="clips" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground rounded-none shadow-none h-full text-xs sm:text-sm font-semibold transition-none"
              >
                Clips
              </TabsTrigger>
              <TabsTrigger 
                value="trade" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground rounded-none shadow-none h-full text-xs sm:text-sm font-semibold transition-none"
              >
                Trade
              </TabsTrigger>
            </TabsList>
            
            {/* 1. TAB GRID (Visual Feed) */}
            <TabsContent value="grid" className="mt-0 outline-none">
              <ProfileGrid userId={params.id as string} />
            </TabsContent>

            {/* 2. TAB POSTS (Community / Feed de Texto) */}
            <TabsContent value="posts" className="mt-0 outline-none space-y-4 max-w-2xl mx-auto">
              {communityPosts.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  No community posts yet.
                </div>
              ) : (
                communityPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={currentUserId}
                    onDelete={handleDeletePost}
                  />
                ))
              )}
            </TabsContent>
            
            {/* 3. TAB CLIPS */}
            <TabsContent value="clips" className="mt-0 outline-none">
              {clips.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <Play className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  No clips uploaded yet.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 md:gap-4">
                  {clips.map((clip) => (
                    <Link 
                      key={clip.id} 
                      href={`/clips?id=${clip.id}`} 
                      className="relative aspect-[9/16] bg-muted cursor-pointer group overflow-hidden rounded-sm md:rounded-lg block"
                    >
                      <video src={clip.video_url} className="w-full h-full object-cover" preload="metadata" />
                      
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Play size={24} className="fill-white" />
                          <span>{clip.clip_likes?.length || clip.likes_count || 0}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 4. TAB TRADE (Marketplace Items) */}
            <TabsContent value="trade" className="mt-0 outline-none">
              {tradeProducts.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <Store className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  No items listed on UNET-Trade yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {tradeProducts.map((product) => (
                    <Link
                      key={product.id}
                      href={`/trade`}
                      className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col group"
                    >
                      <div className="relative aspect-square bg-muted overflow-hidden">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Tag className="opacity-20" size={36} />
                          </div>
                        )}
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <h4 className="font-semibold text-foreground text-sm line-clamp-1 mb-1">{product.title}</h4>
                        <span className="font-bold text-primary text-base">${product.price}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

      </div>
    </div>
  )
}