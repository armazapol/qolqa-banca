/** Perú usa UTC-5 todo el año (sin horario de verano). */
const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Inicio del día actual en Lima, expresado en UTC. Base del límite diario. */
export function startOfLimaDay(now = new Date()): Date {
  const lima = new Date(now.getTime() - LIMA_OFFSET_MS);
  return new Date(
    Date.UTC(lima.getUTCFullYear(), lima.getUTCMonth(), lima.getUTCDate()) +
      LIMA_OFFSET_MS,
  );
}
