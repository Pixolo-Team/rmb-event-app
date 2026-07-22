// One-off: populate the single Event row with the flyer's agenda, chair, and
// registration details. Safe to re-run (updates the existing row in place).
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const agenda = [
  {
    startTime: "09:30",
    endTime: "11:00",
    title: "Chapter Leaders Training",
    note: "Mandatory for President, Secretary and Treasurer and Past Chairmans or Presidents",
  },
  { startTime: "11:00", endTime: "11:30", title: "Tea Break and Kit Distribution" },
  { startTime: "11:30", endTime: "13:30", title: "Installation and Introduction of Members" },
  { startTime: "13:30", endTime: "14:30", title: "Lunch Break" },
  { startTime: "14:30", endTime: "17:30", title: "Round Table Session, Referrals and High Tea" },
];

async function main() {
  const event = await prisma.event.findFirst();
  if (!event) {
    throw new Error("No Event row found");
  }
  const updated = await prisma.event.update({
    where: { id: event.id },
    data: {
      subtitle: "Cross Chapter Meeting",
      chairName: "Rtn. Arvind Batra",
      chairTitle: "Chairperson RMBF",
      registrationPricing: "Early Bird ₹3000/- (till 30th Jun 2026)",
      agenda,
    },
  });
  console.log("Updated event:", updated.name);
  console.log("Agenda items:", agenda.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
