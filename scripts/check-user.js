const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.user.findMany({
  select: { email: true, githubUsername: true, name: true }
})
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .finally(() => prisma.$disconnect());