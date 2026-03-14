import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError, walletApi } from "./api/client";
import type {
  CreateTransactionPayload,
  ExpenseTypeStat,
  HeatmapPoint,
  Summary,
  Transaction,
  TransactionType
} from "./types";

type DashboardState = {
  summary: Summary | null;
  topExpenseTypes: ExpenseTypeStat[];
  heatmap: HeatmapPoint[];
  transactions: Transaction[];
};

const initialDashboardState: DashboardState = {
  summary: null,
  topExpenseTypes: [],
  heatmap: [],
  transactions: []
};

const CATEGORY_OPTIONS = [
  "Food & Dining",
  "Housing",
  "Utilities",
  "Transportation & Vehicles",
  "Personal & Health",
  "Social Relationships",
  "Entertainment",
  "Education",
  "Other"
];

const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" }
];

function getMonthInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(amount);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(date);
}

function metricClass(amount: number): string {
  if (amount > 0) {
    return "metric-positive";
  }
  if (amount < 0) {
    return "metric-negative";
  }
  return "";
}

function getIntensityLevel(intensity: number, maxIntensity: number): number {
  if (intensity <= 0 || maxIntensity <= 0) {
    return 0;
  }
  const ratio = intensity / maxIntensity;
  if (ratio <= 0.25) {
    return 1;
  }
  if (ratio <= 0.5) {
    return 2;
  }
  if (ratio <= 0.75) {
    return 3;
  }
  return 4;
}

function formatHeatmapAmount(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(amount);
}

function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected error occurred.";
}

