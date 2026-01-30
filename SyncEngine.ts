
import { supabase } from './supabase';

/**
 * SyncEngine
 * Background data distribution with LocalCache fallback.
 * Fixes "Slow App" feeling by providing instant data access.
 */
export class SyncEngine {
  private static isSyncing = false;

  // Safe wrapper for requestIdleCallback
  private static runWhenIdle(callback: () => void) {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(callback, { timeout: 2000 });
    } else {
      setTimeout(callback, 150);
    }
  }

  static async backgroundFetch(table: string, query: string = '*') {
    // 1. Return Cache Immediately
    const cacheKey = `rcm_cache_${table}`;
    const cached = localStorage.getItem(cacheKey);
    const initialData = cached ? JSON.parse(cached) : null;

    // 2. Trigger Background Refresh
    if (!this.isSyncing) {
      this.isSyncing = true;
      this.runWhenIdle(async () => {
        try {
          const { data, error } = await supabase.from(table).select(query);
          if (!error && data) {
            localStorage.setItem(cacheKey, JSON.stringify(data));
            // Dispatch event so active components can update
            window.dispatchEvent(new CustomEvent(`rcm-sync-${table}`, { detail: data }));
          }
        } catch (e) {
          console.error(`Sync Fail: ${table}`, e);
        } finally {
          this.isSyncing = false;
        }
      });
    }

    return initialData;
  }

  static async reconcileLedgerBalances(dealers: any[]) {
    return new Promise((resolve) => {
      this.runWhenIdle(async () => {
        try {
          const { data: ledger } = await supabase.from('ledger').select('dealer_id, amount, type');
          const balances: Record<string, number> = {};
          ledger?.forEach(entry => {
            if (!balances[entry.dealer_id]) balances[entry.dealer_id] = 0;
            if (entry.type === 'DEBIT') balances[entry.dealer_id] += Number(entry.amount);
            else balances[entry.dealer_id] -= Number(entry.amount);
          });
          const reconciled = dealers.map(d => ({ ...d, ledger_balance: balances[d.id] || 0 }));
          resolve(reconciled);
        } catch (e) {
          resolve(dealers);
        }
      });
    });
  }
}
