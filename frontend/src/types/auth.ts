export type UserRole = 'manager' | 'staff';

export interface AuthenticatedProfile {
  id: string;
  email: string | null;
  role: UserRole;
  profile_created_at: string;
}

export interface AuthState {
  user: AuthenticatedProfile | null;
  supabaseUser: { id: string; email?: string } | null;
  isLoading: boolean;
  error: Error | null;
  isServiceUnavailable: boolean;
  isUnauthorizedProfile: boolean;
}
