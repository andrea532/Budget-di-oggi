import { FC } from "react";

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TabNavigation: FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex px-4">
        <button 
          className={`py-4 px-4 border-b-2 font-medium ${
            activeTab === "budget" 
              ? "border-primary text-primary" 
              : "border-transparent text-gray-500"
          }`}
          onClick={() => onTabChange("budget")}
        >
          Budget
        </button>
        <button 
          className={`py-4 px-4 border-b-2 font-medium ${
            activeTab === "savings" 
              ? "border-primary text-primary" 
              : "border-transparent text-gray-500"
          }`}
          onClick={() => onTabChange("savings")}
        >
          Risparmio
        </button>
        <button 
          className={`py-4 px-4 border-b-2 font-medium ${
            activeTab === "stats" 
              ? "border-primary text-primary" 
              : "border-transparent text-gray-500"
          }`}
          onClick={() => onTabChange("stats")}
        >
          Statistiche
        </button>
      </nav>
    </div>
  );
};

export default TabNavigation;
