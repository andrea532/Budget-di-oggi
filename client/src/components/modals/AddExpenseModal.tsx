import { FC, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useBudget } from "@/contexts/BudgetContext";
import { useQuery } from "@tanstack/react-query";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { parseCurrency } from "@/lib/formatters";

interface AddExpenseModalProps {
  open: boolean;
  onClose: () => void;
}

const formSchema = z.object({
  amount: z
    .string()
    .min(1, { message: "L'importo è obbligatorio" })
    .refine((val) => !isNaN(parseCurrency(val)), {
      message: "Inserisci un importo valido",
    }),
  categoryId: z.string().optional(),
  date: z.string().min(1, { message: "La data è obbligatoria" }),
  description: z.string().optional(),
});

const AddExpenseModal: FC<AddExpenseModalProps> = ({ open, onClose }) => {
  const { addTransaction } = useBudget();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    enabled: open,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: "",
      categoryId: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.reset({
        amount: "",
        categoryId: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
      });
    }
  }, [open, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      
      // Parse the amount and convert it to a number
      const numericAmount = parseCurrency(values.amount);
      
      // Parse category ID to number or null
      const categoryId = values.categoryId ? parseInt(values.categoryId) : null;
      
      await addTransaction({
        amount: numericAmount,
        categoryId,
        date: values.date,
        description: values.description || "",
        type: "expense",
      });
      
      onClose();
    } catch (error) {
      console.error("Error adding expense:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aggiungi Spesa</DialogTitle>
          <DialogDescription>
            Registra una nuova spesa nel tuo budget.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Importo</FormLabel>
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
                      {categories?.map((category) => (
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
            
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (opzionale)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Descrizione della spesa..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="pt-2 flex justify-end space-x-2">
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Annulla
                </Button>
              </DialogClose>
              <Button 
                type="submit" 
                className="gradient-teal text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Salvataggio..." : "Salva Spesa"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddExpenseModal;