function App() {
  const [selectedMonth, setSelectedMonth] = useState<string>(getMonthInputValue());
  const [useDateRange, setUseDateRange] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [dashboard, setDashboard] = useState<DashboardState>(initialDashboardState);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [form, setForm] = useState<CreateTransactionPayload>({
    date: new Date().toISOString().slice(0, 10),
    type: "EXPENSE",
    category: "",
    amount: 0,
    note: ""
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string>("");
  const [selectedYearPart = String(new Date().getFullYear()), selectedMonthPart = "01"] = selectedMonth.split("-");
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, index) => String(currentYear - 5 + index));

  const heatmapByDate = useMemo(() => {
    return new Map(dashboard.heatmap.map((item) => [item.date.slice(0, 10), item.intensity]));
  }, [dashboard.heatmap]);

  
  const maxHeatmapIntensity = useMemo(() => {
    return dashboard.heatmap.reduce((max, item) => Math.max(max, item.intensity), 0);
  }, [dashboard.heatmap]);

  const heatmapCells = useMemo(() => {
    const [yearString, monthString] = selectedMonth.split("-");
    const year = Number(yearString);
    const month = Number(monthString);
    if (!year || !month) {
      return [];
    }
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const isoDate = `${yearString}-${monthString}-${String(day).padStart(2, "0")}`;
      const intensity = heatmapByDate.get(isoDate) ?? 0;
      const level = getIntensityLevel(intensity, maxHeatmapIntensity);
      return { day, isoDate, intensity, level };
    });
  }, [heatmapByDate, selectedMonth, maxHeatmapIntensity]);

  async function fetchDashboard(month: string, isManualRefresh = false, startDate?: string, endDate?: string): Promise<void> {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const [summary, topExpenseTypes, heatmap, transactions] = await Promise.all([
        walletApi.getSummary(month),
        walletApi.getTopExpenseTypes(month),
        walletApi.getHeatmapSnapshot(month),
        useDateRange && startDate && endDate
          ? walletApi.getTransactions(undefined, startDate, endDate)
          : walletApi.getTransactions(month)
      ]);

      setDashboard({
        summary,
        topExpenseTypes,
        heatmap,
        transactions
      });
    } catch (err: unknown) {
      setError(toUserMessage(err));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    if (!useDateRange) {
      void fetchDashboard(selectedMonth);
    }
  }, [selectedMonth, useDateRange]);

  useEffect(() => {
    if (useDateRange && startDate && endDate) {
      void fetchDashboard(selectedMonth, false, startDate, endDate);
    }
  }, [startDate, endDate, useDateRange]);

  async function handleRefresh(): Promise<void> {
    if (useDateRange && startDate && endDate) {
      await fetchDashboard(selectedMonth, true, startDate, endDate);
    } else {
      await fetchDashboard(selectedMonth, true);
    }
  }

  async function handleCreateTransaction(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError("");

    if (!form.category.trim()) {
      setFormError("Category is required.");
      return;
    }
    if (form.amount <= 0) {
      setFormError("Amount must be greater than 0.");
      return;
    }

    setIsSaving(true);
    try {
      await walletApi.createTransaction({
        ...form,
        category: form.category.trim(),
        note: form.note?.trim() ?? ""
      });
      setForm((prev) => ({ ...prev, category: "", amount: 0, note: "" }));
      if (useDateRange && startDate && endDate) {
        await fetchDashboard(selectedMonth, true, startDate, endDate);
      } else {
        await fetchDashboard(selectedMonth, true);
      }
    } catch (err: unknown) {
      setFormError(toUserMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteTransaction(id: string): Promise<void> {
    setDeletingId(id);
    setError("");
    try {
      await walletApi.deleteTransaction(id);
      if (useDateRange && startDate && endDate) {
        await fetchDashboard(selectedMonth, true, startDate, endDate);
      } else {
        await fetchDashboard(selectedMonth, true);
      }
    } catch (err: unknown) {
      setError(toUserMessage(err));
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1>ManageWalletPortal</h1>
        <div className="actions">
          <label htmlFor="useDateRange" className="inline-label">
            <input
              type="checkbox"
              id="useDateRange"
              checked={useDateRange}
              onChange={(event) => setUseDateRange(event.target.checked)}
            />
            Use Date Range
          </label>
          {useDateRange ? (
            <>
              <label htmlFor="startDate" className="inline-label">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
              <label htmlFor="endDate" className="inline-label">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </>
          ) : (
            <>
              <label htmlFor="month" className="inline-label">
                Month
              </label>
              <select
                id="month"
                value={selectedMonthPart}
                onChange={(event) => setSelectedMonth(`${selectedYearPart}-${event.target.value}`)}
              >
                {MONTH_OPTIONS.map((monthOption) => (
                  <option key={monthOption.value} value={monthOption.value}>
                    {monthOption.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Year"
                value={selectedYearPart}
                onChange={(event) => setSelectedMonth(`${event.target.value}-${selectedMonthPart}`)}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </>
          )}
          <button onClick={handleRefresh} disabled={loading || isRefreshing}>
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      {error && <p className="banner error">{error}</p>}

      <section className="summary-grid">
        <SummaryCard title="Total Income" value={dashboard.summary?.totalIncome} loading={loading} positive />
        <SummaryCard title="Total Expense" value={dashboard.summary?.totalExpense} loading={loading} negative />
        <SummaryCard title="Net Balance" value={dashboard.summary?.netBalance} loading={loading} />
        <SummaryCard
          title="Transaction Count"
          value={dashboard.summary?.transactionCount}
          loading={loading}
          isCount
        />
      </section>

      <section className="panel-grid">
        <article className="panel">
          <h2>Top Expense Types</h2>
          {loading ? (
            <p className="muted">Loading top expense types...</p>
          ) : dashboard.topExpenseTypes.length === 0 ? (
            <p className="muted">No expense data for this month.</p>
          ) : (
            <ul className="top-list">
              {dashboard.topExpenseTypes.map((item) => (
                <li key={item.type}>
                  <span>{item.type}</span>
                  <strong>{formatCurrency(item.amount)}</strong>
                  <em>{item.percent.toFixed(1)}%</em>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel">
          <h2>Monthly Heatmap Snapshot</h2>
          {loading ? (
            <p className="muted">Loading heatmap snapshot...</p>
          ) : heatmapCells.length === 0 ? (
            <p className="muted">No calendar data available.</p>
          ) : (
            <div className="heatmap-grid">
              {heatmapCells.map((cell) => (
                <div
                  key={cell.isoDate}
                  className={`heatmap-cell level-${cell.level}`}
                  title={`${cell.isoDate}: ${formatCurrency(cell.intensity)}`}
                >
                  {formatHeatmapAmount(cell.intensity)}
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="panel">
        <h2>Create Transaction</h2>
        <form className="tx-form" onSubmit={handleCreateTransaction}>
          <label>
            Date
            <input
              type="date"
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
              required
            />
          </label>
          <label>
            Type
            <select
              value={form.type}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, type: event.target.value as TransactionType }))
              }
            >
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
          </label>
          <label>
            Category
            <select
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              required
            >
              <option value="" disabled>
                Select category
              </option>
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            Amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount === 0 ? "" : form.amount}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  amount: Number(event.target.value)
                }))
              }
              required
            />
          </label>
          <label className="full-width">
            Note
            <input
              type="text"
              placeholder="Optional note"
              value={form.note ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
            />
          </label>

          <div className="full-width tx-form-actions">
            <button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Create Transaction"}
            </button>
            {formError && <p className="banner error inline">{formError}</p>}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>Transactions</h2>
        {loading ? (
          <p className="muted">Loading transactions...</p>
        ) : dashboard.transactions.length === 0 ? (
          <p className="muted">No transactions found for this month.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Note</th>
                  <th className="right">Amount</th>
                  <th className="right">Action</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.transactions.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    deleting={deletingId === tx.id}
                    onDelete={handleDeleteTransaction}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

type SummaryCardProps = {
  title: string;
  value: number | undefined;
  loading: boolean;
  positive?: boolean;
  negative?: boolean;
  isCount?: boolean;
};

function SummaryCard({ title, value, loading, positive, negative, isCount }: SummaryCardProps) {
  let displayValue = "-";
  if (typeof value === "number") {
    displayValue = isCount ? String(value) : formatCurrency(value);
  }

  const classNames = ["summary-card"];
  if (!isCount && typeof value === "number") {
    if (positive) {
      classNames.push("metric-positive");
    }
    if (negative) {
      classNames.push("metric-negative");
    }
    classNames.push(metricClass(value));
  }

  return (
    <article className={classNames.join(" ")}>
      <h3>{title}</h3>
      <p>{loading ? "Loading..." : displayValue}</p>
    </article>
  );
}

type TransactionRowProps = {
  tx: Transaction;
  deleting: boolean;
  onDelete: (id: string) => Promise<void>;
};

function TransactionRow({ tx, deleting, onDelete }: TransactionRowProps) {
  return (
    <tr>
      <td>{formatDate(tx.date)}</td>
      <td>{tx.type}</td>
      <td>{tx.category}</td>
      <td>{tx.note || "-"}</td>
      <td className={`right ${tx.type === "INCOME" ? "metric-positive" : "metric-negative"}`}>
        {formatCurrency(tx.amount)}
      </td>
      <td className="right">
        <button className="danger" onClick={() => void onDelete(tx.id)} disabled={deleting}>
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </td>
    </tr>
  );
}

export default App;






