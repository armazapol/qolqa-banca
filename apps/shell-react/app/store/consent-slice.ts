import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AnalyticsConsent } from '../lib/consent';

export interface ConsentState {
  /** 'unknown' hasta leer el navegador (evita mostrar el banner en SSR y que parpadee). */
  analytics: AnalyticsConsent | 'pending' | 'unknown';
}

const initialState: ConsentState = { analytics: 'unknown' };

/** Consentimiento de cookies analíticas (Ley 29733, ADR-0011 / ADR-0021). */
export const consentSlice = createSlice({
  name: 'consent',
  initialState,
  reducers: {
    /** Lectura inicial del navegador: null = el usuario aún no decidió. */
    consentLoaded(state, action: PayloadAction<AnalyticsConsent | null>) {
      state.analytics = action.payload ?? 'pending';
    },
    consentDecided(state, action: PayloadAction<AnalyticsConsent>) {
      state.analytics = action.payload;
    },
    consentReset(state) {
      state.analytics = 'pending';
    },
  },
});

export const { consentLoaded, consentDecided, consentReset } =
  consentSlice.actions;
