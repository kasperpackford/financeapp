export interface Subscription {
  id: string;
  name: string;
  cost: number;
  billingDay: number; // 1–31
  billingMonth?: number; // 1–12; quarterly = start month, annual = billing month
  billingCycle: 'monthly' | 'quarterly' | 'annual';
  active: boolean;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string; // ISO date string YYYY-MM-DD
  recurring: boolean;
}

export interface BudgetCategory {
  id: string;
  name: string;
  monthlyLimit: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  monthlyContribution: number;
  currentAmount: number;
}

export interface SavingsTracker {
  tfsaBalance: number;
  monthlyContribution: number;
  returnRate: number; // percentage e.g. 5 = 5%
}

export interface Paycheck {
  id: string;
  amount: number;
  date: string; // ISO YYYY-MM-DD
}

export interface AppSettings {
  payFrequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
}
