import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.update({
    where: { email: "saruth05@hotmail.com" },
    data: { role: "admin" },
  });
  console.log(`Updated: ${user.email} -> role: ${user.role}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
