import { useState, useEffect, FC } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { parseCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  type: "income" | "expense";
}

interface Transaction {
  id: number;
  date: string;
  amount: number;
  description?: string;
  categoryId?: number | null;
  type: "income" | "expense";
}

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

// Schema di validazione con zod
const formSchema = z.object({
  date: z.date({
    required_error: "La data è obbligatoria",
  }),
  amount: z.string().refine((val) => {
    const num = parseCurrency(val);
    return !isNaN(num) && num > 0;
  }, { message: "Inserisci un importo valido maggiore di zero" }),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(["income", "expense"]),
});

export const EditTransactionModal: FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: transaction ? new Date(transaction.date) : new Date(),
      amount: transaction ? transaction.amount.toString() : "",
      description: transaction?.description || "",
      categoryId: transaction?.categoryId ? transaction.categoryId.toString() : "",
      type: transaction?.type || "expense",
    },
  });

  // Aggiorna il form quando cambia la transazione selezionata
  useEffect(() => {
    if (transaction) {
      form.reset({
        date: new Date(transaction.date),
        amount: transaction.amount.toString(),
        description: transaction.description || "",
        categoryId: transaction.categoryId ? transaction.categoryId.toString() : "",
        type: transaction.type,
      });
    }
  }, [transaction, form]);

  // Query per le categorie
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Filtra le categorie in base al tipo selezionato
  const filteredCategories = categories?.filter(
    (category) => category.type === form.watch("type")
  );

  // Mutation per aggiornare la transazione
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!transaction) return null;
      return apiRequest<any>(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-budget"] });
      toast({
        title: "Transazione aggiornata",
        description: "La transazione è stata aggiornata con successo",
      });
      onClose();
    },
    onError: (error) => {
      console.error("Errore nell'aggiornamento della transazione:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento della transazione",
        variant: "destructive",
      });
    },
  });

  // Mutation per eliminare la transazione
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!transaction) return null;
      return apiRequest<any>(`/api/transactions/${transaction.id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-budget"] });
      toast({
        title: "Transazione eliminata",
        description: "La transazione è stata eliminata con successo",
      });
      onClose();
    },
    onError: (error) => {
      console.error("Errore nell'eliminazione della transazione:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione della transazione",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const formattedData = {
      ...values,
      amount: parseCurrency(values.amount.toString()),
      date: format(values.date, "yyyy-MM-dd"),
    };
    
    updateMutation.mutate(formattedData);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifica Transazione</DialogTitle>
          <DialogDescription>
            Modifica i dettagli della transazione selezionata.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo transazione */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select
                    onValueChange={(value: "income" | "expense") => {
                      field.onChange(value);
                      // Reset della categoria quando cambia il tipo
                      form.setValue("categoryId", "");
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona il tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="expense">Spesa</SelectItem>
                      <SelectItem value="income">Entrata</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Data */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data</FormLabel>
                  <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: it })
                          ) : (
                            <span>Seleziona una data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setShowCalendar(false);
                        }}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Importo */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Importo (€)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0.00"
                      {...field}
                      type="text"
                      inputMode="decimal"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descrizione */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Descrizione (opzionale)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Categoria */}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona una categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredCategories?.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex justify-between pt-4">
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Eliminazione..." : "Elimina"}
              </Button>
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Salvataggio..." : "Salva modifiche"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTransactionModal;