import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { sessionSlice } from './session-slice';
import { uiSlice } from './ui-slice';

const rootReducer = combineReducers({
  session: sessionSlice.reducer,
  ui: uiSlice.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({ reducer: rootReducer, preloadedState });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];

let clientStore: AppStore | undefined;

/**
 * En el navegador hay un único store (lo usan también los clientLoader).
 * En el servidor se crea uno por petición para no mezclar usuarios en SSR.
 */
export function getStore(): AppStore {
  if (typeof window === 'undefined') return makeStore();
  clientStore ??= makeStore();
  return clientStore;
}

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
