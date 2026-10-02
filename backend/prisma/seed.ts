/**
 * Seeds the first admin user, the settings row and default Khadi categories.
 * Safe to run more than once: existing records are left untouched.
 *
 *   npm run db:seed
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  'Khadi Cotton Fabric',
  'Khadi Silk Fabric',
  'Khadi Wool',
  'Readymade Garments',
  'Village Industry Products',
  'Herbal & Ayurvedic',
  'Honey & Food Products',
  'Soaps & Cosmetics',
  'Handicrafts',
];

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? '';
  const name = process.env.ADMIN_NAME ?? 'Shop Admin';

  if (!email || password.length < 8) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (min 8 chars) in .env before seeding');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} already exists, skipping`);
  } else {
    await prisma.user.create({
      data: { name, email, role: 'ADMIN', passwordHash: await bcrypt.hash(password, 12) },
    });
    console.log(`Created admin ${email}`);
  }

  await prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  console.log('Settings row ready');

  for (const categoryName of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName },
    });
  }
  console.log(`${DEFAULT_CATEGORIES.length} categories ready`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
