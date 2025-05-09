import { FC, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import Header from "@/components/layout/Header";
import BottomNavigation from "@/components/layout/BottomNavigation";
import { formatCurrency } from "@/lib/formatters";

interface Transaction {
  id: number;
  amount: number;
  type: "income" | "expense";
  date: string;
  categoryId?: number | null;
  description?: string;
}

interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  type: string;
}

interface CategorySpendingData {
  name: string;
  value: number;
  color: string;
}

interface MonthlySpendingData {
  month: string;
  amount: number;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#FF6B6B", "#6A7FDB", "#41B3A3"];
const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

const StatisticsPage: FC = () => {
  const [activeTab, setActiveTab] = useState("categories");
  
  // Carica le transazioni
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });
  
  // Carica le categorie
  const { data: categories, isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  const isLoading = isLoadingTransactions || isLoadingCategories;
  
  // Aggregazione dei dati per categoria
  const [categorySpending, setCategorySpending] = useState<CategorySpendingData[]>([]);
  // Aggregazione dei dati mensili
  const [monthlySpending, setMonthlySpending] = useState<MonthlySpendingData[]>([]);
  // Statistiche generali
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [avgExpenseAmount, setAvgExpenseAmount] = useState(0);
  const [topCategory, setTopCategory] = useState<{ name: string; amount: number } | null>(null);
  
  // Calcola le statistiche quando i dati sono disponibili
  useEffect(() => {
    if (!transactions || !categories) return;
    
    // Filtra solo le spese
    const expenses = transactions.filter(t => t.type === "expense");
    const incomes = transactions.filter(t => t.type === "income");
    
    // Calcola statistiche generali
    const totalExp = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalInc = incomes.reduce((sum, t) => sum + Number(t.amount), 0);
    
    setTotalExpenses(totalExp);
    setTotalIncome(totalInc);
    
    if (expenses.length > 0) {
      setAvgExpenseAmount(totalExp / expenses.length);
    }
    
    // Raggruppa per categoria
    const categoryMap = new Map<number, { name: string; value: number; color: string }>();
    // Aggiungiamo una categoria "Non specificata" per le spese senza categoria
    let nonSpecifiedAmount = 0;
    
    expenses.forEach(expense => {
      if (!expense.categoryId) {
        // Accumula spese senza categoria
        nonSpecifiedAmount += Number(expense.amount);
        return;
      }
      
      const category = categories.find(c => c.id === expense.categoryId);
      if (!category) return;
      
      const currentAmount = categoryMap.get(category.id)?.value || 0;
      categoryMap.set(category.id, {
        name: category.name,
        value: currentAmount + Number(expense.amount),
        color: category.color
      });
    });
    
    // Aggiungi la categoria "Non specificata" se ci sono spese senza categoria
    if (nonSpecifiedAmount > 0) {
      categoryMap.set(-1, {
        name: "Non specificata",
        value: nonSpecifiedAmount,
        color: "#CCCCCC" // Grigio chiaro per la categoria non specificata
      });
    }
    
    // Converti la mappa in array per il grafico
    const categoryData = Array.from(categoryMap.values());
    setCategorySpending(categoryData);
    
    // Trova la categoria con più spese
    if (categoryData.length > 0) {
      const top = categoryData.reduce((max, curr) => 
        curr.value > max.value ? curr : max, categoryData[0]);
      setTopCategory({ name: top.name, amount: top.value });
    }
    
    // Raggruppa per mese
    const monthMap = new Map<number, number>();
    
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const month = date.getMonth();
      
      const currentAmount = monthMap.get(month) || 0;
      monthMap.set(month, currentAmount + Number(expense.amount));
    });
    
    // Converti la mappa in array per il grafico
    const monthlyData: MonthlySpendingData[] = [];
    for (let i = 0; i < 12; i++) {
      monthlyData.push({
        month: MONTHS[i],
        amount: monthMap.get(i) || 0
      });
    }
    
    setMonthlySpending(monthlyData);
    
  }, [transactions, categories]);
  
  return (
    <>
      <Header title="Statistiche" />
      
      <main className="pb-20">
        <div className="p-4">
          <h2 className="text-xl font-medium mb-4">Panoramica delle Spese</h2>
          
          {/* Statistiche generali */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Spese Totali</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <p className="text-lg font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Entrate Totali</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <p className="text-lg font-bold text-green-600">{formatCurrency(totalIncome)}</p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Spesa Media</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <p className="text-lg font-bold">{formatCurrency(avgExpenseAmount)}</p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Categoria Principale</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : topCategory ? (
                  <div>
                    <p className="text-base font-medium">{topCategory.name}</p>
                    <p className="text-sm text-destructive">{formatCurrency(topCategory.amount)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Nessun dato</p>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Tabs per i diversi grafici */}
          <Tabs defaultValue="categories" className="mb-6" onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="categories">Per Categoria</TabsTrigger>
              <TabsTrigger value="monthly">Per Mese</TabsTrigger>
            </TabsList>
            
            <TabsContent value="categories" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuzione Spese per Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-64 flex items-center justify-center">
                      <Skeleton className="h-48 w-48 rounded-full" />
                    </div>
                  ) : categorySpending.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categorySpending}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {categorySpending.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.color || COLORS[index % COLORS.length]} 
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value)}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <p className="text-gray-500">Nessuna spesa disponibile</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="monthly" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Andamento Mensile delle Spese</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="w-full space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  ) : monthlySpending.some(m => m.amount > 0) ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={monthlySpending}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis 
                            tickFormatter={(value) => {
                              if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                              return value.toString();
                            }} 
                          />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Bar dataKey="amount" fill="#FF6B6B" name="Spese" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <p className="text-gray-500">Nessuna spesa disponibile</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Dettaglio delle spese per categoria */}
          <Card>
            <CardHeader>
              <CardTitle>Dettaglio Spese per Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex justify-between items-center">
                      <Skeleton className="h-4 w-[150px]" />
                      <Skeleton className="h-4 w-[80px]" />
                    </div>
                  ))}
                </div>
              ) : categorySpending.length > 0 ? (
                <div className="space-y-3">
                  {categorySpending
                    .sort((a, b) => b.value - a.value)
                    .map((category, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: category.color || COLORS[index % COLORS.length] }} 
                          />
                          <span>{category.name}</span>
                        </div>
                        <div className="font-medium text-destructive">
                          {formatCurrency(category.value)}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Nessuna spesa disponibile</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      <BottomNavigation />
    </>
  );
};

export default StatisticsPage;