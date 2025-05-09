/**
 * WebSocketManager - Gestore centralizzato per connessioni WebSocket
 * 
 * Questa classe implementa un pattern Singleton per assicurare che ci sia una sola
 * istanza di connessione WebSocket nell'applicazione, evitando così problemi di
 * connessioni multiple e conflitti.
 */

import { queryClient } from './queryClient';

// Tipi di messaggi WebSocket
export interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
}

// Tipo per le callback di messaggi
type MessageCallback = (message: WebSocketMessage) => void;

class WebSocketManager {
  private static instance: WebSocketManager;
  private socket: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageListeners: Set<MessageCallback> = new Set();
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 3000; // 3 secondi
  
  // Costruttore privato per implementare il Singleton
  private constructor() {
    this.connect();
  }
  
  // Metodo statico per ottenere l'istanza
  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }
  
  // Flag statico per prevenire connessioni multiple durante fase di inizializzazione
  private static isConnecting = false;
  
  // Metodo per connettersi al WebSocket
  private connect(): void {
    // Se in modalità sviluppo e HMR è attivo, simula una connessione senza usare WebSocket
    if (import.meta.env.DEV && (window as any).__vite_hmr) {
      console.log('WebSocketManager: modalità sviluppo HMR rilevata, simulazione connessione');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Simuliamo un messaggio di connessione stabilita
      setTimeout(() => {
        const connectMessage: WebSocketMessage = {
          type: 'connect',
          message: 'Connessione WebSocket stabilita (simulazione)'
        };
        
        // Notifichiamo i listener
        this.messageListeners.forEach(listener => {
          try {
            listener(connectMessage);
          } catch (error) {
            console.error('Errore nel listener WebSocket simulato:', error);
          }
        });
      }, 500);
      
      return;
    }
    
    // Se è già in corso un tentativo di connessione, esci
    if (WebSocketManager.isConnecting) {
      console.log('WebSocketManager: connessione già in corso, ignoro richiesta duplicata');
      return;
    }
    
    // Se la socket è già connessa, non fare nulla
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocketManager: già connesso');
      return;
    }
    
    // Se è in fase di connessione, attendiamo che finisca
    if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
      console.log('WebSocketManager: connessione già in corso');
      return;
    }
    
    // Pulisci eventuali socket esistenti
    if (this.socket) {
      this.cleanupSocket();
    }
    
    // Imposta il flag di connessione
    WebSocketManager.isConnecting = true;
    
    try {
      // Impostiamo un delay prima di tentare la connessione
      // Questo aiuta a evitare connessioni premature durante l'inizializzazione dell'app
      setTimeout(() => {
        try {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const wsUrl = `${protocol}//${window.location.host}/ws`;
          
          console.log('WebSocketManager: connessione a', wsUrl);
          
          // Crea una nuova connessione WebSocket con gestione degli errori
          this.socket = new WebSocket(wsUrl);
          
          // Timeout per la connessione
          const connectionTimeout = setTimeout(() => {
            if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
              console.error('WebSocketManager: timeout connessione');
              try {
                this.socket.close();
              } catch (closeError) {
                console.error('WebSocketManager: errore durante la chiusura dopo timeout', closeError);
              }
              WebSocketManager.isConnecting = false;
              this.scheduleReconnect();
            }
          }, 10000); // 10 secondi di timeout
          
          // Event listener
          this.socket.addEventListener('open', () => {
            clearTimeout(connectionTimeout);
            WebSocketManager.isConnecting = false;
            this.handleOpen();
          });
          
          this.socket.addEventListener('message', this.handleMessage);
          
          this.socket.addEventListener('close', () => {
            clearTimeout(connectionTimeout);
            WebSocketManager.isConnecting = false;
            this.handleClose();
          });
          
          this.socket.addEventListener('error', (event: Event) => {
            clearTimeout(connectionTimeout);
            WebSocketManager.isConnecting = false;
            this.handleError(event);
            // Invece di schedulare qui, lasciamo che sia l'evento close a farlo
            // poiché ogni evento error è tipicamente seguito da un close
          });
        } catch (innerError) {
          WebSocketManager.isConnecting = false;
          console.error('Errore durante la creazione della connessione WebSocket:', innerError);
          this.scheduleReconnect();
        }
      }, 1000); // Attendi 1 secondo prima di tentare la connessione
    } catch (error) {
      WebSocketManager.isConnecting = false;
      console.error('Errore inaspettato durante l\'inizializzazione della connessione WebSocket:', error);
      this.scheduleReconnect();
    }
  }
  
  // Gestisce l'apertura della connessione
  private handleOpen = (): void => {
    console.log('WebSocketManager: connessione stabilita');
    this.isConnected = true;
    this.reconnectAttempts = 0; // Resetta i tentativi di riconnessione dopo una connessione riuscita
  };
  
  // Gestisce i messaggi in arrivo
  private handleMessage = (event: MessageEvent): void => {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      console.log('WebSocketManager: messaggio ricevuto', message);
      
      // Notifica tutti i listener registrati
      this.messageListeners.forEach(listener => {
        try {
          listener(message);
        } catch (error) {
          console.error('Errore nel listener WebSocket:', error);
        }
      });
      
      // Gestisce automaticamente l'invalidazione delle cache
      this.handleAutomaticInvalidation(message);
    } catch (error) {
      console.error('Errore nel parsing del messaggio WebSocket:', error);
    }
  };
  
  // Gestisce la chiusura della connessione
  private handleClose = (): void => {
    // Evita elaborazioni multiple se siamo già in fase di riconnessione
    if (WebSocketManager.isConnecting) {
      console.log('WebSocketManager: connessione chiusa, ma riconnessione già in corso');
      return;
    }
    
    console.log('WebSocketManager: connessione chiusa');
    this.isConnected = false;
    this.cleanupSocket(false);
    this.scheduleReconnect();
  };
  
  // Gestisce gli errori della connessione
  private handleError = (event: Event): void => {
    // Evita elaborazioni multiple se siamo già in fase di riconnessione
    if (WebSocketManager.isConnecting) {
      console.log('WebSocketManager: errore WebSocket, ma riconnessione già in corso');
      return;
    }
    
    console.error('WebSocketManager: errore WebSocket', event);
    this.isConnected = false;
    this.cleanupSocket(false);
    this.scheduleReconnect();
  };
  
  // Forza il prefetch di query specificate per aggiornare immediatamente i dati
  private forcePrefetch(queryKeys: string[]): void {
    // Esegui i fetches in parallelo per ottimizzare le prestazioni
    console.log('WebSocketManager: forzando prefetch per:', queryKeys);
    
    Promise.all(
      queryKeys.map(key => 
        queryClient.fetchQuery({ queryKey: [key] })
          .catch(error => console.error(`Errore nel prefetch forzato per ${key}:`, error))
      )
    ).catch(error => {
      console.error('Errore durante il prefetch forzato generale:', error);
    });
  }
  
  // Gestisce l'invalidazione automatica delle cache
  private handleAutomaticInvalidation(message: WebSocketMessage): void {
    switch (message.type) {
      case 'savings-goal-added':
      case 'savings-goal-updated':
      case 'savings-goal-deleted':
        queryClient.invalidateQueries({ queryKey: ['/api/savings-goals'] });
        queryClient.invalidateQueries({ queryKey: ['/api/daily-budget'] });
        // Forza il prefetch immediato per garantire l'aggiornamento dell'UI
        this.forcePrefetch(['/api/daily-budget']);
        break;
        
      case 'transaction-added':
      case 'transaction-deleted':
        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/daily-budget'] });
        // Forza il prefetch immediato per garantire l'aggiornamento dell'UI
        this.forcePrefetch(['/api/daily-budget']);
        break;
        
      case 'budget-settings-updated':
        queryClient.invalidateQueries({ queryKey: ['/api/budget-settings'] });
        queryClient.invalidateQueries({ queryKey: ['/api/daily-budget'] });
        // Forza il prefetch immediato per garantire l'aggiornamento dell'UI
        this.forcePrefetch(['/api/budget-settings', '/api/daily-budget']);
        break;
    }
  }
  
  // Pulisce la connessione socket
  private cleanupSocket(closeConnection: boolean = true): void {
    if (!this.socket) return;
    
    // Rimuovi tutti gli event listener per evitare duplicati
    this.socket.removeEventListener('open', this.handleOpen);
    this.socket.removeEventListener('message', this.handleMessage);
    this.socket.removeEventListener('close', this.handleClose);
    this.socket.removeEventListener('error', this.handleError);
    
    // Chiudi la connessione solo se richiesto e se è aperta
    if (closeConnection && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.close();
      } catch (error) {
        console.error('WebSocketManager: errore durante la chiusura della WebSocket:', error);
      }
    }
    
    this.socket = null;
  }
  
  // Pianifica una riconnessione con controllo per evitare riconnessioni multiple
  private scheduleReconnect(): void {
    // Se è già in corso un tentativo di connessione, non pianificare un altro
    if (WebSocketManager.isConnecting) {
      console.log('WebSocketManager: riconnessione già in corso, non schedulo un\'altra');
      return;
    }
    
    // Cancella eventuali timer di riconnessione esistenti
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts <= this.MAX_RECONNECT_ATTEMPTS) {
      console.log(`WebSocketManager: tentativo di riconnessione ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS} tra ${this.RECONNECT_DELAY}ms`);
      
      this.reconnectTimer = setTimeout(() => {
        // Pulisci il timer
        this.reconnectTimer = null;
        // Tenta di riconnettersi
        this.connect();
      }, this.RECONNECT_DELAY);
    } else {
      console.error('WebSocketManager: numero massimo di tentativi di riconnessione raggiunto');
    }
  }
  
  // Aggiunge un listener per i messaggi
  public addMessageListener(callback: MessageCallback): void {
    this.messageListeners.add(callback);
  }
  
  // Rimuove un listener
  public removeMessageListener(callback: MessageCallback): void {
    this.messageListeners.delete(callback);
  }
  
  // Controlla se la connessione è attiva
  public isSocketConnected(): boolean {
    return this.isConnected;
  }
  
  // Invia un messaggio (se la connessione è attiva)
  public sendMessage(message: any): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      return true;
    }
    return false;
  }
  
  // Disconnette il WebSocket
  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.cleanupSocket();
    this.isConnected = false;
  }
}

// Esporta un'istanza singleton
export const webSocketManager = WebSocketManager.getInstance();

// Hook per essere notificati di specifici tipi di messaggi
export function useWebSocketMessage(messageType: string, callback: (message: WebSocketMessage) => void): () => void {
  const wrappedCallback = (message: WebSocketMessage) => {
    if (message.type === messageType) {
      callback(message);
    }
  };
  
  // Aggiungi il listener all'avvio
  webSocketManager.addMessageListener(wrappedCallback);
  
  // Ritorna una funzione di pulizia per rimuovere il listener
  return () => {
    webSocketManager.removeMessageListener(wrappedCallback);
  };
}