'use client';

import { Search, Bell, LogOut, Users, User as UserIcon, FileText, Library, Check, Heart, UserPlus, MessageCircle } from 'lucide-react';
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
  const [suggestions, setSuggestions] = useState({ users: [] as any[], posts: [] as any[] });
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

  // Función para buscar notificaciones
  const fetchNotifications = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id, type, is_read, created_at, post_id,
          sender:users!fk_notification_sender(id, nombre, apellido, avatar_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (error) {
      console.error("Error fetching notifications", error);
    }
  };

  // Marcar como leída
  const markAsRead = async (notificationId: string) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking read", error);
    }
  };

  const markAllAsRead = async () => {
    if (!currentUserId) return;
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', currentUserId).eq('is_read', false);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) { console.error(error) }
  };

  // Búsqueda...
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length < 2) { setSuggestions({ users: [], posts: [] }); setIsSearching(false); return; }
      setIsSearching(true);
      const query = searchQuery.trim();
      try {
        const [usersRes, postsRes] = await Promise.all([
          supabase.from('users').select('id, nombre, apellido, avatar_url').or(`nombre.ilike.%${query}%,apellido.ilike.%${query}%`).limit(3),
          supabase.from('posts').select('id, content').ilike('content', `%${query}%`).limit(3)
        ]);
        setSuggestions({ users: usersRes.data || [], posts: postsRes.data || [] });
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

  // Función auxiliar para renderizar el texto e ícono de la notificación
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

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-background border-b border-border z-50 flex items-center justify-between px-4 md:px-6">
      
      {/* Buscador (Tu código intacto aquí) */}
      <form ref={searchRef} onSubmit={handleSearchSubmit} className="flex-1 max-w-md hidden sm:flex items-center relative">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setShowSuggestions(true);}} onFocus={() => setShowSuggestions(true)} placeholder="Search users, posts, groups..." className="w-full pl-10 pr-4 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground" autoComplete="off" />
        </div>
        {/* Ventana de sugerencias (oculta por brevedad, está intacta en tu código original) */}
      </form>

      <div className="flex-1 flex justify-center md:hidden">
        <span className="font-semibold text-foreground">Muro</span>
      </div>

      {/* Íconos Derechos */}
      <div className="flex items-center gap-2 sm:gap-4">
        {!loading && isLoggedIn && currentUserId && (
          <>
            <Link href="/groups" className="relative p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground hidden sm:block">
              <Library className="w-5 h-5" />
            </Link>
            
            <Link href="/friends" className="relative p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground hidden sm:block">
              <Users className="w-5 h-5" />
            </Link>

            {/* CAMPANA DE NOTIFICACIONES */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground outline-none">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground ring-2 ring-background">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 mr-4 mt-1 border-border shadow-lg" align="end">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="font-semibold text-foreground">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-xs text-primary hover:underline font-medium">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-[350px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No tienes notificaciones aún.
                    </div>
                  ) : (
                    notifications.map(notif => {
                      const { icon, text } = renderNotificationContent(notif);
                      return (
                        <div 
                          key={notif.id} 
                          onClick={() => !notif.is_read && markAsRead(notif.id)}
                          className={`flex items-start gap-3 p-3 border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer ${notif.is_read ? 'opacity-70' : 'bg-primary/5'}`}
                        >
                          <div className="mt-1 flex-shrink-0 bg-background p-1.5 rounded-full border border-border shadow-sm">
                            {icon}
                          </div>
                          <div className="flex-1 min-w-0 text-sm text-foreground">
                            <p className="line-clamp-2 leading-tight mb-1">{text}</p>
                            <span className="text-xs text-muted-foreground font-medium">
                              {new Date(notif.created_at).toLocaleDateString()}
                            </span>
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
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm shadow-sm">
                {initials || 'U'}
              </div>
            </Link>

            <button onClick={handleSignOut} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors ml-1 hidden sm:block">
              <LogOut className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </header>
  );
}