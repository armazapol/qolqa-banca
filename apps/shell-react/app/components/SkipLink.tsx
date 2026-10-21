/** Primer elemento enfocable: salta la navegación (WCAG 2.4.1). */
export function SkipLink({ target = 'contenido' }: { target?: string }) {
  return (
    <a
      href={`#${target}`}
      className="sr-only z-50 rounded-md bg-brand px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
    >
      Saltar al contenido principal
    </a>
  );
}
