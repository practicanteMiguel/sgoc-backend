import { User } from '../../users/entities/user.entity';

// Extiende el tipo Request de Express para incluir el usuario autenticado
declare namespace Express {
  interface Request {
    user?: User & { roles: string[] };
  }
}