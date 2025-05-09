import { FC, useMemo, useCallback } from "react";
import { useBudget } from "@/contexts/BudgetContext";
import { formatCurrency } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { calculateRollover } from "@/lib/budgetCalculator";

// Array costante per i giorni della settimana in italiano
const GIORNI_SETTIMANA = [
  "Domenica", "Lunedì", "Martedì", "Mercoledì", 
  "Giovedì", "Venerdì", "Sabato"
];

// Funzione per ottenere i nomi dei giorni della settimana in italiano
function getDayName(dayIndex: number): string {
  return GIORNI_SETTIMANA[dayIndex];
}

// Funzione per ottenere una rappresentazione semplificata del giorno
function getSimpleDayName(date: Date, today: Date): string {
  // Confronto delle date per "Oggi"
  if (date.getDate() === today.getDate() && 
      date.getMonth() === today.getMonth() && 
      date.getFullYear() === today.getFullYear()) {
    return "Oggi";
  }
  
  // Confronto delle date per "Domani"
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.getDate() === tomorrow.getDate() && 
      date.getMonth() === tomorrow.getMonth() && 
      date.getFullYear() === tomorrow.getFullYear()) {
    return "Domani";
  }
  
  // Altrimenti restituisce il nome del giorno
  return getDayName(date.getDay());
}

const BudgetRollover: FC = () => {
  const { isLoading, dailyBudget, todaysExpenses } = useBudget();
  
  // Calcola l'importo risparmiato oggi utilizzando useMemo per memorizzare il risultato
  const savedToday = useMemo(() => {
    return Math.max(0, dailyBudget - todaysExpenses);
  }, [dailyBudget, todaysExpenses]);
  
  // Ottieni la data di oggi - usiamo useMemo perché questo valore non dovrebbe cambiare durante il rendering
  const today = useMemo(() => new Date(), []);
  
  // Memorizza la funzione getSimpleDayName con useCallback
  const getSimpleDayNameMemoized = useCallback(
    (date: Date) => getSimpleDayName(date, today),
    [today]
  );
  
  // Genera i dati di rollover per i prossimi 5 giorni con useMemo
  // Questo ricalcola solo quando cambiano dailyBudget, todaysExpenses o today
  const rolloverDays = useMemo(() => {
    const daysToDisplay = 5; // Numero di giorni da mostrare
    const days = [];
    let accumulatedBudget = dailyBudget;
    
    for (let i = 0; i < daysToDisplay; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      // Se è oggi, mostra il budget rimanente, altrimenti il budget previsto
      let dayBudget = accumulatedBudget;
      
      // Dal giorno dopo in poi, aggiungiamo il risparmio di oggi
      if (i > 0) {
        dayBudget += savedToday;
      }
      
      days.push({
        date,
        dayName: getSimpleDayNameMemoized(date),
        budget: dayBudget
      });
      
      // Per i giorni successivi al primo, aumentiamo il budget accumulato
      if (i === 0) {
        accumulatedBudget = dailyBudget + savedToday;
      } else {
        accumulatedBudget += dailyBudget;
      }
    }
    
    return days;
  }, [dailyBudget, todaysExpenses, savedToday, today, getSimpleDayNameMemoized]);
  
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-4" />
          <div className="grid grid-cols-5 gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3">
                <Skeleton className="h-3 w-12 mx-auto mb-1" />
                <Skeleton className="h-6 w-16 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
        <p className="text-sm text-gray-600 mb-4">
          Risparmia oggi per avere più budget domani. Se spendi meno del tuo budget giornaliero, la differenza sarà aggiunta al budget di domani.
        </p>
        
        <div className="grid grid-cols-5 gap-2">
          {rolloverDays.map((day, index) => (
            <div 
              key={index} 
              className={`rounded-lg p-3 text-center ${index === 0 ? 'bg-green-50 border border-green-100' : 'bg-gray-50'}`}
            >
              <p className="text-xs font-medium mb-1">{day.dayName}</p>
              <p className={`font-bold ${index === 0 ? 'text-green-600' : ''}`}>
                {formatCurrency(day.budget)}
              </p>
            </div>
          ))}
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <div>
            <p className="text-sm font-medium">Risparmiato oggi</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(savedToday)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetRollover;
