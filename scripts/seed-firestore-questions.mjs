import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import admin from "firebase-admin";
import { z } from "zod";

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

// ---- schema validation (human-editable JSON -> strict docs) ----

const TranslatableTextSchema = z
  .record(z.string(), z.string())
  .refine((v) => typeof v.en === "string" && v.en.length > 0, {
    message: "questionText must include a non-empty 'en'",
  });

const DifficultySchema = z.enum(["easy", "medium", "hard"]);
const ConceptIdSchema = z.string().min(1);

const MCQSchema = z.object({
  id: z.string().min(1),
  type: z.literal("mcq"),
  conceptId: ConceptIdSchema,
  difficulty: DifficultySchema,
  questionText: TranslatableTextSchema,
  options: z.object({
    en: z.array(z.string().min(1)).min(2),
    ro: z.array(z.string().min(1)).optional(),
  }),
  correctIndex: z.number().int().min(0),
});

const NumericSchema = z.object({
  id: z.string().min(1),
  type: z.literal("numeric"),
  conceptId: ConceptIdSchema,
  difficulty: DifficultySchema,
  questionText: TranslatableTextSchema,
  numeric: z.object({
    correctAnswer: z.number(),
    tolerance: z.number().optional(),
  }),
});

const QuestionSchema = z.discriminatedUnion("type", [MCQSchema, NumericSchema]);

const SeedFileSchema = z.object({
  version: z.number().int().positive().optional(),
  questions: z.array(QuestionSchema).min(1),
});

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}

async function main() {
  const seedPath = path.resolve(process.cwd(), "seed", "questions.v1.json");
  const raw = fs.readFileSync(seedPath, "utf-8");
  const parsed = JSON.parse(raw);

  const seed = SeedFileSchema.parse(parsed);

  // quick duplicate id check
  const ids = seed.questions.map((q) => q.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) {
    throw new Error(`Duplicate question ids in seed file: ${[...new Set(dupes)].join(", ")}`);
  }

  console.log(`Loaded ${seed.questions.length} questions from ${seedPath}`);
  if (DRY_RUN) console.log("DRY RUN enabled: no writes will be performed.");

  const col = db.collection("questions");

  const batches = chunk(seed.questions, 450);
  for (let bi = 0; bi < batches.length; bi++) {
    const batch = db.batch();

    for (const q of batches[bi]) {
      const ref = col.doc(q.id);

      // Build Firestore doc (simple + editable)
      const doc = {
        type: q.type,
        conceptId: q.conceptId,
        difficulty: q.difficulty,
        questionText: q.questionText,

        ...(q.type === "mcq"
          ? {
              options: q.options,
              correctIndex: q.correctIndex,
            }
          : {
              numeric: q.numeric,
            }),

        version: seed.version ?? 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // merge=true makes the script idempotent (safe to rerun)
      batch.set(ref, doc, { merge: true });
    }

    console.log(`Batch ${bi + 1}/${batches.length}: ${batches[bi].length} docs`);
    if (!DRY_RUN) {
      await batch.commit();
    }
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});