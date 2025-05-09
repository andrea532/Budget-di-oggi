import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from '@shared/schema';

// Utilizziamo la variabile d'ambiente per la connessione al database
const connectionString = process.env.DATABASE_URL || '';

// Inizializzazione della connessione al database - utilizzo postgres invece di neon
// per evitare problemi di compatibilità
const sql = postgres(connectionString);
export const db = drizzle(sql, { schema });

// Funzione per eseguire le migrazioni in forma di codice (code-first migrations)
export async function runMigrations() {
  console.log('Inizializzo il database e applico le migrazioni...');
  
  try {
    // In questo caso, invece di usare drizzle-kit per le migrazioni,
    // stiamo creando le tabelle programmaticamente
    
    // Crea le tabelle nel database
    const migrationClient = postgres(connectionString, { max: 1 });
    
    // Utilizza la funzione di migrazione di drizzle
    await migrate(drizzle(migrationClient), { migrationsFolder: './migrations' });
    
    console.log('Migrazioni completate con successo!');
  } catch (error) {
    console.error('Errore durante l\'esecuzione delle migrazioni:', error);
    
    // Come fallback, se le migrazioni non funzionano, creiamo le tabelle direttamente
    try {
      console.log('Tentativo di creazione diretta delle tabelle...');
      
      // Crea la connessione al database
      const migrationClient = postgres(connectionString, { max: 1 });
      const migrationDb = drizzle(migrationClient);
      
      // Esegui ogni comando SQL separatamente
      // Crea tabella users
      await migrationClient`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          first_name TEXT,
          last_name TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          is_active BOOLEAN NOT NULL DEFAULT TRUE
        )
      `;
      
      // Crea tabella categories
      await migrationClient`
        CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          color TEXT NOT NULL,
          icon TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'expense'
        )
      `;
      
      // Crea tabella transactions
      await migrationClient`
        CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          date DATE NOT NULL,
          amount NUMERIC NOT NULL,
          description TEXT,
          category_id INTEGER,
          type TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `;
      
      // Crea tabella budget_settings
      await migrationClient`
        CREATE TABLE IF NOT EXISTS budget_settings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL UNIQUE,
          monthly_income NUMERIC NOT NULL,
          monthly_fixed_expenses NUMERIC NOT NULL DEFAULT '0',
          budget_start_date DATE,
          budget_end_date DATE
        )
      `;
      
      // Crea tabella savings_goals
      await migrationClient`
        CREATE TABLE IF NOT EXISTS savings_goals (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          target_amount NUMERIC NOT NULL,
          current_amount NUMERIC NOT NULL DEFAULT '0',
          target_date DATE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          is_active BOOLEAN NOT NULL DEFAULT TRUE
        )
      `;
      
      // Crea tabella session
      await migrationClient`
        CREATE TABLE IF NOT EXISTS session (
          sid TEXT PRIMARY KEY,
          sess JSON NOT NULL,
          expire TIMESTAMP(6) NOT NULL
        )
      `;
      
      console.log('Tabelle create con successo!');
      
      await migrationClient.end();
    } catch (directError) {
      console.error('Errore durante la creazione diretta delle tabelle:', directError);
      throw directError;
    }
  }
}