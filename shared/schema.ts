import { pgTable, text, serial, integer, boolean, numeric, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true, 
  password: true,
  firstName: true,
  lastName: true,
});

// Registrazione schema che verrà utilizzato dall'API
export const registerUserSchema = z.object({
  username: z.string().min(3, { message: "Il nome utente deve contenere almeno 3 caratteri" }),
  email: z.string().email({ message: "Formato email non valido" }),
  password: z.string().min(6, { message: "La password deve contenere almeno 6 caratteri" }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

// Login schema
export const loginUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

// Category schema
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  type: text("type").notNull().default("expense"), // "income" or "expense"
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  userId: true,
  name: true,
  color: true,
  icon: true,
  type: true,
});

// Transaction schema
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  amount: numeric("amount").notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => categories.id),
  type: text("type").notNull(), // "income" or "expense"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  userId: true,
  date: true,
  amount: true,
  description: true,
  categoryId: true,
  type: true,
});

// Budget settings schema
export const budgetSettings = pgTable("budget_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  monthlyIncome: numeric("monthly_income").notNull(),
  monthlyFixedExpenses: numeric("monthly_fixed_expenses").notNull().default("0"),
  budgetStartDate: date("budget_start_date"),
  budgetEndDate: date("budget_end_date"),
});

export const insertBudgetSettingsSchema = createInsertSchema(budgetSettings).pick({
  userId: true,
  monthlyIncome: true,
  monthlyFixedExpenses: true,
  budgetStartDate: true,
  budgetEndDate: true,
});

// Savings goal schema
export const savingsGoals = pgTable("savings_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  targetAmount: numeric("target_amount").notNull(),
  currentAmount: numeric("current_amount").notNull().default("0"),
  targetDate: date("target_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertSavingsGoalSchema = createInsertSchema(savingsGoals).pick({
  userId: true,
  name: true,
  targetAmount: true,
  targetDate: true,
  currentAmount: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type BudgetSetting = typeof budgetSettings.$inferSelect;
export type InsertBudgetSetting = z.infer<typeof insertBudgetSettingsSchema>;

export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type InsertSavingsGoal = z.infer<typeof insertSavingsGoalSchema>;

// Default categories
export const defaultCategories = [
  // Categorie spese
  { name: "Alimentari", color: "#26C7C3", icon: "shopping-basket", type: "expense" },
  { name: "Trasporti", color: "#FF7A5A", icon: "bus", type: "expense" },
  { name: "Intrattenimento", color: "#8E64F0", icon: "music", type: "expense" },
  { name: "Utenze", color: "#4CAF50", icon: "bolt", type: "expense" },
  { name: "Altro", color: "#9E9E9E", icon: "ellipsis-h", type: "expense" },
  
  // Categorie entrate
  { name: "Stipendio", color: "#4285F4", icon: "briefcase", type: "income" },
  { name: "Investimenti", color: "#0F9D58", icon: "chart-line", type: "income" },
  { name: "Regali", color: "#F4B400", icon: "gift", type: "income" },
  { name: "Freelance", color: "#DB4437", icon: "laptop", type: "income" },
  { name: "Altro", color: "#9E9E9E", icon: "ellipsis-h", type: "income" },
];
