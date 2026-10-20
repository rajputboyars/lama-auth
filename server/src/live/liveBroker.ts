/**
 * ============================================================================
 *  LIVE TRADING INTERFACE — INTENTIONALLY NOT IMPLEMENTED
 * ============================================================================
 *  This project is paper trading only. Nothing in this codebase sends real
 *  orders. This interface exists so a future, separately reviewed module can
 *  plug in a real broker. Before anyone implements it, it needs at minimum:
 *  per-order confirmation, hard position limits enforced at the broker,
 *  idempotent order IDs, reconciliation, and a tested kill switch.
 * ============================================================================
 */
import type { Side } from '../types.js';

export interface LiveOrderRequest {
  clientOrderId: string;
  symbol: string;
  side: Side;
  quantity: number;
  limitPrice: number;
}

export interface LiveOrderResult {
  brokerOrderId: string;
  status: 'accepted' | 'rejected';
  message?: string;
}

export interface LiveBroker {
  readonly name: string;
  placeOrder(order: LiveOrderRequest): Promise<LiveOrderResult>;
  cancelOrder(brokerOrderId: string): Promise<void>;
}

/** The only LiveBroker in this codebase. It refuses every call. */
export class DisabledLiveBroker implements LiveBroker {
  readonly name = 'disabled';

  placeOrder(): Promise<LiveOrderResult> {
    return Promise.reject(new Error('Live trading is disabled: this is a paper-trading bot'));
  }

  cancelOrder(): Promise<void> {
    return Promise.reject(new Error('Live trading is disabled: this is a paper-trading bot'));
  }
}
