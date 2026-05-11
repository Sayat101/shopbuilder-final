const { prisma } = require('../config/database');
const { ConflictError } = require('../errors/AppError');

async function createTenant({ subdomain, plan }) {
  // Check subdomain uniqueness
  const existing = await prisma.tenant.findUnique({ where: { subdomain } });
  if (existing) throw new ConflictError('Subdomain already taken');

  const schemaName = `tenant_${subdomain.replace(/[^a-z0-9]/g, '_')}`;

  const tenant = await prisma.tenant.create({
    data: {
      subdomain,
      schemaName,
      plan: plan || 'BASIC',
      status: 'ACTIVE',
    },
  });

  // Create default warehouse location for this tenant
  await prisma.warehouseLocation.create({
    data: {
      name: 'Main Warehouse',
      city: 'Almaty',
      tenantId: tenant.id,
    },
  });

  return tenant;
}

async function listTenants({ cursor, limit = 20 }) {
  const take = limit + 1;
  const args = { take, orderBy: { createdAt: 'desc' } };
  if (cursor) {
    args.cursor = { id: cursor };
    args.skip = 1;
  }

  const tenants = await prisma.tenant.findMany(args);
  const hasMore = tenants.length > limit;
  const data = hasMore ? tenants.slice(0, limit) : tenants;

  return {
    data,
    meta: { nextCursor: hasMore ? data[data.length - 1].id : null, hasMore },
  };
}

async function getTenant(id) {
  return prisma.tenant.findUniqueOrThrow({ where: { id } });
}

module.exports = { createTenant, listTenants, getTenant };
