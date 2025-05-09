import { createContext, useContext, useState, useEffect, ReactNode, FC } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { webSocketManager, WebSocketMessage } from "@/lib/webSocketManager";

interface BudgetData {
  dailyBudget: number;
  todaysExpenses: number;
  remainingToday: number;
  spentThisMonth: number;
  totalBudget: number;
  remainingThisMonth: number;
  daysLeft: number;
}

interface BudgetContextType {
  isLoading: boolean;
  dailyBudget: number;
  todaysExpenses: number;
  remainingToday: number;
  spentThisMonth: number;
  totalBudget: number;
  remainingThisMonth: number;
  daysLeft: number;
  refreshData: () => Promise<void>;
  addTransaction: (data: TransactionData) => Promise<void>;
  addSavingsGoal: (data: SavingsGoalData) => Promise<void>;
  updateBudgetSettings: (data: BudgetSettingsData) => Promise<void>;
}

interface TransactionData {
  date: string;
  amount: number;
  description: string;
  categoryId: number | null;
  type: "income" | "expense";
}

interface SavingsGoalData {
  name: string;
  targetAmount: number;
  targetDate?: string;
  currentAmount: number;
}

interface BudgetSettingsData {
  monthlyIncome: number;
  monthlyFixedExpenses: number;
  budgetStartDate?: Date | null;
  budgetEndDate?: Date | null;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export const BudgetProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  
  const {
    data: budgetData,
    isLoading,
    refetch
  } = useQuery<BudgetData>({
    queryKey: ["/api/daily-budget"],
    retry: 3,
    staleTime: 1000 * 60 * 5,       // Considera i dati freschi per 5 minuti
    gcTime: 1000 * 60 * 30,          // Cache valida per 30 minuti
    refetchInterval: 1000 * 60 * 3,  // Aggiorna ogni 3 minuti (invece di 5 secondi)
  });
  
  // Prefetch dati critici all'avvio
  useEffect(() => {
    // Definisci una funzione che prefetch i dati principali
    const prefetchCriticalData = async () => {
      try {
        // Utilizziamo fetchQuery per prefetchare questi dati in parallel
        await Promise.all([
          // Prefetch categorie
          queryClient.prefetchQuery({
            queryKey: ["/api/categories"],
            staleTime: 1000 * 60 * 30, // Stale dopo 30 minuti
          }),
          // Prefetch transazioni
          queryClient.prefetchQuery({
            queryKey: ["/api/transactions"],
            staleTime: 1000 * 60 * 10, // Stale dopo 10 minuti
          }),
          // Prefetch obiettivi di risparmio
          queryClient.prefetchQuery({
            queryKey: ["/api/savings-goals"],
            staleTime: 1000 * 60 * 15, // Stale dopo 15 minuti
          }),
        ]);
        console.log("Dati critici prefetchati con successo");
      } catch (error) {
        console.error("Errore durante il prefetch dei dati:", error);
      }
    };
    
    // Esegui il prefetch
    prefetchCriticalData();
  }, []);
  
  // Utilizziamo WebSocket per gli aggiornamenti in tempo reale
  useEffect(() => {
    // Funzione per gestire i messaggi WebSocket
    const handleMessage = (message: WebSocketMessage) => {
      // Aggiorna quando cambia qualunque tipo di dato rilevante
      if (message.type === 'savings-goal-added' || 
          message.type === 'savings-goal-updated' || 
          message.type === 'savings-goal-deleted' ||
          message.type === 'transaction-added' ||
          message.type === 'transaction-deleted' ||
          message.type === 'budget-settings-updated') {
        console.log('BudgetContext ha ricevuto un messaggio per aggiornamento:', message);
        // Aggiorna immediatamente i dati del budget
        refreshData();
      }
    };
    
    // Aggiungi il listener per i messaggi
    webSocketManager.addMessageListener(handleMessage);
    
    // Pulisci alla disattivazione del componente
    return () => {
      webSocketManager.removeMessageListener(handleMessage);
    };
  }, []);

