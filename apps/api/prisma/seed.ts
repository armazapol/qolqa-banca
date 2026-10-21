/**
 * Datos de demostración de Qolqa Banca Digital. Idempotente: borra y recrea.
 * Todos los datos son ficticios. Los secretos TOTP de demo se publican en el
 * README para que cualquiera pueda probar el login con su app de autenticación.
 */
import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { writeFileSync } from 'node:fs';
import { generateSecret, generateURI } from 'otplib';
import { ARGON2_OPTIONS } from '../src/auth/argon2-options';
import { encryptAesGcm } from '../src/common/security/aes-gcm';
import {
  PrismaClient,
  type Currency,
  type MovementType,
} from '../src/generated/prisma/client';

const DEMO_PASSWORD = 'Qolqa#Demo2026';
/** Prefijo bancario ficticio (no corresponde a ninguna entidad real). */
const BANK_CODE = '777';

const USERS = [
  {
    email: 'lucia.quispe@demo.qolqa.pe',
    fullName: 'Lucía Quispe Mamani',
    documentNumber: '70123456',
    totpSecret: 'FWSSOZW6G7NMMV4AQPTA6MEKI6S6RXBW',
    seed: 11,
  },
  {
    email: 'mateo.huaman@demo.qolqa.pe',
    fullName: 'Mateo Huamán Rojas',
    documentNumber: '71234567',
    totpSecret: 'SJRTFE2SVRBSY6Y3SKWJCN2D56PWE22L',
    seed: 29,
  },
];

const ACCOUNTS: {
  type: 'CHECKING' | 'SAVINGS';
  currency: Currency;
  alias: string;
  base: number;
}[] = [
  { type: 'CHECKING', currency: 'PEN', alias: 'Cuenta Sueldo', base: 850_000 },
  { type: 'SAVINGS', currency: 'USD', alias: 'Ahorro Dólares', base: 420_000 },
  {
    type: 'SAVINGS',
    currency: 'PEN',
    alias: 'Ahorro Meta Viaje',
    base: 1_250_000,
  },
];

const EXPENSES = [
  'Supermercado',
  'Farmacia',
  'Restaurante',
  'Pago de luz',
  'Pago de agua',
  'Recarga celular',
  'Transporte',
  'Librería',
  'Gimnasio',
  'Streaming',
];

const HOLDINGS = [
  {
    symbol: 'BTCUSDT',
    name: 'Bitcoin',
    quantity: '0.01250000',
    avgPriceUsd: '61250.00',
  },
  {
    symbol: 'ETHUSDT',
    name: 'Ethereum',
    quantity: '0.85000000',
    avgPriceUsd: '2450.00',
  },
  {
    symbol: 'SOLUSDT',
    name: 'Solana',
    quantity: '12.00000000',
    avgPriceUsd: '140.00',
  },
];

