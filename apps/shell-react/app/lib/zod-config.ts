import { z } from 'zod';

/**
 * Zod 4 prueba `Function('')` para compilar validadores (JIT). La CSP sin
 * 'unsafe-eval' lo bloquea y genera una violación en cada visita: con
 * `jitless` Zod no lo intenta (ADR-0021).
 *
 * Debe ser el PRIMER import de root.tsx (React Router evalúa root antes que
 * entry.client): algunos esquemas (.omit, .keyof) activan la comprobación al
 * evaluarse el módulo. Este archivo
 * está declarado en "sideEffects" del package.json para que el bundler no lo elimine.
 */
z.config({ jitless: true });
