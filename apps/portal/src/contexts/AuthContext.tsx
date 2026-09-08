import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { novaHost } from '@/integrations/novahost/client';
import { playNotificationSound } from '@/lib/notify';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /**
   * `profiles.approval_status` for the signed-in account, or null when nobody
   * is signed in. New signups start `pending` and cannot use the portal until
   * an admin approves them.
   *
   * Null while it is still being fetched -- read `approvalLoading` rather than
   * treating null as "not approved", or the gate flashes on every refresh.
   */
  approvalStatus: ApprovalStatus | null;
  approvalLoading: boolean;
  refreshApproval: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth state cleanup utility
const cleanupAuthState = () => {
  // Remove all NovaHost auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('novaHost.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Remove from sessionStorage if in use
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('novaHost.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null);
  const [approvalLoading, setApprovalLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = novaHost.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (event === 'SIGNED_IN') {
          try { playNotificationSound(); } catch {}
        }
      }
    );

    // THEN check for existing session
    novaHost.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const userId = user?.id ?? null;

  /**
   * The "Users view their own profile" RLS policy lets a pending account read
   * its own row, which is what makes the pending screen possible at all. The
   * `protect_approval_status` trigger is what stops it writing one.
   */
  const fetchApproval = useCallback(async () => {
    if (!userId) {
      setApprovalStatus(null);
      setApprovalLoading(false);
      return;
    }

    setApprovalLoading(true);
    const { data, error } = await novaHost
      .from('profiles')
      .select('approval_status')
      .eq('id', userId)
      .maybeSingle();

    // Fail closed. A read error here means we cannot prove the account is
    // approved, and letting it through would defeat the gate.
    if (error) {
      console.error('Could not read approval status:', error);
      setApprovalStatus('pending');
    } else {
      setApprovalStatus((data?.approval_status ?? 'pending') as ApprovalStatus);
    }
    setApprovalLoading(false);
  }, [userId]);

  useEffect(() => {
    if (loading) return;
    void fetchApproval();
  }, [loading, fetchApproval]);

  const signOut = async () => {
    try {
      // Clean up auth state first
      cleanupAuthState();
      
      // Attempt global sign out
      try {
        await novaHost.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
        console.warn('Global signout warning:', err);
      }
      
      // Force page refresh for clean state
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    approvalStatus,
    approvalLoading,
    refreshApproval: fetchApproval,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};