/** PRNG determinista (mulberry32): mismos datos en cada ejecución. */
function prng(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function digits(random: () => number, length: number): string {
  return Array.from({ length }, () => Math.floor(random() * 10)).join('');
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

interface DemoUser {
  email: string;
  fullName: string;
  documentNumber: string;
  totpSecret: string;
  seed: number;
}

interface SeededAccount {
  alias: string;
  currency: Currency;
  number: string;
  balanceCents: number;
}

interface E2eUser {
  email: string;
  totpSecret: string;
  accounts: SeededAccount[];
}

/** Crea un usuario con sus cuentas, movimientos, tarjeta y portafolio. */
async function seedUser(
  prisma: PrismaClient,
  demo: DemoUser,
  encryptionKey: Buffer,
  passwordHash: string,
): Promise<SeededAccount[]> {
  const random = prng(demo.seed);
  const user = await prisma.user.create({
    data: {
      email: demo.email,
      fullName: demo.fullName,
      documentNumber: demo.documentNumber,
      passwordHash,
      totpSecretEnc: encryptAesGcm(encryptionKey, demo.totpSecret),
    },
  });
  const seeded: SeededAccount[] = [];

  for (const [index, spec] of ACCOUNTS.entries()) {
    const number = `${BANK_CODE}${String(index + 1).padStart(2, '0')}${digits(random, 9)}`;
    const account = await prisma.account.create({
      data: {
        userId: user.id,
        type: spec.type,
        currency: spec.currency,
        alias: spec.alias,
        number,
        // CCI (20 dígitos) = entidad (3) + cuenta (14) + control (3).
        cci: `${BANK_CODE}${number}${digits(random, 3)}`,
        balanceCents: 0,
      },
    });

    const movements = buildMovements(random, spec.base, index === 0);
    await prisma.movement.createMany({
      data: movements.map((movement) => ({
        ...movement,
        accountId: account.id,
      })),
    });
    const balanceCents = movements.at(-1)?.balanceAfterCents ?? spec.base;
    await prisma.account.update({
      where: { id: account.id },
      data: { balanceCents },
    });
    seeded.push({
      alias: spec.alias,
      currency: spec.currency,
      number,
      balanceCents,
    });

    if (index === 0) {
      await prisma.card.create({
        data: {
          userId: user.id,
          accountId: account.id,
          brand: demo.seed % 2 === 0 ? 'MASTERCARD' : 'VISA',
          bin: demo.seed % 2 === 0 ? '555555' : '411111',
          last4: digits(random, 4),
          expiryMonth: 1 + Math.floor(random() * 12),
          expiryYear: 2029,
        },
      });
    }
  }

  await prisma.holding.createMany({
    data: HOLDINGS.map((holding) => ({ ...holding, userId: user.id })),
  });
  return seeded;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: requireEnv('DATABASE_URL') }),
  });
  const encryptionKey = Buffer.from(
    requireEnv('TOTP_ENCRYPTION_KEY'),
    'base64',
  );
  const passwordHash = await hash(DEMO_PASSWORD, ARGON2_OPTIONS);

  try {
    // Orden inverso a las relaciones.
    await prisma.$transaction([
      prisma.auditLog.deleteMany(),
      prisma.movement.deleteMany(),
      prisma.transfer.deleteMany(),
      prisma.card.deleteMany(),
      prisma.holding.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.account.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    for (const demo of USERS) {
      await seedUser(prisma, demo, encryptionKey, passwordHash);
      const uri = generateURI({
        issuer: 'Qolqa Banca Digital',
        label: demo.email,
        secret: demo.totpSecret,
      });
      console.log(`✔ ${demo.email}\n  otpauth: ${uri}`);
    }

    // Usuarios solo para E2E (ADR-0022): cada test usa el suyo, sin esperar
    // a que caduque el paso TOTP del anterior. Nunca se crean en producción.
    const e2eCount = Number(process.env['SEED_E2E_USERS'] ?? 0);
    if (e2eCount > 0) {
      const output = requireEnv('SEED_E2E_OUTPUT');
      const e2eUsers: E2eUser[] = [];
      for (let n = 1; n <= e2eCount; n++) {
        const demo: DemoUser = {
          email: `e2e-${String(n).padStart(3, '0')}@demo.qolqa.pe`,
          fullName: `Usuario Prueba ${n}`,
          documentNumber: String(80_000_000 + n),
          totpSecret: generateSecret(),
          seed: 1_000 + n,
        };
        const accounts = await seedUser(
          prisma,
          demo,
          encryptionKey,
          passwordHash,
        );
        e2eUsers.push({
          email: demo.email,
          totpSecret: demo.totpSecret,
          accounts,
        });
      }
      writeFileSync(
        output,
        `${JSON.stringify({ password: DEMO_PASSWORD, users: e2eUsers }, null, 2)}\n`,
      );
      console.log(`✔ ${e2eCount} usuarios E2E → ${output}`);
    }

    console.log(`\nContraseña de demo: ${DEMO_PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}

/** ~20 movimientos en 90 días, cronológicos, con saldo resultante coherente. */
function buildMovements(
  random: () => number,
  openingCents: number,
  isPayroll: boolean,
) {
  const now = Date.now();
  const days = 90;
  let balance = openingCents;
  const events: {
    date: Date;
    type: MovementType;
    amountCents: number;
    description: string;
  }[] = [];

  for (let day = days; day >= 0; day -= 1 + Math.floor(random() * 6)) {
    const date = new Date(
      now - day * 24 * 60 * 60 * 1000 - Math.floor(random() * 36e6),
    );
    const isSalaryDay =
      isPayroll && new Date(date).getUTCDate() <= 6 && random() < 0.5;
    if (isSalaryDay) {
      events.push({
        date,
        type: 'CREDIT',
        amountCents: 520_000,
        description: 'Abono de remuneración',
      });
    } else {
      events.push({
        date,
        type: 'DEBIT',
        amountCents: 1_500 + Math.floor(random() * 28_000),
        description:
          EXPENSES[Math.floor(random() * EXPENSES.length)] ?? 'Compra',
      });
    }
  }

  return events.map((event) => {
    // Nunca se deja el saldo en negativo: si no alcanza, el gasto se convierte en un abono.
    const type: MovementType =
      event.type === 'DEBIT' && balance < event.amountCents
        ? 'CREDIT'
        : event.type;
    balance += type === 'CREDIT' ? event.amountCents : -event.amountCents;
    return {
      type,
      amountCents: event.amountCents,
      balanceAfterCents: balance,
      description:
        type === event.type ? event.description : 'Depósito en agente',
      counterparty: null,
      createdAt: event.date,
    };
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
