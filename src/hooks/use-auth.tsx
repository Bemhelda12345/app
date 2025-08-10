
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { get, ref, set, child, getDatabase } from 'firebase/database';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { database } from '@/lib/firebase';

interface User {
  email: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, pass: string) => Promise<any>;
  signIn: (email: string, pass:string) => Promise<any>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to sanitize email for use as a Firebase key
const sanitizeEmail = (email: string) => email.replace(/[.@$\[\]#\/]/g, ',');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error)
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password_provided: string) => {
    if (!email || !password_provided) {
      throw new Error('Email and password are required.');
    }
    // Admin Login Logic
    if (email.toLowerCase() === 'admin') {
        const adminRef = ref(database, 'accounts/admin');
        const snapshot = await get(adminRef);

        if (snapshot.exists()) {
            const adminData = snapshot.val();
            if (adminData.password === password_provided) {
                const userData: User = { email: 'admin', role: 'admin' };
                localStorage.setItem('user', JSON.stringify(userData));
                setUser(userData);
                return userData;
            }
        }
        throw new Error('Incorrect admin password.');
    }

    // Standard User Login Logic
    const accountsRef = ref(database, 'accounts');
    const snapshot = await get(accountsRef);

    if (snapshot.exists()) {
        const accounts = snapshot.val();
        let userFound = false;

        for (const key in accounts) {
            // Skip admin account in this loop
            if (key === 'admin') continue;

            const account = accounts[key];
            if (account.email?.toLowerCase() === email.toLowerCase() && account.password === password_provided) {
                const userData: User = { email: account.email, role: account.role || 'user' };
                localStorage.setItem('user', JSON.stringify(userData));
                setUser(userData);
                userFound = true;
                return userData;
            }
        }
    }
    
    throw new Error('Invalid email or password.');
  };

  const signUp = async (email: string, password_provided: string) => {
    if (!email || !password_provided) {
        throw new Error('Email and password are required.');
    }
    const sanitizedEmailKey = sanitizeEmail(email);
    const userAccountRef = ref(database, `accounts/${sanitizedEmailKey}`);
    
    const snapshot = await get(userAccountRef);

    if (snapshot.exists()) {
        throw new Error('Account with this email already exists.');
    }

    const username = email.split('@')[0];

    await set(userAccountRef, {
        email: email,
        password: password_provided,
        username: username,
        role: 'user', // Default role for new sign-ups
    });
    
    // Automatically sign in after successful registration
    const userData: User = { email, role: 'user' };
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const signOut = () => {
    localStorage.removeItem('user');
    setUser(null);
    router.push('/');
  };
  
  const value = { user, loading, signUp, signIn, signOut };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
