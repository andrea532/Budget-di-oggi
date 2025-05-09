import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { dbStorage as storage } from "./dbStorage";
import passport from "passport";
import { isAuthenticated } from "./auth";
import bcrypt from "bcryptjs";
import { 
  insertUserSchema, 
  registerUserSchema,
  loginUserSchema,
  insertCategorySchema, 
  insertTransactionSchema, 
  insertBudgetSettingsSchema, 
  insertSavingsGoalSchema 
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Crea il server HTTP che gestirà sia Express che WebSocket
  const httpServer = createServer(app);
  
  // Inizializzazione del WebSocket server con un percorso specifico
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Gestione delle connessioni WebSocket
  const clients = new Set<WebSocket>();
  
  wss.on('connection', (ws) => {
    // Aggiungi il client alla lista
    clients.add(ws);
    
    // Invia un messaggio di conferma della connessione
    ws.send(JSON.stringify({
      type: 'connect',
      message: 'Connessione WebSocket stabilita'
    }));
    
    // Gestisci chiusura della connessione
    ws.on('close', () => {
      clients.delete(ws);
    });
    
    // Gestisci errori
    ws.on('error', (error) => {
      console.error('Errore WebSocket:', error);
      clients.delete(ws);
    });
  });
  
  // Funzione helper per inviare messaggi a tutti i client connessi
  const broadcastToAll = (message: any) => {
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  };
  
  const router = express.Router();

  // Middleware for demo user
  const getDemoUser = async (req: Request, res: Response, next: Function) => {
    try {
      // Look for a demo user or create one if it doesn't exist
      let user = await storage.getUserByUsername("demo");
      if (!user) {
        user = await storage.createUser({
          username: "demo",
          email: "demo@example.com",
          password: "password123",
          firstName: "Utente",
          lastName: "Demo"
        });
        
        // Initialize default categories for the new user
        await storage.initializeDefaultCategories(user.id);
        
        // Initialize default budget settings
        await storage.createOrUpdateBudgetSettings({
          userId: user.id,
          monthlyIncome: "3000",
          monthlyFixedExpenses: "1500"
        });
      }
      
      // Attach user to the request object
      req.body.userId = user.id;
      next();
    } catch (error) {
      console.error("Errore nell'inizializzazione dell'utente demo:", error);
      res.status(500).json({ message: "Errore nell'inizializzazione dell'utente demo." });
    }
  };

  // Apply demo user middleware to all routes
  router.use(getDemoUser);

  // Categories routes
  router.get("/categories", async (req: Request, res: Response) => {
    try {
      const userId = req.body.userId;
      const type = req.query.type as string | undefined; // Filtra per tipo di categoria
      
      const allCategories = await storage.getCategories(userId);
      
      // Se è specificato un tipo, filtra le categorie
      if (type && (type === 'income' || type === 'expense')) {
        const filteredCategories = allCategories.filter(category => category.type === type);
        res.json(filteredCategories);
      } else {
        res.json(allCategories);
      }
    } catch (error) {
      res.status(500).json({ message: "Errore nel recupero delle categorie." });
    }
  });

  router.post("/categories", async (req: Request, res: Response) => {
    try {
      const userId = req.body.userId;
      const validatedData = insertCategorySchema.parse({ ...req.body, userId });
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Errore nella creazione della categoria." });
      }
    }
  });

  // Transactions routes
  router.get("/transactions", async (req: Request, res: Response) => {
    try {
      const userId = req.body.userId;
      const transactions = await storage.getTransactions(userId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Errore nel recupero delle transazioni." });
    }
  });

  router.get("/transactions/dateRange", async (req: Request, res: Response) => {
    try {
      const userId = req.body.userId;
      const startDateStr = req.query.startDate as string;
      const endDateStr = req.query.endDate as string;
      
      if (!startDateStr || !endDateStr) {
        return res.status(400).json({ message: "Data di inizio e fine richieste." });
      }
      
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      
      const transactions = await storage.getTransactionsByDateRange(userId, startDate, endDate);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Errore nel recupero delle transazioni." });
    }
  });

  router.post("/transactions", async (req: Request, res: Response) => {
    try {
      const userId = req.body.userId;
      const validatedData = insertTransactionSchema.parse({ ...req.body, userId });
      const transaction = await storage.createTransaction(validatedData);
      
      // Invia una notifica WebSocket per la nuova transazione
      broadcastToAll({
        type: 'transaction-added',
        data: transaction
      });
      
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Errore nella creazione della transazione." });
      }
    }
  });

  // Aggiornamento di una transazione esistente
  router.patch("/transactions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID transazione non valido." });
      }
      
      // Verifica che la transazione appartenga all'utente
      const transaction = await storage.getTransactionById(id);
      if (!transaction) {
        return res.status(404).json({ message: "Transazione non trovata." });
      }
      
      if (transaction.userId !== req.body.userId) {
        return res.status(403).json({ message: "Non autorizzato a modificare questa transazione." });
      }
      
      // Rimuovi userId dal body per l'aggiornamento (useremo quello originale)
      const { userId, ...updateData } = req.body;
      
      // Aggiorna la transazione
      const updatedTransaction = await storage.updateTransaction(id, updateData);
      
      if (updatedTransaction) {
        // Invia una notifica WebSocket per la transazione aggiornata
        broadcastToAll({
          type: 'transaction-updated',
          data: updatedTransaction
        });
        
        res.status(200).json(updatedTransaction);
      } else {
        res.status(500).json({ message: "Errore nell'aggiornamento della transazione." });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Errore nell'aggiornamento della transazione." });
      }
    }
  });

  // Eliminazione di una transazione
  router.delete("/transactions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID transazione non valido." });
      }
      
      // Verify transaction belongs to user
      const transaction = await storage.getTransactionById(id);
      if (!transaction) {
        return res.status(404).json({ message: "Transazione non trovata." });
      }
      
      if (transaction.userId !== req.body.userId) {
        return res.status(403).json({ message: "Non autorizzato a eliminare questa transazione." });
      }
      
      const success = await storage.deleteTransaction(id);
      if (success) {
        // Invia una notifica WebSocket per la transazione eliminata
        broadcastToAll({
          type: 'transaction-deleted',
          data: { id }
        });
        
        res.status(200).json({ message: "Transazione eliminata con successo." });
      } else {
        res.status(500).json({ message: "Errore nell'eliminazione della transazione." });
      }
    } catch (error) {
      res.status(500).json({ message: "Errore nell'eliminazione della transazione." });
    }
  });

  // Budget settings routes
  router.get("/budget-settings", async (req: Request, res: Response) => {
    try {
      const userId = req.body.userId;
      const settings = await storage.getBudgetSettings(userId);
      if (!settings) {
        return res.status(404).json({ message: "Impostazioni di budget non trovate." });
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Errore nel recupero delle impostazioni di budget." });
    }
  });

  router.post("/budget-settings", async (req: Request, res: Response) => {
    try {
      const userId = req.body.userId;
      const validatedData = insertBudgetSettingsSchema.parse({ ...req.body, userId });
      const settings = await storage.createOrUpdateBudgetSettings(validatedData);
      
      // Invia notifica tramite WebSocket per aggiornare i client
      broadcastToAll({
        type: 'budget-settings-updated',
        data: settings
      });
      
      res.status(201).json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Errore nell'aggiornamento delle impostazioni di budget." });
      }
    }
  });

  // Savings goals routes
  router.get("/savings-goals", async (req: Request, res: Response) => {
    try {
      const userId = req.body.userId;
      const goals = await storage.getSavingsGoals(userId);
      res.json(goals);
    } catch (error) {
      res.status(500).json({ message: "Errore nel recupero degli obiettivi di risparmio." });
    }
  });

  router.post("/savings-goals", async (req: Request, res: Response) => {
    try {
      const userId = req.body.userId;
      const validatedData = insertSavingsGoalSchema.parse({ ...req.body, userId });
      
      // Crea l'obiettivo di risparmio
      let goal = await storage.createSavingsGoal(validatedData);
      
      // Se c'è una data target, calcola e aggiungi immediatamente l'importo giornaliero
      if (goal.targetDate) {
        const targetAmount = typeof goal.targetAmount === 'string' 
          ? parseFloat(goal.targetAmount) 
          : goal.targetAmount;
        
        const currentAmount = typeof goal.currentAmount === 'string' 
          ? parseFloat(goal.currentAmount) 
          : goal.currentAmount;
        
        const targetDate = new Date(goal.targetDate);
        const today = new Date();
        
        if (targetDate > today) {
          // Calcola i giorni fino alla scadenza
          const daysUntilTarget = Math.max(1, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
          
          // Calcola quanto deve ancora essere risparmiato
          const amountNeeded = targetAmount - currentAmount;
          
          if (amountNeeded > 0) {
            // Importo giornaliero da risparmiare
            const dailyAmount = amountNeeded / daysUntilTarget;
            
            // Aggiunge l'importo giornaliero di oggi all'obiettivo
            console.log(`Aggiunto automaticamente ${dailyAmount.toFixed(2)}€ all'obiettivo "${goal.name}" per il giorno corrente`);
            const updatedGoal = await storage.updateSavingsGoal(goal.id, dailyAmount);
            if (updatedGoal) {
              goal = updatedGoal;
            }
          }
        }
      }
      
      // Invia notifica tramite WebSocket a tutti i client connessi
      broadcastToAll({
        type: 'savings-goal-added',
        data: goal
      });
      
      res.status(201).json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Errore nella creazione dell'obiettivo di risparmio." });
      }
    }
  });

  router.patch("/savings-goals/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID obiettivo non valido." });
      }
      
      // Verificare che l'obiettivo esista
      const goal = await storage.getSavingsGoalById(id);
      if (!goal) {
        return res.status(404).json({ message: "Obiettivo di risparmio non trovato." });
      }
      
      // Verificare che l'obiettivo appartenga all'utente
      if (goal.userId !== req.body.userId) {
        return res.status(403).json({ message: "Non autorizzato a modificare questo obiettivo." });
      }
      
      // Se è presente solo amount, utilizziamo la funzione updateSavingsGoal esistente
      if (req.body.amount !== undefined && Object.keys(req.body).length === 2) { // userId + amount
        const amount = req.body.amount;
        if (isNaN(parseFloat(amount.toString()))) {
          return res.status(400).json({ message: "Importo non valido." });
        }
        
        const updatedGoal = await storage.updateSavingsGoal(id, amount);
        if (updatedGoal) {
          return res.json(updatedGoal);
        } else {
          return res.status(500).json({ message: "Errore nell'aggiornamento dell'obiettivo di risparmio." });
        }
      } 
      // Altrimenti, facciamo un aggiornamento completo dell'obiettivo
      else {
        // Estraiamo i dati dalla richiesta
        const { name, targetAmount, currentAmount, targetDate } = req.body;
        
        // Verifichiamo che i campi obbligatori siano presenti
        if (!name || targetAmount === undefined) {
          return res.status(400).json({ message: "Nome e importo obiettivo sono obbligatori." });
        }
        
        // Convertiamo gli importi in numeri se sono stringhe
        const parsedTargetAmount = typeof targetAmount === 'string' 
          ? parseFloat(targetAmount) 
          : targetAmount;
          
        const parsedCurrentAmount = typeof currentAmount === 'string' 
          ? parseFloat(currentAmount) 
          : (currentAmount !== undefined ? currentAmount : goal.currentAmount);
        
        // Creiamo un nuovo obiettivo con gli stessi dati ma aggiornati
        const updatedGoalData = {
          id: goal.id,
          userId: goal.userId,
          name: name || goal.name,
          targetAmount: parsedTargetAmount,
          currentAmount: parsedCurrentAmount,
          targetDate: targetDate !== undefined ? targetDate : goal.targetDate
        };
        
        // Eliminiamo e ricreiamo l'obiettivo (simuliamo un update completo)
        await storage.deleteSavingsGoal(id);
        const newGoal = await storage.createSavingsGoal(updatedGoalData);
        
        // Invia notifica tramite WebSocket per aggiornare i client
        broadcastToAll({
          type: 'savings-goal-updated',
          data: newGoal
        });
        
        res.json(newGoal);
      }
    } catch (error) {
      console.error("Errore nell'aggiornamento dell'obiettivo:", error);
      res.status(500).json({ message: "Errore nell'aggiornamento dell'obiettivo di risparmio." });
    }
  });

  router.delete("/savings-goals/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID obiettivo non valido." });
      }
      
      // Utilizziamo direttamente l'ID utente dal middleware
      const userId = req.body.userId;
      if (!userId) {
        return res.status(401).json({ message: "Utente non autenticato." });
      }
      
      // Verify goal exists
      const goal = await storage.getSavingsGoalById(id);
      if (!goal) {
        return res.status(404).json({ message: "Obiettivo di risparmio non trovato." });
      }
      
      // Verifica che l'obiettivo appartenga all'utente
      if (goal.userId !== userId) {
        return res.status(403).json({ message: "Non autorizzato a eliminare questo obiettivo." });
      }
      
      const success = await storage.deleteSavingsGoal(id);
      if (success) {
        // Invia notifica tramite WebSocket dell'eliminazione dell'obiettivo
        broadcastToAll({
          type: 'savings-goal-deleted',
          data: { id }
        });
        
        res.status(200).json({ message: "Obiettivo di risparmio eliminato con successo." });
      } else {
        res.status(500).json({ message: "Errore nell'eliminazione dell'obiettivo di risparmio." });
      }
    } catch (error) {
      console.error("Errore nell'eliminazione dell'obiettivo di risparmio:", error);
      res.status(500).json({ message: "Errore nell'eliminazione dell'obiettivo di risparmio." });
    }
  });

  // Calculate daily budget
  router.get("/daily-budget", async (req: Request, res: Response) => {
    try {
      const userId = req.body.userId;
      
      // Get budget settings
      const settings = await storage.getBudgetSettings(userId);
      if (!settings) {
        return res.status(404).json({ message: "Impostazioni di budget non trovate." });
      }
      
      // Se ci sono date di budget personalizzate, utilizziamole
      const now = new Date();
      let startDate: Date, endDate: Date;
      let daysInBudgetPeriod: number, daysElapsed: number;
      
      if (settings.budgetStartDate && settings.budgetEndDate) {
        // Usa le date personalizzate
        startDate = new Date(settings.budgetStartDate);
        endDate = new Date(settings.budgetEndDate);
        
        // Calcola i giorni nel periodo di budget e i giorni trascorsi
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const daysPassed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        daysInBudgetPeriod = totalDays;
        daysElapsed = Math.max(0, Math.min(daysPassed, totalDays));
      } else {
        // Usa il mese corrente come fallback
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentDay = now.getDate();
        
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        daysInBudgetPeriod = daysInMonth;
        daysElapsed = currentDay - 1; // Giorni completamente trascorsi
      }
      
      // Ottieni le transazioni per il periodo di budget
      const transactions = await storage.getTransactionsByDateRange(userId, startDate, endDate);
      
      // Calculate total spent so far this month
      const totalSpent = transactions
        .filter(t => t.type === "expense")
        .reduce((sum, transaction) => {
          const amount = typeof transaction.amount === 'string' 
            ? parseFloat(transaction.amount) 
            : transaction.amount;
          return sum + amount;
        }, 0);
      
      // Calculate today's expenses
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todaysTransactions = await storage.getTransactionsByDateRange(userId, today, tomorrow);
      const todaysExpenses = todaysTransactions
        .filter(t => t.type === "expense")
        .reduce((sum, transaction) => {
          const amount = typeof transaction.amount === 'string' 
            ? parseFloat(transaction.amount) 
            : transaction.amount;
          return sum + amount;
        }, 0);
      
      // Get active savings goals - tutti gli obiettivi sono considerati attivi fino a quando non vengono eliminati
      const savingsGoals = await storage.getSavingsGoals(userId);
      // Non filtrare per isActive perché non abbiamo questa proprietà nel nostro schema
      const activeSavingsGoals = savingsGoals;
      
      // Calculate monthly savings target
      let monthlySavingsTarget = 0;
      
      for (const goal of activeSavingsGoals) {
        const targetAmount = typeof goal.targetAmount === 'string' 
          ? parseFloat(goal.targetAmount) 
          : goal.targetAmount;
        
        const currentAmount = typeof goal.currentAmount === 'string' 
          ? parseFloat(goal.currentAmount) 
          : goal.currentAmount;
        
        // If there's a target date, calculate how much needs to be saved per month
        if (goal.targetDate) {
          const targetDate = new Date(goal.targetDate);
          const today = new Date();
          
          // Skip if target date is in the past
          if (targetDate <= today) continue;
          
          // Calcola i giorni esatti fino alla data target per un calcolo più preciso
          const daysUntilTarget = Math.max(1, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
          
          // Converti in mesi per un importo mensile più intuitivo (usando 30.44 giorni/mese)
          const monthsToSave = Math.max(0.5, daysUntilTarget / 30.44); // minimo mezzo mese
          
          // Calcola quanto deve ancora essere risparmiato
          const amountNeeded = targetAmount - currentAmount;
          
          // Calcola quanto risparmiare ogni mese per raggiungere l'obiettivo entro la data target
          if (amountNeeded > 0) {
            const monthlyAmount = amountNeeded / monthsToSave;
            monthlySavingsTarget += monthlyAmount;
            console.log(`Obiettivo: ${goal.name}, Importo: ${targetAmount}, Da risparmiare: ${amountNeeded}, Giorni: ${daysUntilTarget}, Mesi: ${monthsToSave.toFixed(1)}, Risparmio mensile: ${monthlyAmount.toFixed(2)}€`);
          }
        } else {
          // For goals with no target date, set aside a small percentage of discretionary income
          // (e.g., 5% of income after fixed expenses for each goal without a deadline)
          const monthlyIncome = typeof settings.monthlyIncome === 'string' 
            ? parseFloat(settings.monthlyIncome) 
            : settings.monthlyIncome;
          
          const monthlyFixedExpenses = typeof settings.monthlyFixedExpenses === 'string' 
            ? parseFloat(settings.monthlyFixedExpenses) 
            : settings.monthlyFixedExpenses;
          
          const baseDiscretionaryIncome = monthlyIncome - monthlyFixedExpenses;
          const savingRate = 0.05; // 5% per goal without a deadline
          
          // Calculate amount still needed to save to reach the target
          const amountNeeded = targetAmount - currentAmount;
          
          if (amountNeeded > 0) {
            monthlySavingsTarget += Math.min(amountNeeded, baseDiscretionaryIncome * savingRate);
          }
        }
      }
      
      // Calculate daily budget
      const monthlyIncome = typeof settings.monthlyIncome === 'string' 
        ? parseFloat(settings.monthlyIncome) 
        : settings.monthlyIncome;
      
      const monthlyFixedExpenses = typeof settings.monthlyFixedExpenses === 'string' 
        ? parseFloat(settings.monthlyFixedExpenses) 
        : settings.monthlyFixedExpenses;
      
      // Il reddito discrezionale è il reddito meno le spese fisse
      const discretionaryIncome = monthlyIncome - monthlyFixedExpenses;
      
      // Calcola i giorni rimanenti nel periodo di budget
      let remainingDays;
      
      if (settings.budgetStartDate && settings.budgetEndDate) {
        // Se stiamo usando date personalizzate
        const endDateObj = new Date(settings.budgetEndDate);
        const todayObj = new Date();
        todayObj.setHours(0, 0, 0, 0);
        
        // Se la data di fine è già passata
        if (endDateObj < todayObj) {
          remainingDays = 1; // Assegna un giorno minimo per evitare divisione per zero
        } else {
          // Calcola i giorni da oggi alla fine del periodo
          remainingDays = Math.ceil((endDateObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24)) + 1; // Includi oggi
        }
      } else {
        // Fallback al calcolo mensile
        remainingDays = daysInBudgetPeriod - daysElapsed;
        
        // Assicurati che ci sia almeno un giorno rimanente
        remainingDays = Math.max(1, remainingDays);
      }
      
      // Converti l'obiettivo di risparmio mensile in giornaliero senza limiti
      const adjustedDailySavings = monthlySavingsTarget / 30.44;
      console.log(`Obiettivo di risparmio: ${monthlySavingsTarget.toFixed(2)}€/mese = ${adjustedDailySavings.toFixed(2)}€/giorno (nessun limite applicato)`);
      
      // Per il saldo mensile disponibile, consideriamo solo le spese e il risparmio di oggi
      // Questo è il calcolo corretto: Budget mensile totale - Spese finora - Risparmio di oggi
      const remainingDiscretionaryIncome = discretionaryIncome - totalSpent - adjustedDailySavings;
      
      // Log del calcolo del saldo mensile
      console.log(`Nuovo calcolo saldo mensile: Base ${discretionaryIncome.toFixed(2)}€, Spese ${totalSpent.toFixed(2)}€, Risparmio oggi ${adjustedDailySavings.toFixed(2)}€, Finale ${remainingDiscretionaryIncome.toFixed(2)}€`);
      
      // Calcola il budget giornaliero (reddito discrezionale totale diviso per i giorni totali nel periodo)
      // Usa i giorni totali nel periodo, non i giorni rimanenti
      const totalDaysInPeriod = daysInBudgetPeriod;
      
      // Budget di base per ogni giorno (reddito discrezionale diviso per i giorni totali)
      const dailyBudgetBase = discretionaryIncome / totalDaysInPeriod;
      console.log(`Obiettivo di risparmio: ${monthlySavingsTarget.toFixed(2)}€/mese = ${adjustedDailySavings.toFixed(2)}€/giorno (nessun limite applicato)`);
      
      // Budget giornaliero disponibile dopo aver sottratto il risparmio giornaliero
      // Questo è il budget fisso giornaliero che non cambia in base alle spese precedenti
      const dailySpendingBudget = dailyBudgetBase - adjustedDailySavings;
      
      console.log(`Budget giornaliero: Base ${dailyBudgetBase.toFixed(2)}, Risparmio ${adjustedDailySavings.toFixed(2)}, Finale ${dailySpendingBudget.toFixed(2)}`);
      
      // Quanto rimane oggi dopo le spese di oggi
      // Questo è ciò che viene visualizzato come "Budget Giornaliero" nell'interfaccia
      const remainingToday = dailySpendingBudget - todaysExpenses;
      
      res.json({
        dailyBudget: dailySpendingBudget, // Budget giornaliero fisso che include già la sottrazione del risparmio
        dailyBudgetRemaining: remainingToday, // Quanto resta oggi del budget giornaliero dopo le spese
        fullDailyBudget: dailyBudgetBase, // Budget giornaliero totale prima della sottrazione del risparmio
        dailySavingsTarget: adjustedDailySavings, // Quanto risparmiare ogni giorno (valore aggiustato per non superare il 50%)
        monthlySavingsTarget,             // Obiettivo mensile di risparmio
        todaysExpenses,                   // Quanto speso oggi
        remainingToday,                   // Alias per dailyBudgetRemaining per compatibilità
        spentThisMonth: totalSpent,       // Quanto speso nel mese
        totalBudget: discretionaryIncome, // Budget totale mensile
        remainingThisMonth: remainingDiscretionaryIncome, // Quanto resta del budget mensile (budget - spese - risparmio di oggi)
        daysLeft: remainingDays           // Giorni rimanenti nel periodo di budget
      });
    } catch (error) {
      res.status(500).json({ message: "Errore nel calcolo del budget giornaliero." });
    }
  });

  // Aggiungiamo le route di autenticazione
  const authRouter = express.Router();

  // Registrazione utente
  authRouter.post("/register", async (req: Request, res: Response) => {
    try {
      // Validazione dati
      const validatedData = registerUserSchema.parse(req.body);
      
      // Verifica se l'utente esiste già
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Nome utente già in uso." });
      }
      
      // Hash della password prima della creazione
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      // Crea il nuovo utente con password sottoposta a hash
      const newUser = await storage.createUser({
        ...validatedData,
        password: hashedPassword
      });
      
      // Inizializza categorie predefinite per il nuovo utente
      await storage.initializeDefaultCategories(newUser.id);
      
      // Crea impostazioni di budget di default
      await storage.createOrUpdateBudgetSettings({
        userId: newUser.id,
        monthlyIncome: "3000",
        monthlyFixedExpenses: "1500"
      });
      
      // Rimuovi la password dai dati utente per la risposta
      const { password, ...userForResponse } = newUser;
      
      // Autenticazione automatica dopo la registrazione
      req.login(userForResponse, (err) => {
        if (err) {
          console.error("Errore login automatico:", err);
          return res.status(500).json({ message: "Errore durante l'autenticazione." });
        }
        
        console.log("Login automatico avvenuto con successo, utente:", userForResponse.username);
        return res.status(201).json(userForResponse);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error('Errore nella registrazione:', error);
        res.status(500).json({ message: "Errore durante la registrazione." });
      }
    }
  });
  
  // Login utente
  authRouter.post("/login", passport.authenticate('local', { failWithError: true }), 
    (req: Request, res: Response) => {
      // Se arriviamo qui, l'autenticazione è riuscita
      res.json(req.user);
    },
    (error: any, req: Request, res: Response) => {
      // Se arriviamo qui, l'autenticazione è fallita
      res.status(401).json({ message: error.message || "Autenticazione fallita" });
    }
  );
  
  // Logout utente
  authRouter.post("/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Errore durante il logout." });
      }
      res.json({ message: "Logout effettuato con successo." });
    });
  });
  
  // Informazioni utente corrente
  authRouter.get("/me", isAuthenticated, (req: Request, res: Response) => {
    res.json(req.user);
  });
  
  // Aggiungiamo il middleware di autenticazione alle API esistenti
  // Per ora manteniamo il middleware getDemoUser per retrocompatibilità,
  // ma in un'implementazione reale useremmo il middleware di autenticazione 
  // per tutte le route protette
  
  // Apply routers to our Express app
  app.use("/api/auth", authRouter); // Route di autenticazione
  app.use("/api", router);          // Route principali dell'API 

  // Return the HTTP server creato all'inizio della funzione
  return httpServer;
}
