import { randomUUID } from "crypto";
import { env } from "#config/env.js";
import { connectDB, sequelize } from "#config/sequelize.js";
import { Comparison, Pin, User, type Developer } from "#database/models/index.js";
import { repoRepository } from "#repository/repo.repository.js";
import { comparisonRepository } from "#repository/comparison.repository.js";
import { ensureDeveloper } from "#service/developerSync.service.js";
import { enrichmentService } from "#service/enrichment.service.js";
import { hashPassword } from "#utils/hash.js";

// Needs network access to GitHub; a GITHUB_TOKEN in .env.development avoids the 60 requests/hour cap.
const EMAIL = "demo@stackpulse.dev";
const PASSWORD = "stackpulse-demo";
const DEVELOPERS = ["octocat", "gaearon", "sindresorhus"];

await connectDB();
if (env.NODE_ENV === "production") throw new Error("Refusing to seed a production database");

const [user] = await User.findOrCreate({
  where: { email: EMAIL },
  defaults: { id: randomUUID(), email: EMAIL, passwordHash: await hashPassword(PASSWORD) },
});

const synced: Developer[] = [];
for (const username of DEVELOPERS) synced.push((await ensureDeveloper(username)).developer);
await enrichmentService.idle();

for (const developer of synced) {
  const [top] = await repoRepository.top(developer.id, { includeForks: false }, 1);
  if (top) {
    await Pin.findOrCreate({
      where: { userId: user.id, repoId: top.id },
      defaults: { userId: user.id, repoId: top.id, note: `Top repo of ${developer.githubUsername}`, tags: ["demo"] },
    });
  }
}

if (!(await comparisonRepository.findByName(user.id, "Open source heroes"))) {
  await sequelize.transaction(async (transaction) => {
    const comparison = await Comparison.create({ userId: user.id, name: "Open source heroes" }, { transaction });
    await comparisonRepository.setMembers(
      comparison.id,
      synced.map((developer) => developer.id),
      transaction,
    );
  });
}

console.log(`Seeded. Log in with ${EMAIL} / ${PASSWORD}`);
await sequelize.close();
