import { createContext, useContext, useEffect, useState, ReactNode, FC } from 'react';
import { webSocketManager, WebSocketMessage } from '@/lib/webSocketManager';

// Definizione della struttura di contesto
interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
}

// Creazione del contesto con valori di default
const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  lastMessage: null
});

// Provider del contesto WebSocket
export const WebSocketProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(webSocketManager.isSocketConnected());
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  useEffect(() => {
    // Funzione per gestire i messaggi WebSocket
    const handleMessage = (message: WebSocketMessage) => {
      console.log('WebSocketContext: messaggio ricevuto', message);
      setLastMessage(message);
    };
    
    // Aggiungi il listener per tutti i messaggi
    webSocketManager.addMessageListener(handleMessage);
    
    // Controlla lo stato della connessione periodicamente
    const connectionCheckInterval = setInterval(() => {
      const currentConnected = webSocketManager.isSocketConnected();
      // Aggiorna lo stato solo se è cambiato per evitare re-render non necessari
      if (currentConnected !== isConnected) {
        setIsConnected(currentConnected);
      }
    }, 1000);
    
    // Gestisci l'errore in modo silenzioso per evitare di interrompere l'applicazione
    window.addEventListener('unhandledrejection', function(event) {
      // Se l'errore è collegato a WebSocket, lo catturiamo qui
      console.log('Unhandled rejection (promise): ', event.reason);
      // Evitiamo di far propagare l'errore alla console
      event.preventDefault();
    });
    
    // Pulisci alla disattivazione del componente
    return () => {
      webSocketManager.removeMessageListener(handleMessage);
      clearInterval(connectionCheckInterval);
    };
  }, [isConnected]); // Dipendenza aggiunta per la comparazione dello stato
  
  return (
    <WebSocketContext.Provider value={{ isConnected, lastMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Hook personalizzato per usare il contesto WebSocket
export const useWebSocket = () => useContext(WebSocketContext);