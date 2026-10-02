import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      /** Set by the requireAuth middleware */
      user?: {
        id: number;
        name: string;
        email: string;
        role: Role;
      };
    }
  }
}

export {};
