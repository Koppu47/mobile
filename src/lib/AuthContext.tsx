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
    password: 'user1234',
    display_name: 'สมชาย มั่นคง',
    role: 'user' as const,
  },
  admin: {
    id: 'demo-admin-id',
    email: 'admin@carservices.demo',
    password: 'admin1234',
    display_name: 'ผู้ดูแลระบบ',
    role: 'admin' as const,
  },
};

const AUTH_STORAGE_KEY = 'carservices_active_auth_profile';

interface AuthContextType {
  user: UserProfile | null;
  role: 'user' | 'admin' | 'guest';
  isGuest: boolean;
  isLoading: boolean;
  loginWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerWithPassword: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  loginAsDemoUser: () => Promise<void>;
  loginAsDemoAdmin: () => Promise<void>;
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
        const saved = await SafeStorage.getItem(AUTH_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.email) {
            const cleaned = {
              ...parsed,
              display_name: cleanDisplayName(parsed.display_name),
            };
            setUser(cleaned);
            setIsGuest(false);
            setIsLoading(false);
            return;
          }
        }

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
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const loginWithPassword = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // Check Demo Admin
      if (cleanEmail === DEMO_ACCOUNTS.admin.email && password === DEMO_ACCOUNTS.admin.password) {
        const adminProfile: UserProfile = {
          id: DEMO_ACCOUNTS.admin.id,
          email: DEMO_ACCOUNTS.admin.email,
          display_name: DEMO_ACCOUNTS.admin.display_name,
          role: 'admin',
        };
        setUser(adminProfile);
        setIsGuest(false);
        await SafeStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminProfile));
        setIsLoading(false);
        return { success: true };
      }

      // Check Demo User
      if (cleanEmail === DEMO_ACCOUNTS.user.email && password === DEMO_ACCOUNTS.user.password) {
        const userProfile: UserProfile = {
          id: DEMO_ACCOUNTS.user.id,
          email: DEMO_ACCOUNTS.user.email,
          display_name: DEMO_ACCOUNTS.user.display_name,
          role: 'user',
        };
        setUser(userProfile);
        setIsGuest(false);
        await SafeStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userProfile));
        setIsLoading(false);
        return { success: true };
      }

      // Supabase Authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setIsLoading(false);
        return { success: false, error: error.message };
      }

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

  const loginAsDemoAdmin = async () => {
    const adminProfile: UserProfile = {
      id: DEMO_ACCOUNTS.admin.id,
      email: DEMO_ACCOUNTS.admin.email,
      display_name: DEMO_ACCOUNTS.admin.display_name,
      role: 'admin',
    };
    setUser(adminProfile);
    setIsGuest(false);
    await SafeStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminProfile));
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
        loginAsDemoAdmin,
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
