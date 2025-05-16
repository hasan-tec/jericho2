'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button'; // Import Button from shadcn/ui
import { LogOut, LogIn, PlusCircle, LayoutDashboard, Trello, Loader2 } from 'lucide-react'; // Import icons, added Trello for Board

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') {
        router.push('/auth');
      } else if (event === 'SIGNED_IN') {
        // router.push('/tasks'); // Avoid redirecting if already on a protected page or to prevent nav loop
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // The onAuthStateChange listener will handle the redirect to /auth
  };

  if (loading) {
    return (
      <nav className="border-b bg-background">
        <div className="container mx-auto h-16 flex justify-between items-center px-4 md:px-6">
          <Link href="/">
            <span className="text-xl font-bold flex items-center">
              <LayoutDashboard className="mr-2 h-6 w-6" /> Jira Clone
            </span>
          </Link>
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto h-16 flex justify-between items-center px-4 md:px-6">
        <Link
          href={user ? "/tasks" : "/"}
        >
          <span className="text-xl font-bold flex items-center">
            <LayoutDashboard className="mr-2 h-6 w-6" /> Jira Clone
          </span>
        </Link>
        <div className="flex items-center space-x-2 sm:space-x-4">
          {user ? (
            <>
              <Button variant="ghost" asChild>
                <Link href="/tasks">
                  <LayoutDashboard className="mr-2 h-4 w-4 sm:hidden" />
                  <span className="hidden sm:inline">Tasks</span>
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/board">
                  <Trello className="mr-2 h-4 w-4 sm:hidden" /> 
                  <span className="hidden sm:inline">Board</span>
                </Link>
              </Button>
              <Button variant="default" asChild>
                <Link href="/tasks/new">
                  <PlusCircle className="mr-2 h-4 w-4" /> 
                  <span className="hidden sm:inline">Create Task</span>
                  <span className="sm:hidden">New</span>
                </Link>
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> 
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : (
            <Button asChild>
              <Link href="/auth">
                <LogIn className="mr-2 h-4 w-4" /> Login
              </Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
