'use client';

import { Search, Bell, LogOut, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export function Header() {
  const [initials, setInitials] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setIsLoggedIn(true);
        setCurrentUserId(session.user.id); // Guardamos el ID para el enlace del perfil
        
        const nombre = session.user.user_metadata?.nombre || '';
        const apellido = session.user.user_metadata?.apellido || '';
        
        const inicialNombre = nombre.charAt(0).toUpperCase();
        const inicialApellido = apellido.charAt(0).toUpperCase();
        
        setInitials(`${inicialNombre}${inicialApellido}`);
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
        const nombre = session.user.user_metadata?.nombre || '';
        const apellido = session.user.user_metadata?.apellido || '';
        setInitials(`${nombre.charAt(0).toUpperCase()}${apellido.charAt(0).toUpperCase()}`);
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false);
        setInitials('');
        setCurrentUserId(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-background border-b border-border z-50 flex items-center justify-between px-4 md:px-6">
      {/* Left: Search Bar */}
      <div className="flex-1 max-w-md hidden sm:flex items-center">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Center: Logo/Title */}
      <div className="flex-1 flex justify-center md:hidden">
        <span className="font-semibold text-foreground">Muro</span>
      </div>

      {/* Right: Icons and Avatar or Login Button */}
      <div className="flex items-center gap-4">
        {!loading && (
          isLoggedIn ? (
            <>
              {/* Friends Icon */}
              <Link 
                href="/friends" 
                className="relative p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                title="Friends & Connections"
              >
                <Users className="w-5 h-5" />
              </Link>

              {/* Notification Bell */}
              <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
              </button>

              {/* User Avatar (Ahora clickeable hacia tu perfil) */}
              {currentUserId && (
                <Link 
                  href={`/profile/${currentUserId}`} 
                  className="flex items-center gap-2 pl-2 border-l border-border cursor-pointer hover:opacity-80 transition-opacity"
                  title="My Profile"
                >
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm shadow-sm">
                    {initials || 'U'}
                  </div>
                </Link>
              )}

              {/* Sign Out Button */}
              <button 
                onClick={handleSignOut}
                className="p-2 ml-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <Link 
              href="/login" 
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Link>
          )
        )}
      </div>
    </header>
  );
}