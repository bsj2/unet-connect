'use client';

import { Home, Grid3X3, Video, Users, Briefcase, Library } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Community', href: '/community', icon: Users },
  { label: 'TikTok Feed', href: '/feed', icon: Video },
  { label: 'Grupos', href: '/groups', icon: Library },
  { label: 'UNET-Trade', href: '/trade', icon: Briefcase },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:fixed md:left-0 md:top-16 md:h-[calc(100vh-4rem)] md:w-64 md:flex md:flex-col md:border-r md:border-border md:bg-sidebar md:overflow-y-auto z-50">
      <nav className="flex-1 px-4 py-6 space-y-2 z-50">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
