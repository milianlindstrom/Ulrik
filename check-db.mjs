import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const count = await prisma.sprint.count();
  console.log(`✅ Sprint table exists with ${count} records`);
} catch (error) {
  console.log(`❌ Sprint table error: ${error.message}`);
  if (error.message.includes('does not exist')) {
    console.log('Need to push schema...');
    process.exit(1);
  }
} finally {
  await prisma.$disconnect();
}
