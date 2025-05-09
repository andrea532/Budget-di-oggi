import { FC } from "react";
import { Wallet, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

interface HeaderProps {
  title?: string;
}

const Header: FC<HeaderProps> = ({ title = "BudgetUp" }) => {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      // Forza l'invalidazione della query utente
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.setQueryData(["/api/auth/me"], null);
      // Reindirizza immediatamente
      setLocation('/auth');
      // Forza un refresh della pagina per assicurarsi che tutti gli stati vengano ripristinati
      setTimeout(() => {
        window.location.href = '/auth';
      }, 100);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile effettuare il logout",
        variant: "destructive"
      });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white bg-opacity-90 backdrop-blur-sm shadow-sm">
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center">
          <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center text-white">
            <Wallet size={20} />
          </div>
          <h1 className="ml-2 font-medium text-xl">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <button 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 text-red-500" 
              aria-label="Logout"
            >
              <LogOut size={20} />
            </button>
          )}
          <button 
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200" 
            aria-label="Impostazioni"
          >
            <Settings size={20} className="text-gray-500" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
