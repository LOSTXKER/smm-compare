import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const email = "saruth05@hotmail.com";
  const password = "!Bestlxk007";
  const name = "Saruth";

  const hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hash, name },
    create: { email, password: hash, name, role: "admin" },
  });

  console.log(`User created/updated: ${user.email} (${user.id})`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
