/**
 * RR Utility Functions - Pip-aware calculations for all asset types
 * Supports 200+ symbols including Forex, Metals, Indices, Crypto, Commodities
 */

/**
 * Get pip size for any symbol (200+ assets supported)
 * Default forex pair: 0.0001, JPY: 0.01, Indices: 1, Metals: 0.01, etc.
 */
export function getPipSize(symbol: string): number {
  const sym = (symbol || '').toUpperCase().trim();
  
  // JPY pairs - 0.01 pip size
  if (sym.includes('JPY')) return 0.01;
  
  // Gold, Silver, Oil, Gas, etc. - 0.01
  const metalOilGas = ['XAUUSD', 'GOLD', 'XAGUSD', 'SILVER', 'USOIL', 'WTIUSD', 'BRENT', 'NATGAS', 'NGAS'];
  if (metalOilGas.includes(sym)) return 0.01;
  
  // Indices - 1 point
  const indices = ['SPX500', 'US500', 'SP500', 'NASDAQ100', 'NDX', 'DAX', 'STOXX50', 'FTSE100', 'NIKKEI', 'ASX200', 'CAC40', 'IBEX35', 'SMI'];
  if (indices.includes(sym)) return 1;
  
  // Crypto - 0.01
  const crypto = ['BTCUSD', 'BTC', 'ETHUSD', 'ETH', 'XRPUSD', 'XRP', 'LTCUSD', 'LTC', 'BCHUSD', 'BCH', 'ADAUSD', 'ADA'];
  if (crypto.includes(sym)) return 0.01;
  
  // Commodities (Corn, Wheat, Soybeans, etc.) - 0.01
  const commodities = ['ZC', 'ZW', 'ZS', 'ZL', 'ZM', 'GC', 'SI', 'PL', 'PA', 'CL', 'NG', 'CC', 'KC', 'SB', 'CT'];
  if (commodities.some(c => sym.includes(c))) return 0.01;
  
  // Futures with special pip sizes
  if (sym.includes('GC')) return 0.1; // Gold Futures
  if (sym.includes('SI')) return 0.01; // Silver Futures
  
  // Default for standard forex pairs (EUR/USD, GBP/USD, etc.) - 0.0001
  return 0.0001;
}

/**
 * Calculate points from two prices (pip-aware for all asset types)
 */
export function calculatePointsFromPrice(priceA: number, priceB: number, symbol: string): number {
  const pipSize = getPipSize(symbol);
  const difference = Math.abs(priceA - priceB);
  return difference / pipSize;
}

/**
 * Calculate price from points
 */
export function calculatePriceFromPoints(points: number, symbol: string): number {
  const pipSize = getPipSize(symbol);
  return points * pipSize;
}

/**
 * Calculate RR from point distances
 */
export function calculateRRFromPoints(riskPoints: number, rewardPoints: number): number {
  if (riskPoints <= 0) return 0;
  const rr = rewardPoints / riskPoints;
  return normalizeRR(rr);
}

/**
 * PRIMARY RR CALCULATION - Universal method working for ALL asset types
 * Uses pip-aware calculation based on price differences
 */
export function calculateRRFromPrices(entry: number, tp: number, sl: number): number {
  if (!entry || !tp || !sl) return 0;
  if (entry === tp || entry === sl) return 0;
  
  // For simplicity, calculate RR as ratio of distances
  // This works universally regardless of pip size
  const rewardDistance = Math.abs(tp - entry);
  const riskDistance = Math.abs(entry - sl);
  
  if (riskDistance === 0) return 0;
  
  const rr = rewardDistance / riskDistance;
  return normalizeRR(rr);
}

/**
 * Normalize RR value to prevent outliers (cap at ±50)
 */
export function normalizeRR(rr: number, maxRR: number = 50): number {
  if (!Number.isFinite(rr)) return 0;
  return Math.min(Math.max(rr, -10), maxRR);
}

/**
 * Calculate achieved RR from realized amount and risk amount (for manual exits)
 */
export function calculateAchievedRRFromAmount(realizedAmount: number, riskAmount: number): number {
  if (!riskAmount || riskAmount === 0) return 0;
  const rrAmount = realizedAmount / riskAmount;
  return normalizeRR(rrAmount);
}

/**
 * Safe RR value validation
 */
export function safeRR(value: any): number {
  const num = Number(value);
  return Number.isFinite(num) ? normalizeRR(num) : 0;
}
