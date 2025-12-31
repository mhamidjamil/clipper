
'use client';

import { useTheme } from 'next-themes';
import { useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays, LogOut, Moon, Sun, List, BookOpen, MessageSquare } from 'lucide-react';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { user, userProfile, auth } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 md:px-6">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Clipper Scheduler
        </Link>
        <div className="flex items-center gap-4">
          {user && (
              <Link href="/chats" passHref>
                  <Button variant="outline" size="icon">
                      <MessageSquare className="h-[1.2rem] w-[1.2rem]" />
                      <span className="sr-only">Chats</span>
                  </Button>
              </Link>
          )}
          {userProfile?.role === 'barber' && (
            <>
              <Link href="/categories" passHref>
                <Button variant="outline" size="icon">
                  <List className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">Manage Categories</span>
                </Button>
              </Link>
              <Link href="/availability" passHref>
                <Button variant="outline" size="icon">
                  <CalendarDays className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">Manage Availability</span>
                </Button>
              </Link>
            </>
          )}
          {userProfile?.role === 'client' && (
            <>
              <Link href="/appointments" passHref>
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <BookOpen className="h-4 w-4 mr-2" />
                  My Appointments
                </Button>
              </Link>
              <Link href="/appointments" passHref>
                <Button variant="outline" size="icon" className="sm:hidden">
                  <BookOpen className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">My Appointments</span>
                </Button>
              </Link>
            </>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user.photoURL ?? ''}
                      alt={user.displayName ?? 'User'}
                    />
                    <AvatarFallback>
                      {userProfile?.name?.charAt(0) ?? user.email?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
