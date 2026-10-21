import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

/** Página de texto (seguridad, legales) con ancho de lectura cómodo. */
export function ProsePage({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-12 leading-relaxed [&_h2]:mt-6 [&_li]:mb-2">
      <Typography variant="h1">{title}</Typography>
      {updated && (
        <Typography variant="body2" color="text.secondary">
          Última actualización: {updated}
        </Typography>
      )}
      {children}
    </article>
  );
}
