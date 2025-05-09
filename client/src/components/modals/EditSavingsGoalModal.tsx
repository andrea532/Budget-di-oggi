import { FC, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient, api } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parseCurrency, formatCurrency } from "@/lib/formatters";

interface EditSavingsGoalModalProps {
  open: boolean;
  onClose: () => void;
  goal: {
    id: number;
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string | null;
  } | null;
}

const formSchema = z.object({
  id: z.number(),
  name: z.string().min(1, { message: "Il nome è obbligatorio" }),
  targetAmount: z
    .string()
    .min(1, { message: "L'importo è obbligatorio" })
    .refine((val) => !isNaN(parseCurrency(val)), {
      message: "Inserisci un importo valido",
    }),
  currentAmount: z
    .string()
    .min(1, { message: "L'importo attuale è obbligatorio" })
    .refine((val) => !isNaN(parseCurrency(val)), {
      message: "Inserisci un importo valido",
    }),
  targetDate: z.string().nullable(),
});

const EditSavingsGoalModal: FC<EditSavingsGoalModalProps> = ({ open, onClose, goal }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: 0,
      name: "",
      targetAmount: "",
      currentAmount: "",
      targetDate: null,
    },
  });

  // Aggiorniamo il form quando cambia l'obiettivo
  useEffect(() => {
    if (goal && open) {
      form.reset({
        id: goal.id,
        name: goal.name,
        targetAmount: goal.targetAmount.toString(),
        currentAmount: goal.currentAmount.toString(),
        targetDate: goal.targetDate,
      });
    }
  }, [goal, open, form]);

  // Mutation per modificare un obiettivo di risparmio
  const updateGoalMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Convertiamo gli importi in numeri
      const targetAmount = parseCurrency(data.targetAmount);
      const currentAmount = parseCurrency(data.currentAmount);
      
      // Utilizziamo il PUT endpoint per modificare l'obiettivo (siccome non abbiamo api.patch)
      return api.put(`/api/savings-goals/${data.id}`, {
        name: data.name,
        targetAmount: targetAmount,
        currentAmount: currentAmount,
        targetDate: data.targetDate,
      });
    },
    onSuccess: () => {
      // Invalidiamo le queries per forzare il refresh dei dati
      queryClient.invalidateQueries({ queryKey: ["/api/savings-goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-budget"] });
      
      // Forziamo il refresh immediato
      queryClient.fetchQuery({ 
        queryKey: ["/api/savings-goals"],
      });
      queryClient.fetchQuery({ 
        queryKey: ["/api/daily-budget"],
      });
      
      toast({
        title: "Obiettivo aggiornato",
        description: "L'obiettivo di risparmio è stato aggiornato con successo.",
      });
      
      onClose();
    },
    onError: (error) => {
      console.error("Errore nell'aggiornamento dell'obiettivo:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare l'obiettivo. Riprova più tardi.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      await updateGoalMutation.mutateAsync(values);
    } catch (error) {
      console.error("Error updating savings goal:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica Obiettivo di Risparmio</DialogTitle>
          <DialogDescription>
            Modifica i dettagli del tuo obiettivo di risparmio.
          </DialogDescription>
        </DialogHeader>
        
        {goal && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Obiettivo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Es: Vacanza, Nuovo laptop, ecc."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="targetAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Importo Obiettivo</FormLabel>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="currentAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Importo Risparmiato</FormLabel>
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
                      Quanto hai già risparmiato per questo obiettivo
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {goal.targetDate && (
                <FormField
                  control={form.control}
                  name="targetDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Obiettivo</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          value={field.value || ''} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <div className="pt-2 flex justify-end space-x-2">
                <DialogClose asChild>
                  <Button variant="outline" type="button">
                    Annulla
                  </Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  className="gradient-purple text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Salvataggio..." : "Salva Modifiche"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditSavingsGoalModal;