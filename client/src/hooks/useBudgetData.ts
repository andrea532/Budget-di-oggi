import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatters";

interface BudgetData {
  dailyBudget: number;
  todaysExpenses: number;
  remainingToday: number;
  spentThisMonth: number;
  totalBudget: number;
  remainingThisMonth: number;
  daysLeft: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Custom hook to fetch and manage budget data
 * This hook provides the main budget metrics for display in the app
 */
export const useBudgetData = (): BudgetData => {
  const { toast } = useToast();
  const [error, setError] = useState<Error | null>(null);
  
  const {
    data,
    isLoading,
    isError,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: ["/api/daily-budget"],
    retry: 3,
    // Ottimizzazione cache per daily-budget
    staleTime: 1000 * 60 * 15,       // Considera i dati freschi per 15 minuti
    gcTime: 1000 * 60 * 60,          // Cache valida per un'ora (in v5 gcTime sostituisce cacheTime)
    // Strategie di refetch personalizzate
    refetchOnMount: true,           // Ricarica sempre quando il componente monta
    refetchOnReconnect: true        // Ricarica quando si riconnette a internet
  });
  
  // Set default values for budget metrics
  const defaultBudgetData: BudgetData = {
    dailyBudget: 0,
    todaysExpenses: 0,
    remainingToday: 0,
    spentThisMonth: 0,
    totalBudget: 0,
    remainingThisMonth: 0,
    daysLeft: 0,
    isLoading,
    isError,
    error,
    refetch
  };
  
  // Merge fetched data with default values
  const budgetData: BudgetData = {
    ...defaultBudgetData,
    ...(data || {}),
  };
  
  // Update error state if query fails
  useEffect(() => {
    if (queryError && queryError instanceof Error) {
      setError(queryError);
    }
  }, [queryError]);
  
  return budgetData;
};

/**
 * Format budget metrics for display
 * @param data The budget data to format
 */
export const formatBudgetMetrics = (data: BudgetData) => {
  return {
    dailyBudgetFormatted: formatCurrency(data.dailyBudget),
    todaysExpensesFormatted: formatCurrency(data.todaysExpenses),
    remainingTodayFormatted: formatCurrency(data.remainingToday),
    spentThisMonthFormatted: formatCurrency(data.spentThisMonth),
    totalBudgetFormatted: formatCurrency(data.totalBudget),
    remainingThisMonthFormatted: formatCurrency(data.remainingThisMonth),
    progressPercentage: data.totalBudget > 0 
      ? Math.min(100, Math.max(0, (data.spentThisMonth / data.totalBudget) * 100))
      : 0,
    spendingPercentage: data.dailyBudget > 0
      ? Math.min(100, Math.max(0, (data.todaysExpenses / data.dailyBudget) * 100))
      : 0,
  };
};

export default useBudgetData;
