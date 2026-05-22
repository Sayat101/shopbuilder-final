/**
 * Run once to create the SUPER_ADMIN account:
 *   node create-superadmin.js
 *
 * Requires DATABASE_URL in environment (or .env file).
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email    = process.env.SUPERADMIN_EMAIL    || 'superadmin@shopbuilder.kz';
  const password = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin123!';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✅ Super admin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role:          'SUPER_ADMIN',
      tenantId:      'platform',
      emailVerified: true,   // super admin doesn't need email verification
    },
  });

  console.log(`✅ Super admin created!`);
  console.log(`   Email:    ${user.email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Role:     ${user.role}`);
  console.log(`   ID:       ${user.id}`);
  console.log(``);
  console.log(`Now use "SA - Login Super Admin" in Postman to get a token.`);
}

main()
  .catch(err => { console.error('❌ Error:', err.message); process.exit(1); })
  .finally(() => prisma.$disconnect());