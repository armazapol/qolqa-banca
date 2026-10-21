import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router';
import { Logo } from './Logo';

interface StatusPageProps {
  code: string;
  title: string;
  description: string;
}

export function StatusPage({ code, title, description }: StatusPageProps) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo />
      <Typography component="p" variant="overline" color="text.secondary">
        {code}
      </Typography>
      <Typography variant="h1">{title}</Typography>
      <Typography color="text.secondary">{description}</Typography>
      <Button component={Link} to="/" variant="contained">
        Volver al inicio
      </Button>
    </main>
  );
}
