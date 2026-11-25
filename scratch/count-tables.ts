import { prisma } from '../server/db';

async function main() {
  const users = await prisma.user.count();
  const regions = await prisma.region.count();
  const stores = await prisma.store.count();
  const categories = await prisma.category.count();
  const brands = await prisma.brand.count();
  const products = await prisma.product.count();
  const inventory = await prisma.inventory.count();
  const recommendations = await prisma.recommendation.count();
  const transfers = await prisma.stockTransfer.count();
  const sales = await prisma.salesTransaction.count();
  const audits = await prisma.auditLog.count();
  console.log('TABLE COUNTS:', { users, regions, stores, categories, brands, products, inventory, recommendations, transfers, sales, audits });
  await prisma.$disconnect();
}

main().catch(console.error);
