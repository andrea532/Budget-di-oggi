import { FC, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatCurrency, getRemainingDaysMessage, parseCurrency } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateSavingsProgress, calculateDailySavingsNeeded } from "@/lib/budgetCalculator";
import { Edit, Trash2, Plus, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import EditSavingsGoalModal from "@/components/modals/EditSavingsGoalModal";
import { webSocketManager, WebSocketMessage } from "@/lib/webSocketManager";

interface SavingsGoal {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
}

interface SavingsGoalsProps {
  onAddGoal: () => void;
}

const SavingsGoals: FC<SavingsGoalsProps> = ({ onAddGoal }) => {
  const { toast } = useToast();
  const [goalToDelete, setGoalToDelete] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<SavingsGoal | null>(null);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [goalToAddFunds, setGoalToAddFunds] = useState<number | null>(null);
  const [fundsAmount, setFundsAmount] = useState('0');
  
  const {
    data: savingsGoals,
    isLoading,
    isError,
    refetch: refetchGoals
  } = useQuery<SavingsGoal[]>({
    queryKey: ["/api/savings-goals"],
    // Rimuoviamo il polling eccessivo dato che usiamo già WebSocket per aggiornamenti real-time
    staleTime: 30000, // Considera i dati validi per 30 secondi
  });
  
  // Aggiungi un effetto per ascoltare i messaggi WebSocket relativi agli obiettivi
  useEffect(() => {
    // Funzione per gestire i messaggi WebSocket
    const handleMessage = (message: WebSocketMessage) => {
      if (message.type === 'savings-goal-added' || 
          message.type === 'savings-goal-updated' || 
          message.type === 'savings-goal-deleted') {
        console.log('SavingsGoals ha ricevuto un messaggio WebSocket:', message);
        // Aggiorna immediatamente la lista degli obiettivi
        refetchGoals();
      }
    };
    
    // Aggiungi il listener per i messaggi
    webSocketManager.addMessageListener(handleMessage);
    
    // Pulizia alla disattivazione del componente
    return () => {
      webSocketManager.removeMessageListener(handleMessage);
    };
  }, [refetchGoals]);
  
  // Mutation per eliminare un obiettivo
  const deleteMutation = useMutation({
    mutationFn: async (goalId: number) => {
      // Usiamo api.delete per gestire meglio il response
      const response = await fetch(`/api/savings-goals/${goalId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Errore durante l'eliminazione dell'obiettivo");
      }
      
      // Restituiamo un oggetto standard per evitare errori di parsing
      return { success: true };
    },
    onSuccess: () => {
      // Invalida le query correlate
      queryClient.invalidateQueries({ queryKey: ["/api/savings-goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-budget"] }); // Importante: aggiorna anche il budget giornaliero
      
      // Forziamo l'aggiornamento immediato
      queryClient.fetchQuery({ 
        queryKey: ["/api/savings-goals"],
      });
      queryClient.fetchQuery({ 
        queryKey: ["/api/daily-budget"],
      });
      
      toast({
        title: "Obiettivo eliminato",
        description: "L'obiettivo di risparmio è stato eliminato con successo.",
      });
      setShowDeleteConfirm(false);
    },
    onError: (error) => {
      console.error("Errore nell'eliminazione dell'obiettivo:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare l'obiettivo. Riprova più tardi.",
        variant: "destructive",
      });
    }
  });
  
  // Gestisce la richiesta di eliminazione
  const handleDeleteRequest = (goalId: number) => {
    setGoalToDelete(goalId);
    setShowDeleteConfirm(true);
  };
  
  // Conferma ed esegue l'eliminazione
  const confirmDelete = async () => {
    if (goalToDelete !== null) {
      await deleteMutation.mutateAsync(goalToDelete);
    }
  };
  
  // Mutation per aggiungere fondi a un obiettivo
  const addFundsMutation = useMutation({
    mutationFn: async ({ goalId, amount }: { goalId: number, amount: number }) => {
      // Usiamo fetch direttamente per gestire meglio il response
      const response = await fetch(`/api/savings-goals/${goalId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ amount })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Errore durante l'aggiunta dei fondi");
      }
      
      // Gestiamo correttamente il response JSON
      return response.json();
    },
    onSuccess: () => {
      // Invalida le query correlate
      queryClient.invalidateQueries({ queryKey: ["/api/savings-goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-budget"] });
      
      // Forziamo l'aggiornamento immediato
      queryClient.fetchQuery({ queryKey: ["/api/savings-goals"] });
      queryClient.fetchQuery({ queryKey: ["/api/daily-budget"] });
      
      toast({
        title: "Fondi aggiunti",
        description: "I fondi sono stati aggiunti con successo all'obiettivo di risparmio.",
      });
      
      // Reset state
      setShowAddFundsModal(false);
      setGoalToAddFunds(null);
      setFundsAmount('0');
    },
    onError: (error) => {
      console.error("Errore nell'aggiunta dei fondi:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiungere fondi all'obiettivo. Riprova più tardi.",
        variant: "destructive",
      });
    }
  });
  
  // Apre la modale per aggiungere fondi
  const handleAddFunds = (goalId: number) => {
    setGoalToAddFunds(goalId);
    setFundsAmount('0');
    setShowAddFundsModal(true);
  };
  
  // Conferma e aggiunge i fondi
  const confirmAddFunds = async () => {
    if (goalToAddFunds !== null) {
      try {
        const amount = parseCurrency(fundsAmount);
        if (amount <= 0) {
          toast({
            title: "Importo non valido",
            description: "L'importo deve essere maggiore di zero.",
            variant: "destructive",
          });
          return;
        }
        
        await addFundsMutation.mutateAsync({ goalId: goalToAddFunds, amount });
      } catch (error) {
        toast({
          title: "Errore",
          description: "Formato dell'importo non valido.",
          variant: "destructive",
        });
      }
    }
  };
  
  // Apre la modale per modificare l'obiettivo
  const handleEdit = (goalId: number) => {
    // Trova l'obiettivo da modificare
    const goal = savingsGoals?.find(g => g.id === goalId);
    if (goal) {
      setGoalToEdit(goal);
      setShowEditModal(true);
    } else {
      toast({
        title: "Errore",
        description: "Obiettivo non trovato.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="gradient-purple rounded-lg p-5 shadow-sm text-white">
          <Skeleton className="h-6 w-48 bg-white/30 mb-3" />
          <div className="bg-white bg-opacity-10 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <Skeleton className="h-5 w-32 bg-white/30" />
              <Skeleton className="h-4 w-24 bg-white/30" />
            </div>
            <Skeleton className="h-2 w-full bg-white/30 rounded-full mb-1" />
            <Skeleton className="h-3 w-40 bg-white/30" />
          </div>
          <div className="mt-4 flex justify-center">
            <Skeleton className="h-10 w-40 bg-white/30 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          Errore nel caricamento degli obiettivi di risparmio. Riprova più tardi.
        </div>
      </div>
    );
  }

  const hasGoals = savingsGoals && savingsGoals.length > 0;

  return (
    <div className="p-4">
      <div className="gradient-purple rounded-lg p-5 shadow-sm text-white">
        <h3 className="font-medium text-lg mb-3">Obiettivi di Risparmio</h3>
        
        {!hasGoals && (
          <div className="bg-white bg-opacity-10 rounded-lg p-4 mb-4 text-center">
            <p className="mb-2">Non hai ancora obiettivi di risparmio</p>
            <p className="text-sm opacity-80 mb-3">
              Crea un obiettivo per iniziare a risparmiare per le cose importanti
            </p>
          </div>
        )}
        
        {hasGoals && savingsGoals.map((goal) => {
          const progress = calculateSavingsProgress(goal.currentAmount, goal.targetAmount);
          const dailyAmount = goal.targetDate 
            ? calculateDailySavingsNeeded(goal.currentAmount, goal.targetAmount, goal.targetDate)
            : 0;
            
          return (
            <div key={goal.id} className="bg-white bg-opacity-10 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <p className="font-medium">{goal.name}</p>
                <p className="text-sm">
                  {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                </p>
              </div>
              <div className="h-2 bg-white bg-opacity-20 rounded-full overflow-hidden mb-1">
                <div 
                  className="h-full bg-white rounded-full" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between items-center mt-2">
                {goal.targetDate ? (
                  <p className="text-xs">
                    {getRemainingDaysMessage(goal.targetDate)} - {formatCurrency(dailyAmount)}/giorno
                  </p>
                ) : (
                  <p className="text-xs">{Math.round(progress)}% completato</p>
                )}
                
                {/* Pulsanti per modificare, aggiungere fondi o eliminare */}
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleEdit(goal.id)}
                    className="text-white/80 hover:text-white p-1 rounded-full transition-colors"
                    aria-label="Modifica obiettivo"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleAddFunds(goal.id)}
                    className="text-white/80 hover:text-white p-1 rounded-full transition-colors"
                    aria-label="Aggiungi fondi"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 12h8" />
                      <path d="M12 8v8" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => handleDeleteRequest(goal.id)}
                    className="text-white/80 hover:text-white p-1 rounded-full transition-colors"
                    aria-label="Elimina obiettivo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        
        <div className="mt-4 flex justify-center">
          <Button 
            onClick={onAddGoal}
            className="bg-white text-accent hover:bg-white/90 font-medium rounded-full py-2 px-6 text-sm shadow-md flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Obiettivo
          </Button>
        </div>
      </div>
      
      {/* Dialog di conferma eliminazione */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Elimina obiettivo di risparmio</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare questo obiettivo? Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center p-4 border rounded-md bg-orange-50">
            <AlertCircle className="h-5 w-5 text-orange-500 mr-2" />
            <p className="text-sm">
              L'importo risparmiato per questo obiettivo non verrà aggiunto automaticamente al tuo budget disponibile.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Annulla
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminazione..." : "Elimina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modale di modifica obiettivo */}
      <EditSavingsGoalModal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setGoalToEdit(null);
        }}
        goal={goalToEdit}
      />
      
      {/* Dialog per aggiungere fondi */}
      <Dialog open={showAddFundsModal} onOpenChange={setShowAddFundsModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Aggiungi fondi al risparmio</DialogTitle>
            <DialogDescription>
              Inserisci l'importo che vuoi aggiungere a questo obiettivo di risparmio.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Importo</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                  <Input
                    id="amount"
                    type="text"
                    value={fundsAmount}
                    onChange={(e) => setFundsAmount(e.target.value)}
                    className="pl-8"
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFundsModal(false)}>
              Annulla
            </Button>
            <Button 
              onClick={confirmAddFunds}
              disabled={addFundsMutation.isPending}
            >
              {addFundsMutation.isPending ? "Aggiunta in corso..." : "Aggiungi fondi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SavingsGoals;
