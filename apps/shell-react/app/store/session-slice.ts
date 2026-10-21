import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SessionUser } from '@qolqa/contracts';

export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';
export type LogoutReason = 'manual' | 'idle' | 'expired';

export interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
  /** Motivo del último cierre, para explicarlo en la pantalla de ingreso. */
  logoutReason: LogoutReason | null;
}

const initialState: SessionState = {
  status: 'unknown',
  user: null,
  logoutReason: null,
};

/** Estado de la sesión (Flux: acción → reducer → store). El token NO vive aquí. */
export const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    sessionStarted(state, action: PayloadAction<SessionUser>) {
      state.status = 'authenticated';
      state.user = action.payload;
      state.logoutReason = null;
    },
    sessionEnded(state, action: PayloadAction<LogoutReason>) {
      state.status = 'anonymous';
      state.user = null;
      state.logoutReason = action.payload;
    },
  },
});

export const { sessionStarted, sessionEnded } = sessionSlice.actions;
