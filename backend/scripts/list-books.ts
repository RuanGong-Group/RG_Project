import prisma from '../src/utils/prisma';

async function listBooks() {
  const books = await prisma.bookTag.findMany();
  console.log('词书列表:');
  books.forEach(b => console.log(`- ${b.tagName} (ID: ${b.id})`));
  await prisma.$disconnect();
}

listBooks();
