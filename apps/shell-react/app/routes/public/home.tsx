import CurrencyExchangeOutlined from '@mui/icons-material/CurrencyExchangeOutlined';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import ShowChartOutlined from '@mui/icons-material/ShowChartOutlined';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import type { Route } from './+types/home';

export const meta: Route.MetaFunction = () => [
  { title: 'Qolqa Banca Digital · Tu banco, simple y seguro' },
  {
    name: 'description',
    content:
      'Consulta tus cuentas, transfiere con autenticación reforzada y sigue el tipo de cambio en tiempo real.',
  },
  { property: 'og:title', content: 'Qolqa Banca Digital' },
  { property: 'og:type', content: 'website' },
];

const FEATURES = [
  {
    icon: ShieldOutlined,
    title: 'Seguridad reforzada',
    text: 'Cada ingreso y cada transferencia se confirman con un código de tu app de autenticación.',
  },
  {
    icon: CurrencyExchangeOutlined,
    title: 'Tipo de cambio al instante',
    text: 'Referencia oficial del BCRP y cotización actualizada en tiempo real.',
  },
  {
    icon: ShowChartOutlined,
    title: 'Inversiones en un solo lugar',
    text: 'Sigue tu portafolio con precios de mercado en vivo.',
  },
];

export default function Home() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
        {/* Sin fundido de opacidad: el titular es el LCP y debe verse desde el HTML
            prerenderizado, no tras hidratar (ADR-0023). Un transform no afecta al LCP. */}
        <motion.div
          initial={{ y: 12 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col justify-center gap-6"
        >
          <Typography variant="h1" className="text-4xl! md:text-5xl!">
            Guarda, mueve y haz crecer tu dinero con tranquilidad
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            className="text-lg!"
          >
            Qolqa es la banca por internet pensada para el Perú: transferencias
            seguras, tipo de cambio transparente y tu información siempre
            protegida.
          </Typography>
          <div className="flex flex-wrap gap-3">
            {/* reloadDocument: la banca se abre en un documento nuevo con CSP por nonce (ADR-0021). */}
            <Button
              component={Link}
              to="/ingresar"
              reloadDocument
              variant="contained"
              size="large"
            >
              Ingresar a mi cuenta
            </Button>
            <Button
              component={Link}
              to="/tipo-de-cambio"
              variant="outlined"
              size="large"
            >
              Ver tipo de cambio
            </Button>
          </div>
        </motion.div>
        <div
          aria-hidden="true"
          className="hidden rounded-3xl bg-gradient-to-br from-brand to-[#145f6d] p-8 text-white md:block"
        >
          <p className="m-0 text-sm opacity-80">Saldo disponible</p>
          <p className="m-0 mt-1 text-4xl font-bold">S/ 10,514.20</p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="m-0 opacity-80">Compra</p>
              <p className="m-0 text-2xl font-semibold">3.414</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="m-0 opacity-80">Venta</p>
              <p className="m-0 text-2xl font-semibold">3.467</p>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="beneficios"
        className="mx-auto max-w-6xl px-4 pb-20"
      >
        <Typography id="beneficios" variant="h2" className="mb-6!">
          Todo lo que necesitas, sin complicaciones
        </Typography>
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <Card className="h-full">
                <CardContent className="flex flex-col gap-2">
                  <Icon color="primary" aria-hidden="true" />
                  <Typography variant="h3">{title}</Typography>
                  <Typography color="text.secondary">{text}</Typography>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
