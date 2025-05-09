import { FC, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useBudget } from "@/contexts/BudgetContext";
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
import { Checkbox } from "@/components/ui/checkbox";
import { parseCurrency } from "@/lib/formatters";

interface AddSavingsGoalModalProps {
  open: boolean;
  onClose: () => void;
}

const formSchema = z.object({
  name: z.string().min(1, { message: "Il nome è obbligatorio" }),
  targetAmount: z
    .string()
    .min(1, { message: "L'importo è obbligatorio" })
    .refine((val) => !isNaN(parseCurrency(val)), {
      message: "Inserisci un importo valido",
    }),
  hasDeadline: z.boolean().default(false),
  targetDate: z.string().optional(),
  initialAmount: z
    .string()
    .optional()
    .transform(val => val === "" ? "0" : val)
    .refine((val) => !isNaN(parseCurrency(val || "0")), {
      message: "Inserisci un importo valido",
    }),
});

const AddSavingsGoalModal: FC<AddSavingsGoalModalProps> = ({ open, onClose }) => {
  const { addSavingsGoal } = useBudget();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      targetAmount: "",
      hasDeadline: false,
      targetDate: "",
      initialAmount: "0",
    },
  });

  const hasDeadline = form.watch("hasDeadline");

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        targetAmount: "",
        hasDeadline: false,
        targetDate: "",
        initialAmount: "0",
      });
    }
  }, [open, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      
      // Parse the amounts and convert them to numbers
      const targetAmountNumeric = parseCurrency(values.targetAmount);
      const initialAmountNumeric = parseCurrency(values.initialAmount || "0");
      
      await addSavingsGoal({
        name: values.name,
        targetAmount: targetAmountNumeric,
        targetDate: values.hasDeadline ? values.targetDate : undefined,
        currentAmount: initialAmountNumeric,
      });
      
      onClose();
    } catch (error) {
      console.error("Error adding savings goal:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuovo Obiettivo di Risparmio</DialogTitle>
          <DialogDescription>
            Crea un nuovo obiettivo per risparmiare denaro per qualcosa di importante.
          </DialogDescription>
        </DialogHeader>
        
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
              name="initialAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Importo Iniziale (opzionale)</FormLabel>
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
                    Se hai già risparmiato qualcosa per questo obiettivo
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="hasDeadline"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Ha una data di scadenza
                    </FormLabel>
                    <FormDescription>
                      Seleziona questa opzione se vuoi raggiungere l'obiettivo entro una data specifica
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            {hasDeadline && (
              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Obiettivo</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                {isSubmitting ? "Salvataggio..." : "Crea Obiettivo"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddSavingsGoalModal;
