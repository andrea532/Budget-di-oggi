import { FC } from "react";
import { useBudget } from "@/contexts/BudgetContext";
import { formatCurrency } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, Wallet } from "lucide-react";

// Funzione per ottenere i nomi dei giorni della settimana in italiano
function getDayName(dayIndex: number): string {
  const daysOfWeek = [
    "Domenica", "Lunedì", "Martedì", "Mercoledì", 
    "Giovedì", "Venerdì", "Sabato"
  ];
  return daysOfWeek[dayIndex];
}

// Funzione per ottenere una rappresentazione semplificata del giorno
function getSimpleDayName(date: Date, today: Date): string {
  if (date.getDate() === today.getDate() && 
      date.getMonth() === today.getMonth() && 
      date.getFullYear() === today.getFullYear()) {
    return "Oggi";
  }
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.getDate() === tomorrow.getDate() && 
      date.getMonth() === tomorrow.getMonth() && 
      date.getFullYear() === tomorrow.getFullYear()) {
    return "Domani";
  }
  
  // Per il terzo giorno, mostriamo solo il nome del giorno settimanale
  return getDayName(date.getDay());
}

interface DailyBudgetCardProps {
  onAddExpense: () => void;
}

const DailyBudgetCard: FC<DailyBudgetCardProps> = ({ onAddExpense }) => {
  const { isLoading, dailyBudget, remainingToday, todaysExpenses, remainingThisMonth } = useBudget();
  
  // Determina se il saldo è negativo per cambiare il colore di sfondo
  const isNegative = remainingThisMonth < 0 || remainingToday < 0;
  
  // Calcola l'importo risparmiato oggi
  const savedToday = Math.max(0, dailyBudget - todaysExpenses);
  
  // Ottieni la data di oggi
  const today = new Date();
  
  // Genera i dati di rollover per i prossimi 3 giorni
  const daysToDisplay = 3; // Numero di giorni da mostrare
  const rolloverDays = [];
  
  let accumulatedBudget = dailyBudget;
  
  for (let i = 0; i < daysToDisplay; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    // Se è oggi, mostra il budget rimanente, altrimenti il budget previsto
    let dayBudget = i === 0 ? remainingToday : accumulatedBudget;
    
    rolloverDays.push({
      date,
      dayName: getSimpleDayName(date, today),
      budget: dayBudget
    });
    
    // Per i giorni successivi al primo, aumentiamo il budget accumulato
    if (i === 0) {
      accumulatedBudget = dailyBudget + savedToday;
    } else {
      accumulatedBudget += dailyBudget;
    }
  }
  
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="gradient-teal rounded-xl p-6 text-white shadow-lg">
          <Skeleton className="h-4 w-28 bg-white/30" />
          <Skeleton className="h-10 w-36 mt-2 bg-white/30" />
          
          <div className="grid grid-cols-3 gap-2 mt-4 mb-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white/10 rounded-lg p-3 text-center">
                <Skeleton className="h-3 w-12 mx-auto mb-1 bg-white/30" />
                <Skeleton className="h-5 w-16 mx-auto bg-white/30" />
              </div>
            ))}
          </div>
          
          <div className="bg-white/10 p-3 rounded-lg mb-3">
            <div className="text-center">
              <Skeleton className="h-3 w-28 mx-auto bg-white/30" />
              <Skeleton className="h-6 w-32 mt-1 mx-auto bg-white/30" />
            </div>
          </div>
          
          <div className="mt-2 mb-2">
            <Skeleton className="h-3 w-40 mx-auto bg-white/30" />
          </div>

          <div className="mt-4 flex justify-center">
            <Skeleton className="h-10 w-40 bg-white/30 rounded-full" />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      <div className={`${isNegative ? 'gradient-red' : 'gradient-teal'} rounded-xl p-6 text-white shadow-lg`}>
        <p className="text-sm font-medium opacity-90">Budget Giornaliero Disponibile</p>
        <div className="flex items-baseline mt-2 mb-4">
          <h2 className="text-4xl font-bold">{formatCurrency(remainingToday)}</h2>
          <span className="ml-1 text-xs opacity-80">oggi</span>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mb-4">
          {rolloverDays.map((day, index) => (
            <div 
              key={index} 
              className="bg-white/10 rounded-lg p-3 text-center"
            >
              <p className="text-xs font-medium mb-1">{day.dayName}</p>
              <p className="font-semibold">
                {formatCurrency(day.budget)}
              </p>
            </div>
          ))}
        </div>
        
        <div className="bg-white/10 p-3 rounded-lg mb-3">
          <div className="text-center">
            <p className="text-xs opacity-80">Saldo Mensile Disponibile</p>
            <p className="font-semibold text-lg flex items-center justify-center gap-2 mt-1">
              <Wallet className="w-4 h-4" />
              {formatCurrency(remainingThisMonth)}
            </p>
          </div>
        </div>
        
        <div className="text-center text-xs opacity-80 mb-3">
          <p>Risparmia oggi per avere più budget domani</p>
        </div>

        <div className="flex justify-center">
          <Button 
            onClick={onAddExpense}
            className="bg-white text-primary hover:bg-white/90 font-medium rounded-full py-2 px-6 text-sm shadow-md flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Aggiungi Spesa
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DailyBudgetCard;