import { FC, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import BottomNavigation from "@/components/layout/BottomNavigation";
import SavingsGoals from "@/components/savings/SavingsGoals";
import AddSavingsGoalModal from "@/components/modals/AddSavingsGoalModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface SavingsGoal {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
}

const SavingsPage: FC = () => {
  const [showAddSavingsGoalModal, setShowAddSavingsGoalModal] = useState(false);
  const bottomNavRef = useRef<HTMLDivElement>(null);
  
  const {
    data: savingsGoals,
    isLoading,
    isError,
  } = useQuery<SavingsGoal[]>({
    queryKey: ["/api/savings-goals"],
  });

  // Calculate total savings
  const totalSavings = savingsGoals?.reduce(
    (sum, goal) => sum + (typeof goal.currentAmount === 'string' ? parseFloat(goal.currentAmount) : goal.currentAmount),
    0
  ) || 0;

  // Calculate total targets
  const totalTargets = savingsGoals?.reduce(
    (sum, goal) => sum + (typeof goal.targetAmount === 'string' ? parseFloat(goal.targetAmount) : goal.targetAmount),
    0
  ) || 0;

  // Calculate overall progress percentage
  const overallProgress = totalTargets > 0 ? (totalSavings / totalTargets) * 100 : 0;
  
  const handleAddSavingsGoal = () => {
    // Simuliamo un click sul pulsante Aggiungi nel BottomNavigation
    const addButton = document.querySelector('.gradient-orange') as HTMLElement;
    if (addButton) {
      addButton.click();
      // Poi simuliamo il click sul pulsante Obiettivo nel menu popup
      setTimeout(() => {
        const goalButton = document.querySelector('.bg-purple-100') as HTMLElement;
        if (goalButton) {
          goalButton.click();
        }
      }, 100);
    }
  };

  return (
    <>
      <Header title="Risparmi" />
      
      <main className="pb-20">
        <div className="p-4">
          <Card className="mb-6 bg-gradient-to-r from-[#8E64F0] to-[#5E35B1] text-white">
            <CardHeader>
              <CardTitle className="text-xl">Totale Risparmi</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-10 w-32 bg-white/30" />
              ) : (
                <h2 className="text-3xl font-bold mb-2">{formatCurrency(totalSavings)}</h2>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso</span>
                  <span>{Math.round(overallProgress)}%</span>
                </div>
                <Progress value={overallProgress} className="h-2 bg-white/20" />
                <div className="flex justify-between text-sm">
                  <span>Obiettivo Totale</span>
                  {isLoading ? (
                    <Skeleton className="h-4 w-16 bg-white/30" />
                  ) : (
                    <span>{formatCurrency(totalTargets)}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Card informativa su come funzionano gli obiettivi */}
          <Card className="mb-6 bg-blue-50 border-blue-100">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 p-2 rounded-full mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-700">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                </div>
                <div>
                  <h4 className="text-blue-800 font-medium mb-1 text-sm">Come funzionano gli obiettivi</h4>
                  <p className="text-blue-700 text-xs leading-relaxed mb-1">
                    Quando crei un obiettivo di risparmio, BudgetUp calcola automaticamente quanto risparmiare ogni giorno e lo sottrae dal tuo budget giornaliero disponibile.
                  </p>
                  <p className="text-blue-700 text-xs leading-relaxed">
                    Gli obiettivi con scadenza avranno priorità, mentre quelli senza scadenza utilizzeranno il 5% del tuo reddito discrezionale.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-medium">I Tuoi Obiettivi</h2>
            <Button 
              onClick={handleAddSavingsGoal}
              className="gradient-purple text-white rounded-full h-8 w-8 p-0"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="sr-only">Aggiungi Obiettivo</span>
            </Button>
          </div>
          
          <SavingsGoals onAddGoal={handleAddSavingsGoal} />
          
          {/* I consigli per risparmiare sono stati rimossi come richiesto */}
        </div>
      </main>
      
      <BottomNavigation ref={bottomNavRef} />
      
      <AddSavingsGoalModal 
        open={showAddSavingsGoalModal}
        onClose={() => setShowAddSavingsGoalModal(false)}
      />
    </>
  );
};

export default SavingsPage;
