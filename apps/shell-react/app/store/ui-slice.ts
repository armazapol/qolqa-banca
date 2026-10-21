import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

export interface Notice {
  id: string;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
}

export interface UiState {
  notices: Notice[];
}

const initialState: UiState = { notices: [] };

/** Avisos globales (p. ej. una transferencia recibida por WebSocket). */
export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    noticeShown: {
      reducer(state, action: PayloadAction<Notice>) {
        state.notices.push(action.payload);
      },
      prepare(message: string, severity: Notice['severity'] = 'info') {
        return { payload: { id: nanoid(), message, severity } };
      },
    },
    noticeDismissed(state, action: PayloadAction<string>) {
      state.notices = state.notices.filter(
        (notice) => notice.id !== action.payload,
      );
    },
  },
});

export const { noticeShown, noticeDismissed } = uiSlice.actions;
