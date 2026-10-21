import { data } from 'react-router';
import { StatusPage } from '../components/StatusPage';
import type { Route } from './+types/not-found';

export const meta: Route.MetaFunction = () => [
  { title: 'Página no encontrada · Qolqa' },
  { name: 'robots', content: 'noindex' },
];

// Devuelve un 404 real (no un 200 con texto de error): importante para SEO.
export function loader() {
  return data(null, { status: 404 });
}

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="Página no encontrada"
      description="La dirección que buscas no existe o fue movida."
    />
  );
}
