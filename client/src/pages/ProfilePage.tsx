import { FC, useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useBudget } from "@/contexts/BudgetContext";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import BottomNavigation from "@/components/layout/BottomNavigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { parseCurrency, formatDate, formatCurrency } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { it } from 'date-fns/locale';

const formSchema = z.object({
  monthlyIncome: z
    .string()
    .min(1, { message: "Il reddito mensile è obbligatorio" })
    .refine((val) => !isNaN(parseCurrency(val)), {
      message: "Inserisci un importo valido",
    }),
  monthlyFixedExpenses: z
    .string()
    .min(1, { message: "Le spese fisse sono obbligatorie" })
    .refine((val) => !isNaN(parseCurrency(val)), {
      message: "Inserisci un importo valido",
    }),
  budgetStartDate: z.date().nullable().optional(),
  budgetEndDate: z.date().nullable().optional()
    .superRefine((date, ctx) => {
      if (!date) return;
      
      // Accede al valore della data di inizio dai dati del form
      const formData = ctx.path.length > 0 ? (ctx as any).data : null;
      const startDate = formData?.budgetStartDate;
      
      // Verifica che la data di fine sia successiva alla data di inizio
      if (startDate && date < startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La data di fine deve essere successiva alla data di inizio",
        });
      }
    }),
});

