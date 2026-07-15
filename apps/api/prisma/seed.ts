import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

function generateOpaqueToken(): string {
  return randomBytes(32).toString("hex");
}

async function main() {
  const radha = await prisma.attendee.upsert({
    where: { email: "radha@example.com" },
    update: {},
    create: {
      name: "Radha Sharma",
      email: "radha@example.com",
      phone: "+919820000001",
      businessName: "Sharma Textiles",
      qrToken: generateOpaqueToken(),
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Seeded attendee: ${radha.name} <${radha.email}>`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
