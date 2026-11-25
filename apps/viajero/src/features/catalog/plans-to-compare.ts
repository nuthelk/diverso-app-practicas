import type { Plan } from '@/core';

/**
 * El `extra` de go_router para `/comparar` (Expo Router no lo tiene): el catálogo deja aquí los
 * planes que ya tiene en memoria justo antes de navegar y el comparador los lee al montarse. Solo
 * evitan la espera: el comparador los usa únicamente si son EXACTAMENTE los ids de la URL y en el
 * mismo orden (gotcha 5); si no (recarga, deep link, otra selección), carga por id. Vive en
 * memoria: una recarga lo pierde, igual que el `extra`.
 */
let lastPlans: readonly Plan[] | null = null;

export function setPlansToCompare(plans: readonly Plan[]): void {
  lastPlans = plans;
}

export function plansToCompare(): readonly Plan[] | null {
  return lastPlans;
}

/** Para tests. */
export function forgetPlansToCompare(): void {
  lastPlans = null;
}