const ProfilePage: FC = () => {
  const bottomNavRef = useRef<HTMLDivElement>(null);
  const { updateBudgetSettings } = useBudget();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  
  const { data: budgetSettings, isLoading } = useQuery({
    queryKey: ["/api/budget-settings"],
  });
  
  // Funzione per esportare le transazioni in CSV
  const exportTransactions = async () => {
    try {
      setIsExporting(true);
      
      // Recupera tutte le transazioni
      const response = await fetch("/api/transactions");
      if (!response.ok) {
        throw new Error("Errore nel recupero delle transazioni");
      }
      const transactions = await response.json();
      
      if (!transactions || transactions.length === 0) {
        toast({
          title: "Nessuna transazione",
          description: "Non ci sono transazioni da esportare.",
        });
        setIsExporting(false);
        return;
      }
      
      // Crea l'intestazione del CSV
      let csv = "Data,Tipo,Descrizione,Importo\n";
      
      // Aggiunge ogni transazione al CSV
      transactions.forEach((transaction: any) => {
        const date = formatDate(new Date(transaction.date));
        const type = transaction.type === "income" ? "Entrata" : "Uscita";
        const description = transaction.description || "";
        const amount = formatCurrency(parseFloat(transaction.amount));
        
        csv += `${date},${type},${description},${amount}\n`;
      });
      
      // Crea un link per il download
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `transazioni_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Esportazione completata",
        description: "Le transazioni sono state esportate con successo.",
      });
    } catch (error) {
      console.error("Errore nell'esportazione delle transazioni:", error);
      toast({
        title: "Errore",
        description: "Impossibile esportare le transazioni. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // Funzione per esportare gli obiettivi di risparmio in CSV
  const exportSavingsGoals = async () => {
    try {
      setIsExporting(true);
      
      // Recupera tutti gli obiettivi di risparmio
      const response = await fetch("/api/savings-goals");
      if (!response.ok) {
        throw new Error("Errore nel recupero degli obiettivi di risparmio");
      }
      const savingsGoals = await response.json();
      
      if (!savingsGoals || savingsGoals.length === 0) {
        toast({
          title: "Nessun obiettivo",
          description: "Non ci sono obiettivi di risparmio da esportare.",
        });
        setIsExporting(false);
        return;
      }
      
      // Crea l'intestazione del CSV
      let csv = "Nome,Importo Target,Importo Attuale,Data Target,Stato\n";
      
      // Aggiunge ogni obiettivo al CSV
      savingsGoals.forEach((goal: any) => {
        const name = goal.name;
        const targetAmount = formatCurrency(parseFloat(goal.targetAmount));
        const currentAmount = formatCurrency(parseFloat(goal.currentAmount));
        const targetDate = goal.targetDate ? formatDate(new Date(goal.targetDate)) : "Nessuna";
        const status = goal.isActive ? "Attivo" : "Completato";
        
        csv += `${name},${targetAmount},${currentAmount},${targetDate},${status}\n`;
      });
      
      // Crea un link per il download
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `obiettivi_risparmio_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Esportazione completata",
        description: "Gli obiettivi di risparmio sono stati esportati con successo.",
      });
    } catch (error) {
      console.error("Errore nell'esportazione degli obiettivi di risparmio:", error);
      toast({
        title: "Errore",
        description: "Impossibile esportare gli obiettivi di risparmio. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      monthlyIncome: "",
      monthlyFixedExpenses: "",
      budgetStartDate: null,
      budgetEndDate: null,
    },
  });
  
  // Update form when budget settings are loaded
  useEffect(() => {
    if (budgetSettings) {
      form.reset({
        monthlyIncome: String(budgetSettings.monthlyIncome),
        monthlyFixedExpenses: String(budgetSettings.monthlyFixedExpenses),
        budgetStartDate: budgetSettings.budgetStartDate ? new Date(budgetSettings.budgetStartDate) : null,
        budgetEndDate: budgetSettings.budgetEndDate ? new Date(budgetSettings.budgetEndDate) : null,
      });
    }
  }, [budgetSettings, form]);
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      
      await updateBudgetSettings({
        monthlyIncome: parseCurrency(values.monthlyIncome),
        monthlyFixedExpenses: parseCurrency(values.monthlyFixedExpenses),
        budgetStartDate: values.budgetStartDate,
        budgetEndDate: values.budgetEndDate,
      });
      
      toast({
        title: "Impostazioni salvate",
        description: values.budgetStartDate && values.budgetEndDate 
          ? "Budget impostato per il periodo personalizzato" 
          : "Budget impostato sul mese corrente",
      });
    } catch (error) {
      console.error("Error updating budget settings:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare le impostazioni. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header title="Profilo" />
      
      <main className="pb-20">
        <div className="p-4">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Impostazioni Budget</CardTitle>
              <CardDescription>
                Aggiorna il tuo reddito e le spese fisse per calcolare il budget giornaliero
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="monthlyIncome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reddito Mensile</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                              €
                            </span>
                            <Input
                              placeholder="0,00"
                              className="pl-8"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Il tuo reddito totale mensile dopo le tasse
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="monthlyFixedExpenses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Spese Fisse Mensili</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                              €
                            </span>
                            <Input
                              placeholder="0,00"
                              className="pl-8"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Somma delle tue spese fisse come affitto, mutuo, bollette, ecc.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-4">
                    <h3 className="text-md font-medium">Periodo di Budget</h3>
                    <p className="text-sm text-muted-foreground">
                      Imposta un periodo personalizzato per il calcolo del budget giornaliero. Se lasci vuoto, verrà utilizzato il mese corrente.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="budgetStartDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Data Inizio</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP", { locale: it })
                                    ) : (
                                      <span>Seleziona data</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value || undefined}
                                  onSelect={field.onChange}
                                  disabled={(date) => date < new Date("1900-01-01")}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="budgetEndDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Data Fine</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP", { locale: it })
                                    ) : (
                                      <span>Seleziona data</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value || undefined}
                                  onSelect={field.onChange}
                                  disabled={(date) => {
                                    // Converti esplicitamente il risultato in un boolean
                                    const startDate = form.getValues("budgetStartDate");
                                    const isBeforeStartDate = startDate && date < startDate;
                                    const isTooOld = date < new Date("1900-01-01");
                                    return Boolean(isTooOld || isBeforeStartDate);
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full gradient-teal text-white"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Salvataggio..." : "Salva Impostazioni"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Esporta Dati</CardTitle>
              <CardDescription>
                Esporta i tuoi dati in formato CSV
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={exportTransactions}
                  disabled={isExporting}
                >
                  {isExporting ? "Esportazione..." : "Esporta Transazioni"}
                </Button>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={exportSavingsGoals}
                  disabled={isExporting}
                >
                  {isExporting ? "Esportazione..." : "Esporta Obiettivi di Risparmio"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <BottomNavigation ref={bottomNavRef} />
    </>
  );
};

export default ProfilePage;
