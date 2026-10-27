import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { SafeStorage } from './safeStorage';
import { UserProfile } from '../types';

export const cleanDisplayName = (name?: string | null): string => {
  if (!name) return '';
  return name.replace(/\s*\((Demo User|Demo Admin|User|Admin)\)/gi, '').trim();
};

export const DEMO_ACCOUNTS = {
  user: {
    id: 'demo-user-id',
    email: 'user@carservices.demo',
    display_name: 'สมชาย มั่นคง',
    role: 'user' as const,
  },
};

const AUTH_STORAGE_KEY = 'carservices_active_auth_profile';
let failedAttempts = 0;
let lockoutUntil = 0;

interface AuthContextType {
  user: UserProfile | null;
  role: 'user' | 'admin' | 'guest';
  isGuest: boolean;
  isLoading: boolean;
  loginWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerWithPassword: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  loginAsDemoUser: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (isSupabaseConfigured()) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            const resolvedUser: UserProfile = {
              id: session.user.id,
              email: session.user.email || '',
              display_name: profile?.display_name || session.user.user_metadata?.display_name || session.user.email?.split('@')[0],
              role: profile?.role === 'admin' ? 'admin' : 'user',
              avatar_url: profile?.avatar_url,
            };

            setUser(resolvedUser);
            setIsGuest(false);
            await SafeStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(resolvedUser));
            setIsLoading(false);
            return;
          } else {
            await SafeStorage.removeItem(AUTH_STORAGE_KEY);
            setUser(null);
            setIsGuest(true);
          }
        } else {
          const saved = await SafeStorage.getItem(AUTH_STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.email) {
              const cleaned = {
                ...parsed,
                role: 'user' as const, // Never allow unverified admin
                display_name: cleanDisplayName(parsed.display_name),
              };
              setUser(cleaned);
              setIsGuest(false);
              setIsLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.error('Error initializing mobile auth:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const resolvedUser: UserProfile = {
          id: session.user.id,
          email: session.user.email || '',
          display_name: profile?.display_name || session.user.user_metadata?.display_name || session.user.email?.split('@')[0],
          role: profile?.role === 'admin' ? 'admin' : 'user',
          avatar_url: profile?.avatar_url,
        };

        setUser(resolvedUser);
        setIsGuest(false);
        await SafeStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(resolvedUser));
      } else {
        setUser(null);
        setIsGuest(true);
        await SafeStorage.removeItem(AUTH_STORAGE_KEY);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const loginWithPassword = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Rate limiting check
    const now = Date.now();
    if (now < lockoutUntil) {
      const waitSec = Math.ceil((lockoutUntil - now) / 1000);
      return { success: false, error: `ระบบระงับการเข้าสู่ระบบชั่วคราวเนื่องจากพยายามล็อกอินผิดบ่อยครั้ง กรุณารอ ${waitSec} วินาที` };
    }

    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // Supabase Authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        failedAttempts += 1;
        if (failedAttempts >= 5) {
          lockoutUntil = Date.now() + 30000;
          failedAttempts = 0;
        }
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      failedAttempts = 0;

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const resolvedUser: UserProfile = {
          id: data.user.id,
          email: data.user.email || '',
          display_name: profile?.display_name || data.user.user_metadata?.display_name || data.user.email?.split('@')[0],
          role: profile?.role === 'admin' ? 'admin' : 'user',
        };

        setUser(resolvedUser);
        setIsGuest(false);
        await SafeStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(resolvedUser));
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: 'เข้าสู่ระบบไม่สำเร็จ' };
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
      return { success: false, error: msg };
    }
  };

  const registerWithPassword = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            display_name: displayName,
            full_name: displayName,
          },
        },
      });

      if (error) {
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        const resolvedUser: UserProfile = {
          id: data.user.id,
          email: data.user.email || '',
          display_name: displayName,
          role: 'user',
        };
        setUser(resolvedUser);
        setIsGuest(false);
        await SafeStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(resolvedUser));
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { success: true };
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสมัครสมาชิก';
      return { success: false, error: msg };
    }
  };

  const loginAsDemoUser = async () => {
    const userProfile: UserProfile = {
      id: DEMO_ACCOUNTS.user.id,
      email: DEMO_ACCOUNTS.user.email,
      display_name: DEMO_ACCOUNTS.user.display_name,
      role: 'user',
    };
    setUser(userProfile);
    setIsGuest(false);
    await SafeStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userProfile));
  };

  const loginAsGuest = async () => {
    setUser(null);
    setIsGuest(true);
    await SafeStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setUser(null);
    setIsGuest(true);
    await SafeStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const currentRole: 'user' | 'admin' | 'guest' = isGuest || !user ? 'guest' : user.role;

  return (
    <AuthContext.Provider
      value={{
        user,
        role: currentRole,
        isGuest,
        isLoading,
        loginWithPassword,
        registerWithPassword,
        loginAsDemoUser,
        loginAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
