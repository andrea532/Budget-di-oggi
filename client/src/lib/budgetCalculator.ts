interface Transaction {
  date: string;
  amount: number;
  type: 'income' | 'expense';
}

/**
 * Calculate daily budget based on income, fixed expenses, and remaining days in month
 */
export const calculateDailyBudget = (
  monthlyIncome: number,
  monthlyFixedExpenses: number,
  daysInMonth: number,
  currentDay: number,
  transactions: Transaction[]
): number => {
  // Calculate discretionary income (income minus fixed expenses)
  const discretionaryIncome = monthlyIncome - monthlyFixedExpenses;
  
  // Calculate total spent so far this month
  const totalSpent = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  
  // Calculate remaining discretionary income
  const remainingDiscretionaryIncome = discretionaryIncome - totalSpent;
  
  // Calculate remaining days in the month (including today)
  const remainingDays = daysInMonth - currentDay + 1;
  
  // Calculate daily budget
  return remainingDiscretionaryIncome / remainingDays;
};

/**
 * Calculate budget rollover (how much extra budget tomorrow based on today's savings)
 */
export const calculateRollover = (
  dailyBudget: number,
  todaysExpenses: number
): number => {
  return Math.max(0, dailyBudget - todaysExpenses);
};

/**
 * Calculate progress percentage for a savings goal
 */
export const calculateSavingsProgress = (
  currentAmount: number,
  targetAmount: number
): number => {
  if (targetAmount <= 0) return 0;
  const progress = (currentAmount / targetAmount) * 100;
  return Math.min(100, Math.max(0, progress)); // Ensure between 0 and 100
};

/**
 * Calculate daily savings needed to reach a goal by a target date
 */
export const calculateDailySavingsNeeded = (
  currentAmount: number,
  targetAmount: number,
  targetDate: string | Date
): number => {
  const remainingAmount = targetAmount - currentAmount;
  
  if (remainingAmount <= 0) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  
  if (target <= today) return remainingAmount; // Goal is due today or in the past
  
  const diffTime = Math.abs(target.getTime() - today.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return remainingAmount / diffDays;
};
