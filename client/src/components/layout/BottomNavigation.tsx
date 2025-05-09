import { FC, useState, forwardRef, ForwardRefRenderFunction } from "react";
import { useLocation, Link } from "wouter";
import AddExpenseModal from "@/components/modals/AddExpenseModal";
import AddIncomeModal from "@/components/modals/AddIncomeModal";
import AddSavingsGoalModal from "@/components/modals/AddSavingsGoalModal";
import { Home, PieChart, Plus, Wallet, UserCog, Minus, Target, X, BarChart3 } from "lucide-react";

interface BottomNavigationProps {}

const BottomNavigationBase: ForwardRefRenderFunction<HTMLDivElement, BottomNavigationProps> = (props, ref) => {
  const [location] = useLocation();
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddIncomeModal, setShowAddIncomeModal] = useState(false);
  const [showAddSavingsGoalModal, setShowAddSavingsGoalModal] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  
  const handleAddButtonClick = () => {
    setShowAddMenu(!showAddMenu);
  };

  return (
    <>
      <div ref={ref} className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-md mx-auto">
          <div className="flex justify-around">
            <Link href="/">
              <div className={`p-3 flex flex-col items-center transition-colors duration-200 ${location === "/" ? "text-primary" : "text-gray-500 hover:text-gray-700"}`}>
                <Home className={`w-6 h-6 transition-transform duration-200 ${location === "/" ? "scale-110" : "hover:scale-110"}`} />
                <span className="text-xs mt-1">Home</span>
              </div>
            </Link>
            
            <Link href="/transactions">
              <div className={`p-3 flex flex-col items-center transition-colors duration-200 ${location === "/transactions" ? "text-primary" : "text-gray-500 hover:text-gray-700"}`}>
                <PieChart className={`w-6 h-6 transition-transform duration-200 ${location === "/transactions" ? "scale-110" : "hover:scale-110"}`} />
                <span className="text-xs mt-1">Transazioni</span>
              </div>
            </Link>
            
            <button 
              className="p-3 flex flex-col items-center relative"
              onClick={handleAddButtonClick}
            >
              <div className="absolute -top-5 h-12 w-12 rounded-full gradient-orange flex items-center justify-center text-white shadow-lg transform hover:scale-110 hover:shadow-xl transition-all duration-300 active:scale-95">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-xs mt-7 text-gray-500">Aggiungi</span>
            </button>
            
            <Link href="/statistics">
              <div className={`p-3 flex flex-col items-center transition-colors duration-200 ${location === "/statistics" ? "text-primary" : "text-gray-500 hover:text-gray-700"}`}>
                <BarChart3 className={`w-6 h-6 transition-transform duration-200 ${location === "/statistics" ? "scale-110" : "hover:scale-110"}`} />
                <span className="text-xs mt-1">Statistiche</span>
              </div>
            </Link>
            
            <Link href="/profile">
              <div className={`p-3 flex flex-col items-center transition-colors duration-200 ${location === "/profile" ? "text-primary" : "text-gray-500 hover:text-gray-700"}`}>
                <UserCog className={`w-6 h-6 transition-transform duration-200 ${location === "/profile" ? "scale-110" : "hover:scale-110"}`} />
                <span className="text-xs mt-1">Profilo</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Add Menu Popup */}
      {showAddMenu && (
        <div className="fixed bottom-20 left-0 right-0 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-4 border border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <button 
                className="flex flex-col items-center p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                onClick={() => {
                  setShowAddExpenseModal(true);
                  setShowAddMenu(false);
                }}
              >
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-2 transform hover:scale-105 transition-transform duration-200 shadow-sm hover:shadow">
                  <Minus className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">Spesa</span>
              </button>
              
              <button 
                className="flex flex-col items-center p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                onClick={() => {
                  setShowAddIncomeModal(true);
                  setShowAddMenu(false);
                }}
              >
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2 transform hover:scale-105 transition-transform duration-200 shadow-sm hover:shadow">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">Entrata</span>
              </button>
              
              <button 
                className="flex flex-col items-center p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                onClick={() => {
                  setShowAddSavingsGoalModal(true);
                  setShowAddMenu(false);
                }}
              >
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-2 transform hover:scale-105 transition-transform duration-200 shadow-sm hover:shadow">
                  <Target className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">Obiettivo</span>
              </button>
              
              <button 
                className="flex flex-col items-center p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                onClick={() => setShowAddMenu(false)}
              >
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 mb-2 transform hover:scale-105 transition-transform duration-200 shadow-sm hover:shadow">
                  <X className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">Chiudi</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modals */}
      <AddExpenseModal 
        open={showAddExpenseModal} 
        onClose={() => setShowAddExpenseModal(false)} 
      />
      
      <AddIncomeModal 
        open={showAddIncomeModal} 
        onClose={() => setShowAddIncomeModal(false)} 
      />
      
      <AddSavingsGoalModal 
        open={showAddSavingsGoalModal} 
        onClose={() => setShowAddSavingsGoalModal(false)} 
      />
    </>
  );
};

const BottomNavigation = forwardRef<HTMLDivElement, BottomNavigationProps>(BottomNavigationBase);
export default BottomNavigation;
