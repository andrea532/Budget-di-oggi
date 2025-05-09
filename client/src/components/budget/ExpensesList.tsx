import { FC, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCurrency, getRelativeDate, formatTime } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ShoppingBag, 
  Coffee, 
  Home, 
  Car, 
  Plane, 
  CreditCard, 
  Wallet, 
  HelpCircle,
  MoreVertical,
  Pencil,
  Trash
} from "lucide-react";
import EditTransactionModal from "@/components/modals/EditTransactionModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Transaction {
  id: number;
  date: string;
  amount: number;
  description: string;
  categoryId: number | null;
  type: "income" | "expense";
  category?: {
    name: string;
    color: string;
    icon: string;
  };
}

interface ExpensesListProps {
  limit?: number;
  showViewAll?: boolean;
}

const ExpensesList: FC<ExpensesListProps> = ({ limit = 3, showViewAll = true }) => {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Funzione per mappare le icone delle categorie a componenti Lucide
  const getCategoryIcon = (iconName: string, size: number = 16) => {
    switch (iconName.toLowerCase()) {
      case 'shopping-bag':
      case 'shopping':
        return <ShoppingBag size={size} />;
      case 'coffee':
      case 'cafe':
        return <Coffee size={size} />;
      case 'home':
      case 'house':
        return <Home size={size} />;
      case 'car':
      case 'auto':
        return <Car size={size} />;
      case 'plane':
      case 'travel':
        return <Plane size={size} />;
      case 'credit-card':
      case 'payment':
        return <CreditCard size={size} />;
      case 'wallet':
      case 'money':
        return <Wallet size={size} />;
      default:
        return <HelpCircle size={size} />;
    }
  };
  // Query con opzioni più semplici
  const {
    data: transactions,
    isLoading,
    isError,
    refetch: refetchTransactions
  } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  interface Category {
    id: number;
    name: string;
    color: string;
    icon: string;
  }
  
  const {
    data: categories,
    isLoading: isCategoriesLoading,
  } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  // Forza il refetch dei dati ogni 3 secondi
  useEffect(() => {
    const interval = setInterval(() => {
      refetchTransactions();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [refetchTransactions]);

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedTransaction(null);
  };

  // Combine transactions with their categories
  const transactionsWithCategories = transactions?.map(transaction => {
    const category = categories?.find((cat: Category) => cat.id === transaction.categoryId);
    return {
      ...transaction,
      category
    };
  });

  // Sort by date (newest first) and limit
  const recentTransactions = transactionsWithCategories
    ?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    ?.slice(0, limit);

  if (isLoading || isCategoriesLoading) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-lg">Transazioni Recenti</h3>
          {showViewAll && (
            <button className="text-sm text-accent font-medium">Visualizza Tutto</button>
          )}
        </div>

        <div className="space-y-3">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="ml-3">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-3 w-16 mt-1" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          Errore nel caricamento delle transazioni. Riprova più tardi.
        </div>
      </div>
    );
  }

  if (!recentTransactions?.length) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-lg">Transazioni Recenti</h3>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg text-center">
          <p className="text-gray-500">Nessuna transazione registrata.</p>
          <p className="text-sm text-gray-400 mt-1">Inizia ad aggiungere transazioni per visualizzarle qui.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-lg">Transazioni Recenti</h3>
        {showViewAll && (
          <button className="text-sm text-accent font-medium">Visualizza Tutto</button>
        )}
      </div>

      <div className="space-y-3">
        {recentTransactions.map((transaction) => {
          const isExpense = transaction.type === "expense";
          const categoryColor = transaction.category?.color || "#9E9E9E";
          const categoryIcon = transaction.category?.icon || "question";
          const categoryName = transaction.category?.name || "Altro";
          
          return (
            <div
              key={transaction.id}
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex justify-between items-center"
            >
              <div className="flex items-center flex-grow">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: categoryColor }}
                >
                  {getCategoryIcon(categoryIcon, 18)}
                </div>
                <div className="ml-3">
                  <p className="font-medium">{transaction.description || categoryName}</p>
                  <p className="text-xs text-gray-500">
                    {getRelativeDate(transaction.date)}, {formatTime(transaction.date)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center">
                <p className={`font-medium mr-4 ${isExpense ? "text-destructive" : "text-green-600"}`}>
                  {isExpense ? "- " : "+ "}{formatCurrency(transaction.amount)}
                </p>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditTransaction(transaction)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      <span>Modifica</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        setSelectedTransaction(transaction);
                        setIsEditModalOpen(true);
                      }}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      <span>Elimina</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Modal di modifica */}
      <EditTransactionModal 
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        transaction={selectedTransaction}
      />
    </div>
  );
};

export default ExpensesList;
