'use client';

import { Search, Bell, LogOut, Users, User as UserIcon, FileText, Library, Check, Heart, UserPlus, MessageCircle, Video, Store, Loader2 } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function Header() {
  const router = useRouter();
  const [initials, setInitials] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados para Búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState({ users: [] as any[], posts: [] as any[], groups: [] as any[], clips: [] as any[], trade: [] as any[] });
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);

  // Estados para Notificaciones
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Cerrar sugerencias al clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auth y Fetch Notificaciones
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setIsLoggedIn(true);
        setCurrentUserId(session.user.id);
        const n = session.user.user_metadata?.nombre || '';
        const a = session.user.user_metadata?.apellido || '';
        setInitials(`${n.charAt(0).toUpperCase()}${a.charAt(0).toUpperCase()}`);
        
        fetchNotifications(session.user.id);
      } else {
        setIsLoggedIn(false);
        setCurrentUserId(null);
      }
      setLoading(false);
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setIsLoggedIn(true);
        setCurrentUserId(session.user.id);
        const n = session.user.user_metadata?.nombre || '';
        const a = session.user.user_metadata?.apellido || '';
        setInitials(`${n.charAt(0).toUpperCase()}${a.charAt(0).toUpperCase()}`);
        fetchNotifications(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false);
        setInitials('');
        setCurrentUserId(null);
        setNotifications([]);
        setUnreadCount(0);
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const fetchNotifications = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('notifications').select('id, type, is_read, created_at, post_id, sender:users!fk_notification_sender(id, nombre, apellido, avatar_url)').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      if (data) { setNotifications(data); setUnreadCount(data.filter(n => !n.is_read).length); }
    } catch (error) { console.error("Error fetching notifications", error); }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) { console.error("Error marking read", error); }
  };

  const markAllAsRead = async () => {
    if (!currentUserId) return;
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', currentUserId).eq('is_read', false);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) { console.error(error) }
  };

  // --- BÚSQUEDA EN TIEMPO REAL (PREVISUALIZACIÓN) ---
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length < 2) { 
        setSuggestions({ users: [], posts: [], groups: [], clips: [], trade: [] }); 
        setIsSearching(false); 
        return; 
      }
      setIsSearching(true);
      const query = searchQuery.trim();
      try {
        const [usersRes, postsRes, groupsRes, clipsRes, tradeRes] = await Promise.all([
          supabase.from('users').select('id, nombre, apellido, avatar_url').or(`nombre.ilike.%${query}%,apellido.ilike.%${query}%`).limit(3),
          supabase.from('posts').select('id, content').ilike('content', `%${query}%`).limit(3),
          supabase.from('groups').select('id, name').ilike('name', `%${query}%`).limit(3),
          supabase.from('clips').select('id, content').ilike('content', `%${query}%`).limit(3),
          supabase.from('products').select('id, title, price').ilike('title', `%${query}%`).eq('status', 'AVAILABLE').limit(3)
        ]);
        setSuggestions({ 
          users: usersRes.data || [], 
          posts: postsRes.data || [],
          groups: groupsRes.data || [],
          clips: clipsRes.data || [],
          trade: tradeRes.data || []
        });
      } catch (error) { console.error(error); } finally { setIsSearching(false); }
    };
    const delayDebounceFn = setTimeout(() => fetchSuggestions(), 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setShowSuggestions(false);
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleSignOut = async () => await supabase.auth.signOut();

  const renderNotificationContent = (notif: any) => {
    const senderName = `${notif.sender.nombre} ${notif.sender.apellido}`;
    switch (notif.type) {
      case 'LIKE': return { icon: <Heart size={16} className="text-red-500" />, text: <span><strong>{senderName}</strong> le dio like a tu publicación.</span> };
      case 'COMMENT': return { icon: <MessageCircle size={16} className="text-blue-500" />, text: <span><strong>{senderName}</strong> comentó en tu publicación.</span> };
      case 'FRIEND_REQUEST': return { icon: <UserPlus size={16} className="text-green-500" />, text: <span><strong>{senderName}</strong> te envió una solicitud de amistad.</span> };
      case 'FOLLOW': return { icon: <Users size={16} className="text-primary" />, text: <span><strong>{senderName}</strong> empezó a seguirte.</span> };
      default: return { icon: <Bell size={16} />, text: <span>Nueva notificación de {senderName}</span> };
    }
  };

  // Helper para saber si hay resultados en general
  const hasSuggestions = suggestions.users.length > 0 || suggestions.posts.length > 0 || suggestions.groups.length > 0 || suggestions.clips.length > 0 || suggestions.trade.length > 0;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-background border-b border-border z-[50] flex items-center justify-between px-4 md:px-6">
      
      {/* BUSCADOR CON DROPDOWN */}
      <form ref={searchRef} onSubmit={handleSearchSubmit} className="flex-1 max-w-md hidden sm:flex items-center relative">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setShowSuggestions(true);}} onFocus={() => setShowSuggestions(true)} placeholder="Search users, posts, groups, clips, trade..." className="w-full pl-10 pr-4 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground" autoComplete="off" />
          
          {/* Menú Desplegable de Resultados */}
          {showSuggestions && searchQuery.trim().length >= 2 && (
            <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 max-h-[60vh] flex flex-col">
              {isSearching ? (
                <div className="p-6 flex justify-center text-primary"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : !hasSuggestions ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No results found for &quot;{searchQuery}&quot;</div>
              ) : (
                <div className="overflow-y-auto hide-scrollbar">
                  
                  {/* Usuarios */}
                  {suggestions.users.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><UserIcon size={12}/> Users</div>
                      {suggestions.users.map(u => (
                        <Link key={u.id} href={`/profile/${u.id}`} onClick={() => setShowSuggestions(false)} className="flex items-center gap-3 p-2 hover:bg-muted rounded-md transition-colors">
                          <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center overflow-hidden">
                            {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <span className="text-white text-xs font-bold">{u.nombre?.charAt(0)}</span>}
                          </div>
                          <span className="text-sm font-medium text-foreground truncate">{u.nombre} {u.apellido}</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Productos (Trade) */}
                  {suggestions.trade.length > 0 && (
                    <div className="p-2 border-t border-border">
                      <div className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Store size={12}/> Trade</div>
                      {suggestions.trade.map(t => (
                        <Link key={t.id} href={`/search?q=${encodeURIComponent(t.title)}`} onClick={() => setShowSuggestions(false)} className="flex items-center gap-3 p-2 hover:bg-muted rounded-md transition-colors">
                          <div className="w-8 h-8 rounded-md bg-muted border border-border flex items-center justify-center"><Store size={14} className="text-muted-foreground"/></div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium text-foreground truncate">{t.title}</span>
                            <span className="text-xs text-primary font-bold">${t.price}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Clips */}
                  {suggestions.clips.length > 0 && (
                    <div className="p-2 border-t border-border">
                      <div className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Video size={12}/> Clips</div>
                      {suggestions.clips.map(c => (
                        <Link key={c.id} href={`/clips?id=${c.id}`} onClick={() => setShowSuggestions(false)} className="flex items-center gap-3 p-2 hover:bg-muted rounded-md transition-colors">
                          <div className="w-8 h-8 rounded-md bg-muted border border-border flex items-center justify-center"><Video size={14} className="text-muted-foreground"/></div>
                          <span className="text-sm font-medium text-foreground truncate line-clamp-1">{c.content || 'Video Clip'}</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Posts & Grupos... */}
                  {(suggestions.posts.length > 0 || suggestions.groups.length > 0) && (
                    <div className="p-2 border-t border-border">
                      {suggestions.groups.map(g => (
                         <Link key={g.id} href={`/search?q=${encodeURIComponent(g.name)}`} onClick={() => setShowSuggestions(false)} className="flex items-center gap-3 p-2 hover:bg-muted rounded-md transition-colors">
                           <Users size={16} className="text-muted-foreground ml-1" />
                           <span className="text-sm font-medium text-foreground truncate">{g.name}</span>
                         </Link>
                      ))}
                      {suggestions.posts.map(p => (
                         <Link key={p.id} href={`/search?q=${encodeURIComponent(p.content)}`} onClick={() => setShowSuggestions(false)} className="flex items-center gap-3 p-2 hover:bg-muted rounded-md transition-colors">
                           <FileText size={16} className="text-muted-foreground ml-1 flex-shrink-0" />
                           <span className="text-sm font-medium text-foreground truncate">{p.content}</span>
                         </Link>
                      ))}
                    </div>
                  )}

                  {/* Botón Ver Todo */}
                  <div className="p-2 border-t border-border bg-muted/30">
                    <button type="submit" className="w-full py-2 text-sm text-primary font-semibold hover:underline">
                      See all results for &quot;{searchQuery}&quot;
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </form>

      {/* Resto del Header (Móvil y Menú derecho) */}
      <div className="flex-1 flex justify-center md:hidden">
        <span className="font-semibold text-foreground">Muro</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {loading ? (
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        ) : isLoggedIn && currentUserId ? (
          <>
            <Link href="/groups" className="relative p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground hidden sm:block">
              <Library className="w-5 h-5" />
            </Link>
            
            <Link href="/friends" className="relative p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground hidden sm:block">
              <Users className="w-5 h-5" />
            </Link>

            <Popover>
              <PopoverTrigger className="relative p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground outline-none">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground ring-2 ring-background">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 mr-4 mt-1 border-border shadow-lg" align="end">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="font-semibold text-foreground">Notifications</h3>
                  {unreadCount > 0 && <button onClick={markAllAsRead} className="text-xs text-primary hover:underline font-medium">Mark all read</button>}
                </div>
                <div className="max-h-[350px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">No tienes notificaciones aún.</div>
                  ) : (
                    notifications.map(notif => {
                      const { icon, text } = renderNotificationContent(notif);
                      return (
                        <div key={notif.id} onClick={() => !notif.is_read && markAsRead(notif.id)} className={`flex items-start gap-3 p-3 border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer ${notif.is_read ? 'opacity-70' : 'bg-primary/5'}`}>
                          <div className="mt-1 flex-shrink-0 bg-background p-1.5 rounded-full border border-border shadow-sm">{icon}</div>
                          <div className="flex-1 min-w-0 text-sm text-foreground">
                            <p className="line-clamp-2 leading-tight mb-1">{text}</p>
                            <span className="text-xs text-muted-foreground font-medium">{new Date(notif.created_at).toLocaleDateString()}</span>
                          </div>
                          {!notif.is_read && <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />}
                        </div>
                      )
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Link href={`/profile/${currentUserId}`} className="flex items-center gap-2 pl-2 sm:border-l border-border cursor-pointer hover:opacity-80 transition-opacity ml-1">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm shadow-sm">{initials || 'U'}</div>
            </Link>

            <button onClick={handleSignOut} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors ml-1 hidden sm:block">
              <LogOut className="w-5 h-5" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3 pl-2 sm:border-l border-border">
            <Link href="/login" className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors">Sign in</Link>
          </div>
        )}
      </div>
    </header>
  );
}