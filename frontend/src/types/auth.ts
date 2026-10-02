export type Role = 'ADMIN' | 'STAFF';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  lastLoginAt: string | null;
}
