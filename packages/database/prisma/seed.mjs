import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(__dirname, '../../../.env');
if (!process.env.DATABASE_URL && fs.existsSync(rootEnvPath)) {
  for (const rawLine of fs.readFileSync(rootEnvPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  {
    slug: 'electronics',
    name: 'Electronics & Gadgets',
    description: 'Phones, laptops, chargers, headphones, tablets',
    iconName: 'smartphone',
  },
  {
    slug: 'documents',
    name: 'IDs & Official Documents',
    description: 'Aadhaar, PAN card, driving licence, passport, student ID',
    iconName: 'file-text',
  },
  {
    slug: 'wallets_bags',
    name: 'Wallets, Purses & Bags',
    description: 'Wallets, backpacks, handbags, luggage, pouches',
    iconName: 'briefcase',
  },
  {
    slug: 'keys',
    name: 'Keys',
    description: 'House keys, vehicle keys, office access cards',
    iconName: 'key',
  },
  {
    slug: 'jewellery',
    name: 'Jewellery & Watches',
    description: 'Watches, rings, chains, bracelets, earrings',
    iconName: 'watch',
  },
  {
    slug: 'cards',
    name: 'Debit/Credit Cards & Metro Cards',
    description: 'Bank cards, metro smart cards, bus passes',
    iconName: 'credit-card',
  },
  {
    slug: 'clothing',
    name: 'Clothing & Accessories',
    description: 'Jackets, spectacles, sunglasses, caps, shoes',
    iconName: 'shirt',
  },
  {
    slug: 'books_stationery',
    name: 'Books & Stationery',
    description: 'Textbooks, notebooks, files, stationery pouches',
    iconName: 'book-open',
  },
  {
    slug: 'medical',
    name: 'Medical & Healthcare Items',
    description: 'Prescription glasses, medical devices, medicine pouches',
    iconName: 'heart-pulse',
  },
  {
    slug: 'other',
    name: 'Other Belongings',
    description: 'Miscellaneous lost or found personal belongings',
    iconName: 'package',
  },
];

async function main() {
  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        iconName: category.iconName,
        isActive: true,
      },
      create: {
        slug: category.slug,
        name: category.name,
        description: category.description,
        iconName: category.iconName,
        isActive: true,
      },
    });
  }

  console.info(`Seeded ${DEFAULT_CATEGORIES.length} item categories successfully.`);
}

main()
  .catch((error) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
