import { FC, useMemo, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";

interface Transaction {
  id: number;
  amount: number;
  categoryId: number | null;
  type: string;
}

interface Category {
  id: number;
  name: string;
  color: string;
}

interface CategoryItemProps {
  category: {
    id: number;
    name: string;
    color: string;
    amount: number;
    percentage: number;
  };
}

// Componente memorizzato per singolo elemento categoria
const CategoryItem = memo<CategoryItemProps>(({ category }) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center">
          <div 
            className="h-3 w-3 rounded-full mr-2" 
            style={{ backgroundColor: category.color }}
          ></div>
          <p className="text-sm">{category.name}</p>
        </div>
        <p className="text-sm font-medium">{formatCurrency(category.amount)}</p>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full" 
          style={{ 
            width: `${category.percentage}%`,
            backgroundColor: category.color
          }}
        ></div>
      </div>
    </div>
  );
});

const CategorySpending: FC = () => {
  const {
    data: transactions,
    isLoading: isTransactionsLoading,
  } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const {
    data: categories,
    isLoading: isCategoriesLoading,
  } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const isLoading = isTransactionsLoading || isCategoriesLoading;

  // Utilizziamo useMemo per calcolare le spese per categoria e il totale mensile
  // Questo ricalcolerà solo quando cambiano transactions o categories
  const { categoryTotals, totalMonthly } = useMemo(() => {
    // Valori predefiniti
    const totals: { [key: number]: number } = {};
    let monthlyTotal = 0;
    
    if (!transactions || !categories) {
      return { categoryTotals: totals, totalMonthly: monthlyTotal };
    }
    
    // Solo le spese (non le entrate)
    const expenses = transactions.filter(t => t.type === "expense");
    
    // Calcola il totale mensile delle spese
    monthlyTotal = expenses.reduce((sum, transaction) => {
      const amount = typeof transaction.amount === 'string' 
        ? parseFloat(transaction.amount) 
        : transaction.amount;
      return sum + amount;
    }, 0);
    
    // Calcola i totali per categoria
    expenses.forEach(transaction => {
      if (transaction.categoryId !== null) {
        const amount = typeof transaction.amount === 'string' 
          ? parseFloat(transaction.amount) 
          : transaction.amount;
          
        if (totals[transaction.categoryId]) {
          totals[transaction.categoryId] += amount;
        } else {
          totals[transaction.categoryId] = amount;
        }
      } else {
        // Gestisce le spese non categorizzate
        const uncategorizedId = -1;
        if (totals[uncategorizedId]) {
          totals[uncategorizedId] += transaction.amount;
        } else {
          totals[uncategorizedId] = transaction.amount;
        }
      }
    });
    
    return { categoryTotals: totals, totalMonthly: monthlyTotal };
  }, [transactions, categories]);

  // Prepara i dati per la visualizzazione, ordinati per importo (decrescente)
  // Questo ricalcolerà solo quando cambiano categoryTotals, totalMonthly o categories
  const categoryData = useMemo(() => {
    if (!categories) return [];
    
    return Object.entries(categoryTotals)
      .map(([categoryId, amount]) => {
        const category = categories.find(c => c.id === parseInt(categoryId)) || 
          { id: -1, name: "Altro", color: "#9E9E9E" };
        
        return {
          id: parseInt(categoryId),
          name: category.name,
          color: category.color,
          amount,
          percentage: totalMonthly ? (amount / totalMonthly) * 100 : 0
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [categoryTotals, totalMonthly, categories]);

  // Skeleton loader memorizzato
  const skeletonLoader = useMemo(() => (
    <div className="p-4">
      <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
        <Skeleton className="h-6 w-48 mb-4" />
        
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center">
                  <Skeleton className="h-3 w-3 rounded-full mr-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </div>
    </div>
  ), []);
  
  if (isLoading) {
    return skeletonLoader;
  }

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
        <h3 className="font-medium text-lg mb-4">Spese per Categoria</h3>
        
        <div className="space-y-4">
          {categoryData.map((category) => <CategoryItem key={category.id} category={category} />)}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between">
            <p className="font-medium">Totale Mensile</p>
            <p className="font-bold">{formatCurrency(totalMonthly)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategorySpending;