const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const ensureAdmin = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed the admin user.');
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.adminUser.create({ data: { email, passwordHash } });
};

const ensureSampleContent = async () => {
  const pages = await prisma.page.count();
  if (pages > 0) return;

  const pageTitle = 'Operations Manual';
  const topicTitle = 'Safety Guidelines';
  const subtopicTitle = 'Onboarding';

  await prisma.page.create({
    data: {
      title: pageTitle,
      slug: slugify(pageTitle),
      order: 1,
      topics: {
        create: {
          title: topicTitle,
          slug: slugify(topicTitle),
          order: 1,
          subtopics: {
            create: {
              title: subtopicTitle,
              slug: slugify(subtopicTitle),
              order: 1,
            },
          },
        },
      },
    },
  });
};

const main = async () => {
  await ensureAdmin();
  await ensureSampleContent();
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