  // Add transaction mutation
  const addTransactionMutation = useMutation({
    mutationFn: async (data: TransactionData) => {
      // Convert numeric values to strings for the backend
      return apiRequest<any>("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          amount: data.amount.toString(),
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: async () => {
      // Strategia migliorata di cache:
      // 1. Invalida le query correlate
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/daily-budget"],
        refetchType: 'all'   // Forza il refetch di tutte le query, non solo quelle attive
      });
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/transactions"],
        refetchType: 'all'
      });
      
      // 2. Prefetch immediato delle query critiche
      // Utilizziamo fetchQuery che è più diretto di refetchQueries
      try {
        await Promise.all([
          queryClient.fetchQuery({ queryKey: ["/api/daily-budget"] }),
          queryClient.fetchQuery({ queryKey: ["/api/transactions"] })
        ]);
      } catch (error) {
        console.error("Errore nel prefetch dopo aggiunta transazione:", error);
        // Se il prefetch fallisce, usiamo refetch come fallback
        await refetch();
      }
      
      toast({
        title: "Transazione aggiunta",
        description: "La transazione è stata registrata con successo.",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Impossibile aggiungere la transazione. Riprova più tardi.",
        variant: "destructive",
      });
      console.error("Errore nell'aggiunta della transazione:", error);
    },
  });

  // Add savings goal mutation
  const addSavingsGoalMutation = useMutation({
    mutationFn: async (data: SavingsGoalData) => {
      // Convert numeric values to strings for the backend
      return apiRequest<any>("/api/savings-goals", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          targetAmount: data.targetAmount.toString(),
          currentAmount: data.currentAmount.toString(),
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: async () => {
      // Strategia migliorata di cache:
      // 1. Invalida le query correlate
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/savings-goals"],
        refetchType: 'all'   // Forza il refetch di tutte le query, non solo quelle attive
      });
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/daily-budget"],
        refetchType: 'all'
      });
      
      // 2. Prefetch immediato delle query critiche
      // Utilizziamo fetchQuery che è più diretto di refetchQueries
      try {
        await Promise.all([
          queryClient.fetchQuery({ queryKey: ["/api/savings-goals"] }),
          queryClient.fetchQuery({ queryKey: ["/api/daily-budget"] })
        ]);
      } catch (error) {
        console.error("Errore nel prefetch dopo aggiunta obiettivo risparmio:", error);
        // Se il prefetch fallisce, usiamo refetch come fallback
        await refetch();
      }
      
      toast({
        title: "Obiettivo di risparmio aggiunto",
        description: "L'obiettivo di risparmio è stato creato con successo.",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Impossibile aggiungere l'obiettivo di risparmio. Riprova più tardi.",
        variant: "destructive",
      });
      console.error("Errore nell'aggiunta dell'obiettivo di risparmio:", error);
    },
  });

  // Update budget settings mutation
  const updateBudgetSettingsMutation = useMutation({
    mutationFn: async (data: BudgetSettingsData) => {
      // Convert numeric values to strings for the backend
      return apiRequest<any>("/api/budget-settings", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          monthlyIncome: data.monthlyIncome.toString(),
          monthlyFixedExpenses: data.monthlyFixedExpenses.toString(),
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: async () => {
      // Strategia migliorata di cache:
      // 1. Invalida le query correlate
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/budget-settings"],
        refetchType: 'all'   // Forza il refetch di tutte le query, non solo quelle attive
      });
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/daily-budget"],
        refetchType: 'all'
      });
      
      // 2. Prefetch immediato delle query critiche
      // Utilizziamo fetchQuery che è più diretto di refetchQueries
      try {
        await Promise.all([
          queryClient.fetchQuery({ queryKey: ["/api/budget-settings"] }),
          queryClient.fetchQuery({ queryKey: ["/api/daily-budget"] })
        ]);
      } catch (error) {
        console.error("Errore nel prefetch dopo aggiornamento impostazioni:", error);
        // Se il prefetch fallisce, usiamo refetch come fallback
        await refetch();
      }
      
      toast({
        title: "Impostazioni aggiornate",
        description: "Le impostazioni del budget sono state aggiornate con successo.",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare le impostazioni. Riprova più tardi.",
        variant: "destructive",
      });
      console.error("Errore nell'aggiornamento delle impostazioni:", error);
    },
  });

  const addTransaction = async (data: TransactionData) => {
    await addTransactionMutation.mutateAsync(data);
    
    // Forzare un aggiornamento immediato
    await queryClient.refetchQueries({ queryKey: ["/api/transactions"] });
  };

  const addSavingsGoal = async (data: SavingsGoalData) => {
    await addSavingsGoalMutation.mutateAsync(data);
    
    // Forza un aggiornamento immediato
    await queryClient.refetchQueries({ queryKey: ["/api/savings-goals"] });
  };

  const updateBudgetSettings = async (data: BudgetSettingsData) => {
    await updateBudgetSettingsMutation.mutateAsync(data);
    
    // Forza un aggiornamento immediato del budget giornaliero
    await queryClient.refetchQueries({ queryKey: ["/api/daily-budget"] });
    await queryClient.refetchQueries({ queryKey: ["/api/budget-settings"] });
  };

  const refreshData = async () => {
    // Strategia migliorata di refresh dei dati
    try {
      // 1. Invalida le query correlate
      await Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: ["/api/daily-budget"],
          refetchType: 'all'
        }),
        queryClient.invalidateQueries({ 
          queryKey: ["/api/transactions"],
          refetchType: 'all'
        }),
        queryClient.invalidateQueries({ 
          queryKey: ["/api/savings-goals"],
          refetchType: 'all'
        }),
        queryClient.invalidateQueries({ 
          queryKey: ["/api/budget-settings"],
          refetchType: 'all'
        }),
        queryClient.invalidateQueries({ 
          queryKey: ["/api/categories"],
          refetchType: 'all'
        })
      ]);
      
      // 2. Prefetch immediato delle query principali
      // Usiamo Promise.all per prefetchare in parallelo e ridurre i tempi di attesa
      await Promise.all([
        queryClient.fetchQuery({ queryKey: ["/api/daily-budget"] }),
        queryClient.fetchQuery({ queryKey: ["/api/transactions"] })
      ]);
      
      // Prefetch secondario per i dati meno cruciali
      // Questo avviene dopo le query principali per dare priorità ai dati critici
      setTimeout(() => {
        Promise.all([
          queryClient.prefetchQuery({ queryKey: ["/api/savings-goals"] }),
          queryClient.prefetchQuery({ queryKey: ["/api/categories"] })
        ]).catch(err => console.error("Errore nel prefetch secondario:", err));
      }, 200);
      
    } catch (error) {
      console.error("Errore durante il refresh dei dati:", error);
      // Se tutto fallisce, utilizziamo il refetch di base
      await refetch();
    }
  };

  const contextValue: BudgetContextType = {
    isLoading,
    dailyBudget: budgetData?.dailyBudget || 0,
    todaysExpenses: budgetData?.todaysExpenses || 0,
    remainingToday: budgetData?.remainingToday || 0,
    spentThisMonth: budgetData?.spentThisMonth || 0,
    totalBudget: budgetData?.totalBudget || 0,
    remainingThisMonth: budgetData?.remainingThisMonth || 0,
    daysLeft: budgetData?.daysLeft || 0,
    refreshData,
    addTransaction,
    addSavingsGoal,
    updateBudgetSettings,
  };

  return (
    <BudgetContext.Provider value={contextValue}>
      {children}
    </BudgetContext.Provider>
  );
};

export const useBudget = (): BudgetContextType => {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error("useBudget must be used within a BudgetProvider");
  }
  return context;
};
