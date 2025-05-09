import { 
  users, 
  categories, 
  transactions, 
  budgetSettings, 
  savingsGoals,
  defaultCategories,
  type User, 
  type InsertUser, 
  type Category, 
  type InsertCategory, 
  type Transaction, 
  type InsertTransaction,
  type BudgetSetting,
  type InsertBudgetSetting,
  type SavingsGoal,
  type InsertSavingsGoal
} from "@shared/schema";
import { IStorage } from "./storage";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { gte, lte } from "drizzle-orm/sql/expressions/conditions";
import { hashPassword } from "./auth";

export class DbStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result.length > 0 ? result[0] : undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    // Hash della password prima di salvarla
    const hashedPassword = await hashPassword(user.password);
    const userWithHashedPassword = {
      ...user,
      password: hashedPassword
    };
    
    const result = await db.insert(users).values(userWithHashedPassword).returning();
    return result[0];
  }

  // Category operations
  async getCategories(userId: number): Promise<Category[]> {
    return db.select().from(categories).where(eq(categories.userId, userId));
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(category).returning();
    return result[0];
  }

  async initializeDefaultCategories(userId: number): Promise<Category[]> {
    const categoriesToInsert = defaultCategories.map(category => ({
      ...category,
      userId
    }));
    
    const result = await db.insert(categories).values(categoriesToInsert).returning();
    return result;
  }

  // Transaction operations
  async getTransactions(userId: number): Promise<Transaction[]> {
    return db.select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date));
  }

  async getTransactionById(id: number): Promise<Transaction | undefined> {
    const result = await db.select().from(transactions).where(eq(transactions.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async getTransactionsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Transaction[]> {
    // Formatta le date nel formato ISO string per evitare problemi di tipo
    const startIsoDate = startDate.toISOString().split('T')[0];
    const endIsoDate = endDate.toISOString().split('T')[0];
    
    return db.select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          and(
            gte(transactions.date, startIsoDate),
            lte(transactions.date, endIsoDate)
          )
        )
      )
      .orderBy(desc(transactions.date));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values(transaction).returning();
    return result[0];
  }

  async updateTransaction(id: number, updatedData: Partial<Transaction>): Promise<Transaction | undefined> {
    // Rimuovi campi che non dovrebbero essere modificati
    const { id: _, userId: __, createdAt: ___, ...safeData } = updatedData;
    
    const result = await db.update(transactions)
      .set(safeData)
      .where(eq(transactions.id, id))
      .returning();
    
    return result.length > 0 ? result[0] : undefined;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    const result = await db.delete(transactions).where(eq(transactions.id, id)).returning();
    return result.length > 0;
  }

  // Budget settings operations
  async getBudgetSettings(userId: number): Promise<BudgetSetting | undefined> {
    const result = await db.select().from(budgetSettings).where(eq(budgetSettings.userId, userId));
    return result.length > 0 ? result[0] : undefined;
  }

  async createOrUpdateBudgetSettings(settings: InsertBudgetSetting): Promise<BudgetSetting> {
    // Verifica se esistono già delle impostazioni per questo utente
    const existingSettings = await this.getBudgetSettings(settings.userId);
    
    if (existingSettings) {
      // Aggiorna le impostazioni esistenti
      const result = await db.update(budgetSettings)
        .set(settings)
        .where(eq(budgetSettings.userId, settings.userId))
        .returning();
      return result[0];
    } else {
      // Crea nuove impostazioni
      const result = await db.insert(budgetSettings).values(settings).returning();
      return result[0];
    }
  }

  // Savings goals operations
  async getSavingsGoals(userId: number): Promise<SavingsGoal[]> {
    return db.select()
      .from(savingsGoals)
      .where(
        and(
          eq(savingsGoals.userId, userId),
          eq(savingsGoals.isActive, true)
        )
      );
  }

  async getSavingsGoalById(id: number): Promise<SavingsGoal | undefined> {
    const result = await db.select().from(savingsGoals).where(eq(savingsGoals.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async createSavingsGoal(goal: InsertSavingsGoal): Promise<SavingsGoal> {
    const result = await db.insert(savingsGoals).values(goal).returning();
    return result[0];
  }

  async updateSavingsGoal(id: number, amount: number): Promise<SavingsGoal | undefined> {
    const goal = await this.getSavingsGoalById(id);
    
    if (!goal) {
      return undefined;
    }
    
    // Converti stringhe in numeri se necessario
    let currentAmount = typeof goal.currentAmount === 'string' 
      ? parseFloat(goal.currentAmount) 
      : goal.currentAmount;
    
    // Aggiungi l'importo specificato
    currentAmount += amount;
    
    // Aggiorna il goal
    const result = await db.update(savingsGoals)
      .set({ currentAmount: currentAmount.toString() })
      .where(eq(savingsGoals.id, id))
      .returning();
    
    return result.length > 0 ? result[0] : undefined;
  }

  async deleteSavingsGoal(id: number): Promise<boolean> {
    // Qui facciamo un "soft delete" impostando isActive = false 
    // invece di eliminare fisicamente il record
    const result = await db.update(savingsGoals)
      .set({ isActive: false })
      .where(eq(savingsGoals.id, id))
      .returning();
    
    return result.length > 0;
  }
}

export const dbStorage = new DbStorage();