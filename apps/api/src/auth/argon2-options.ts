/**
 * Argon2id con los parámetros mínimos recomendados por OWASP
 * (19 MiB de memoria, 2 iteraciones, paralelismo 1).
 */
export const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};
