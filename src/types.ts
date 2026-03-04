export type Summary = {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  transactionCount: number;
};

export type ExpenseTypeStat = {
  type: string;
  amount: number;
  percent: number;
};

export type HeatmapPoint = {
  date: string;
  intensity: number;
};

export type TransactionType = "INCOME" | "EXPENSE";

export type Transaction = {
  id: string;
  date: string;
  type: TransactionType;
  category: string;
  amount: number;
  note?: string | null;
};

export type CreateTransactionPayload = {
  date: string;
  type: TransactionType;
  category: string;
  amount: number;
  note?: string;
};
