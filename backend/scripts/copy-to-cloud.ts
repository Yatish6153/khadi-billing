/**
 * One-time copy of the shop's data from the local database (Prisma Dev on the
 * shop PC) into the online database (Supabase).
 *
 *   cd backend
 *   npm run copy-to-cloud
 *
 * It asks for the Supabase connection string, so the password is typed only
 * into this terminal. The online database must already have its tables (Render
 * creates them on first deploy via `prisma migrate deploy`) and must be empty.
 */
import { execSync } from 'node:child_process';
import readline from 'node:readline/promises';
import { PrismaClient } from '@prisma/client';

function localDatabaseUrl(): string {
  const out = execSync('npx prisma dev --name khadi --detach', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const url = out.split(/\r?\n/).find((l) => l.startsWith('postgres://'));
  if (!url) throw new Error('Could not start the local database');
  return `${url}&connection_limit=1&pgbouncer=true`;
}

/** Tables in dependency order (parents before children). */
const TABLES = [
  'user',
  'setting',
  'category',
  'customer',
  'product',
  'invoice',
  'invoiceItem',
  'stockMovement',
] as const;
const SQL_NAMES: Record<(typeof TABLES)[number], string> = {
  user: 'users',
  setting: 'settings',
  category: 'categories',
  customer: 'customers',
  product: 'products',
  invoice: 'invoices',
  invoiceItem: 'invoice_items',
  stockMovement: 'stock_movements',
};

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('Paste the Supabase connection string (Session pooler, starts with postgresql://) and press Enter:');
  const target = (await rl.question('> ')).trim();
  rl.close();
  if (!/^postgres(ql)?:\/\//.test(target)) throw new Error('That does not look like a connection string');

  const local = new PrismaClient({ datasourceUrl: localDatabaseUrl() });
  const cloud = new PrismaClient({ datasourceUrl: target });

  try {
    const existing = await cloud.user.count();
    if (existing > 0) throw new Error('The online database already has data. Nothing was copied.');

    for (const table of TABLES) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await (local as any)[table].findMany();
      if (rows.length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (cloud as any)[table].createMany({ data: rows });
      }
      console.log(`  ${SQL_NAMES[table].padEnd(16)} ${rows.length} rows`);
    }

    // Continue id numbering after the copied rows
    for (const table of TABLES) {
      if (table === 'setting') continue;
      const name = SQL_NAMES[table];
      await cloud.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('${name}', 'id'), COALESCE((SELECT MAX(id) FROM ${name}), 0) + 1, false)`,
      );
    }
    console.log('\nDone. Your data is now in the online database.');
  } finally {
    await local.$disconnect();
    await cloud.$disconnect();
  }
}

main().catch((err) => {
  console.error('\nCopy failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
