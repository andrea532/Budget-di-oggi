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

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Category operations
  getCategories(userId: number): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  initializeDefaultCategories(userId: number): Promise<Category[]>;

  // Transaction operations
  getTransactions(userId: number): Promise<Transaction[]>;
  getTransactionById(id: number): Promise<Transaction | undefined>;
  getTransactionsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<Transaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;

  // Budget settings operations
  getBudgetSettings(userId: number): Promise<BudgetSetting | undefined>;
  createOrUpdateBudgetSettings(settings: InsertBudgetSetting): Promise<BudgetSetting>;

  // Savings goals operations
  getSavingsGoals(userId: number): Promise<SavingsGoal[]>;
  getSavingsGoalById(id: number): Promise<SavingsGoal | undefined>;
  createSavingsGoal(goal: InsertSavingsGoal): Promise<SavingsGoal>;
  updateSavingsGoal(id: number, amount: number): Promise<SavingsGoal | undefined>;
  deleteSavingsGoal(id: number): Promise<boolean>;
}

// Memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private transactions: Map<number, Transaction>;
  private budgetSettings: Map<number, BudgetSetting>;
  private savingsGoals: Map<number, SavingsGoal>;
  
  private currentUserId: number;
  private currentCategoryId: number;
  private currentTransactionId: number;
  private currentBudgetSettingId: number;
  private currentSavingsGoalId: number;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.transactions = new Map();
    this.budgetSettings = new Map();
    this.savingsGoals = new Map();
    
    this.currentUserId = 1;
    this.currentCategoryId = 1;
    this.currentTransactionId = 1;
    this.currentBudgetSettingId = 1;
    this.currentSavingsGoalId = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date(),
      isActive: true,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null
    };
    this.users.set(id, user);
    return user;
  }

  // Category operations
  async getCategories(userId: number): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(
      (category) => category.userId === userId,
    );
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.currentCategoryId++;
    // Assicurarsi che type sia sempre presente
    const category: Category = { 
      ...insertCategory, 
      id,
      type: insertCategory.type || 'expense' // Valore predefinito se mancante
    };
    this.categories.set(id, category);
    return category;
  }

  async initializeDefaultCategories(userId: number): Promise<Category[]> {
    const userCategories = await this.getCategories(userId);
    if (userCategories.length > 0) {
      return userCategories;
    }

    const newCategories: Category[] = [];
    for (const defaultCat of defaultCategories) {
      const category = await this.createCategory({
        userId,
        name: defaultCat.name,
        color: defaultCat.color,
        icon: defaultCat.icon,
        type: defaultCat.type,
      });
      newCategories.push(category);
    }
    return newCategories;
  }

  // Transaction operations
  async getTransactions(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter((transaction) => transaction.userId === userId)
      .sort((a, b) => {
        // Sort by date descending
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });
  }

  async getTransactionById(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactionsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter((transaction) => {
        const transactionDate = new Date(transaction.date);
        return (
          transaction.userId === userId &&
          transactionDate >= startDate &&
          transactionDate <= endDate
        );
      })
      .sort((a, b) => {
        // Sort by date descending
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentTransactionId++;
    const createdAt = new Date();
    // Assicurarsi che tutti i campi obbligatori siano presenti
    const transaction: Transaction = { 
      ...insertTransaction, 
      id, 
      createdAt,
      description: insertTransaction.description || null,
      categoryId: insertTransaction.categoryId || null
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async updateTransaction(id: number, updatedData: Partial<Transaction>): Promise<Transaction | undefined> {
    const transaction = await this.getTransactionById(id);
    if (!transaction) return undefined;

    // Crea un oggetto transazione aggiornato
    const updatedTransaction: Transaction = {
      ...transaction,
      ...updatedData,
      // Mantieni l'ID originale
      id: transaction.id,
      // Mantieni l'userID originale per sicurezza
      userId: transaction.userId
    };

    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    return this.transactions.delete(id);
  }

  // Budget settings operations
  async getBudgetSettings(userId: number): Promise<BudgetSetting | undefined> {
    return Array.from(this.budgetSettings.values()).find(
      (setting) => setting.userId === userId,
    );
  }

  async createOrUpdateBudgetSettings(insertSettings: InsertBudgetSetting): Promise<BudgetSetting> {
    // Check if settings already exist for this user
    const existingSettings = await this.getBudgetSettings(insertSettings.userId);
    
    if (existingSettings) {
      // Update existing settings
      const updatedSettings: BudgetSetting = {
        ...existingSettings,
        monthlyIncome: insertSettings.monthlyIncome,
        monthlyFixedExpenses: insertSettings.monthlyFixedExpenses || "0", // Valore predefinito se mancante
        budgetStartDate: insertSettings.budgetStartDate || null,
        budgetEndDate: insertSettings.budgetEndDate || null,
      };
      this.budgetSettings.set(existingSettings.id, updatedSettings);
      return updatedSettings;
    } else {
      // Create new settings
      const id = this.currentBudgetSettingId++;
      const settings: BudgetSetting = { 
        ...insertSettings, 
        id,
        monthlyFixedExpenses: insertSettings.monthlyFixedExpenses || "0", // Valore predefinito se mancante
        budgetStartDate: insertSettings.budgetStartDate || null,
        budgetEndDate: insertSettings.budgetEndDate || null
      };
      this.budgetSettings.set(id, settings);
      return settings;
    }
  }

  // Savings goals operations
  async getSavingsGoals(userId: number): Promise<SavingsGoal[]> {
    return Array.from(this.savingsGoals.values())
      .filter((goal) => goal.userId === userId && goal.isActive)
      .sort((a, b) => {
        // Sort by created date
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }

  async getSavingsGoalById(id: number): Promise<SavingsGoal | undefined> {
    return this.savingsGoals.get(id);
  }

  async createSavingsGoal(insertGoal: InsertSavingsGoal): Promise<SavingsGoal> {
    // Se l'ID è già definito, lo utilizziamo (utile per l'aggiornamento)
    const id = (insertGoal as any).id || this.currentSavingsGoalId++;
    
    // Aggiorniamo il contatore se necessario
    if (id >= this.currentSavingsGoalId) {
      this.currentSavingsGoalId = id + 1;
    }
    
    const createdAt = new Date();
    const isActive = true;
    const goal: SavingsGoal = { 
      ...insertGoal, 
      id, 
      createdAt, 
      isActive,
      currentAmount: insertGoal.currentAmount || "0", // Valore predefinito
      targetDate: insertGoal.targetDate || null
    };
    this.savingsGoals.set(id, goal);
    return goal;
  }

  async updateSavingsGoal(id: number, amount: number): Promise<SavingsGoal | undefined> {
    const goal = await this.getSavingsGoalById(id);
    if (!goal) return undefined;

    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const currentAmount = typeof goal.currentAmount === 'string' 
      ? parseFloat(goal.currentAmount) 
      : goal.currentAmount;

    const updatedGoal: SavingsGoal = {
      ...goal,
      currentAmount: String(currentAmount + numericAmount), // Converti in stringa
    };
    this.savingsGoals.set(id, updatedGoal);
    return updatedGoal;
  }

  async deleteSavingsGoal(id: number): Promise<boolean> {
    const goal = await this.getSavingsGoalById(id);
    if (!goal) return false;

    // Soft delete by setting isActive to false
    const updatedGoal: SavingsGoal = {
      ...goal,
      isActive: false,
    };
    this.savingsGoals.set(id, updatedGoal);
    return true;
  }
}

export const storage = new MemStorage();
