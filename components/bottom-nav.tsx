'use client';

import { Home, Grid3X3, Video, Users, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Muro', href: '/', icon: Home },
  { label: 'Grid', href: '/grid', icon: Grid3X3 },
  { label: 'Feed', href: '/feed', icon: Video },
  { label: 'Grupos', href: '/groups', icon: Users },
  { label: 'Trade', href: '/trade', icon: Briefcase },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden flex items-center justify-around h-16 bg-sidebar border-t border-border">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              isActive
                ? 'text-sidebar-primary'
                : 'text-sidebar-foreground hover:text-sidebar-accent-foreground'
            }`}
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
