import { FC, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useBudget } from "@/contexts/BudgetContext";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Definizione del tipo Category
interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  type: string;
}
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
import { Button } from "@/components/ui/button";
import { parseCurrency } from "@/lib/formatters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddIncomeModalProps {
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
  date: z.string().min(1, { message: "La data è obbligatoria" }),
  description: z.string().min(1, { message: "La descrizione è obbligatoria" }),
  categoryId: z.string().optional(),
});

const AddIncomeModal: FC<AddIncomeModalProps> = ({ open, onClose }) => {
  const { addTransaction } = useBudget();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carica le categorie di tipo "income"
  const { data: categories = [] as Category[] } = useQuery<Category[]>({
    queryKey: ["/api/categories", "income"],
    queryFn: async () => {
      const response = await fetch(`/api/categories?type=income`, {
        credentials: "include",
      });
      return await response.json() as Category[];
    },
    enabled: open,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      categoryId: "",
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.reset({
        amount: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
        categoryId: "",
      });
    }
  }, [open, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      
      // Parse the amount and convert it to a number
      const numericAmount = parseCurrency(values.amount);
      
      // Converti categoryId in numero se presente
      const categoryId = values.categoryId ? parseInt(values.categoryId) : null;
      
      await addTransaction({
        amount: numericAmount,
        categoryId,
        date: values.date,
        description: values.description,
        type: "income",
      });
      
      onClose();
    } catch (error) {
      console.error("Error adding income:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aggiungi Entrata</DialogTitle>
          <DialogDescription>
            Registra un nuovo reddito o entrata nel tuo budget.
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Es: Stipendio, Rimborso, ecc."
                      {...field}
                    />
                  </FormControl>
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
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <FormControl>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((category: Category) => (
                          <SelectItem 
                            key={category.id} 
                            value={category.id.toString()}
                          >
                            <div className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: category.color }}
                              />
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                {isSubmitting ? "Salvataggio..." : "Salva Entrata"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddIncomeModal;
