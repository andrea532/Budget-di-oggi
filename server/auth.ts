import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Configurazione di Passport con strategie di autenticazione
export function setupPassport() {
  // Serializzazione dell'utente (salva solo l'ID nella sessione)
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserializzazione dell'utente (recupera l'utente completo dal DB usando l'ID)
  passport.deserializeUser(async (id: number, done) => {
    try {
      const userResult = await db.select().from(users).where(eq(users.id, id));
      
      if (userResult.length === 0) {
        return done(null, false);
      }
      
      // Rimuovi la password dai dati utente
      const { password, ...userWithoutPassword } = userResult[0];
      done(null, userWithoutPassword);
    } catch (error) {
      done(error);
    }
  });

  // Strategia di login locale (username e password)
  passport.use(new LocalStrategy(
    async (username, password, done) => {
      try {
        // Cerca l'utente per username
        const userResult = await db.select().from(users).where(eq(users.username, username));
        
        if (userResult.length === 0) {
          return done(null, false, { message: 'Username o password non validi.' });
        }
        
        const user = userResult[0];
        
        // Verifica la password
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
          return done(null, false, { message: 'Username o password non validi.' });
        }
        
        // Rimuovi la password dai dati utente
        const { password: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword);
      } catch (error) {
        return done(error);
      }
    }
  ));
}

// Middleware per verificare se l'utente è autenticato
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ 
    message: 'Non autorizzato. Effettua il login per accedere a questa risorsa.' 
  });
}

// Middleware per impostare l'ID utente nel corpo della richiesta
export function setUserId(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user) {
    // Aggiungi l'ID utente al corpo della richiesta per l'uso nei controller
    req.body.userId = (req.user as any).id;
  }
  next();
}

// Funzione di utilità per l'hash delle password
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}