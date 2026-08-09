import "dotenv/config";

import { Prisma, PrismaClient, ResourceAudience, ResourceType, UserRole } from "@prisma/client";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { readFileSync } from "node:fs";
import { adoptLayoutV2 } from "../lib/content-layout-v2";
import { createContentDocument } from "../lib/content-document";
import { getR2Config } from "../lib/storage/config-core";

const prisma = new PrismaClient();

export type ContentStudioE2EFixture = {
  bookId: string;
  moduleId: string;
  publisherId: string;
  imageResourceIds: string[];
};

const FIXTURE_SLUG = "e2e-layout-v2-fixture";
const BOOK_TITLE = "[E2E] Layout V2 Test Book";
const CHAPTER_TITLE = "[E2E] Layout V2 Chapter";
const CHAPTER_SLUG = "e2e-layout-v2-chapter";
const MODULE_TITLE = "[E2E] Layout V2 Module";
const IMAGE_TITLES = ["[E2E] Layout V2 Landscape", "[E2E] Layout V2 Portrait"];

function assertFixtureMutationAllowed() {
  if (process.env.E2E_DISPOSABLE_FIXTURE !== "true") {
    throw new Error("Refusing fixture mutation. Set E2E_DISPOSABLE_FIXTURE=true.");
  }

  const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  const productionLike = !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(baseURL);
  if (productionLike && process.env.E2E_ALLOW_PRODUCTION_MUTATION !== "true") {
    throw new Error("Refusing non-local fixture mutation. Set E2E_ALLOW_PRODUCTION_MUTATION=true only for an explicitly disposable environment.");
  }
}

function emptyV2Document(): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(adoptLayoutV2(createContentDocument()))) as Prisma.InputJsonValue;
}

async function ensureImageResource(input: {
  publisherId: string;
  bookId: string;
  chapterId: string;
  moduleId: string;
  title: string;
  filename: string;
  svg: string;
}) {
  const existing = await prisma.resource.findFirst({
    where: { publisherId: input.publisherId, title: input.title },
    select: { id: true, fileUrl: true },
  });
  if (process.env.E2E_STORAGE_ENABLED !== "true") return null;

  const key = `resources/files/${input.publisherId}/e2e-layout-v2/${input.filename}`;
  if (existing?.fileUrl && existing.fileUrl !== key) {
    throw new Error(`Reserved E2E resource title belongs to a different storage key: ${input.title}`);
  }
  const config = getR2Config();
  const client = new S3Client({ region: "auto", endpoint: config.endpoint, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } });
  let exists = true;
  try {
    await client.send(new HeadObjectCommand({ Bucket: config.bucketName, Key: key }));
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status !== 404) throw error;
    exists = false;
  }
  if (!exists) {
    await client.send(new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: new TextEncoder().encode(input.svg),
      ContentType: "image/svg+xml",
      Metadata: { "e2e-fixture": "true" },
    }));
  }

  const data = {
    title: input.title,
    publisherId: input.publisherId,
    description: "Disposable Content Studio Layout V2 browser-test image.",
    subject: "English",
    classLevel: "Class 5",
    bookId: input.bookId,
    chapterId: input.chapterId,
    moduleId: input.moduleId,
    type: ResourceType.IMAGE,
    audience: ResourceAudience.BOTH,
    fileUrl: key,
    originalFileName: input.filename,
    mimeType: "image/svg+xml",
    fileSizeBytes: BigInt(Buffer.byteLength(input.svg)),
    published: true,
    archived: false,
  };

  if (existing) {
    await prisma.resource.update({ where: { id: existing.id }, data });
    return existing.id;
  }

  const created = await prisma.resource.create({ data });
  return created.id;
}

export async function ensureContentStudioFixture(): Promise<ContentStudioE2EFixture> {
  assertFixtureMutationAllowed();

  const adminEmail = process.env.E2E_ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) throw new Error("E2E_ADMIN_EMAIL is required for fixture setup.");

  const admin = await prisma.user.findFirst({
    where: { email: adminEmail, role: UserRole.ADMIN, active: true },
    select: { publisherId: true, publisher: { select: { active: true } } },
  });
  if (!admin?.publisherId || !admin.publisher?.active) {
    throw new Error("E2E_ADMIN_EMAIL must identify an active publisher admin.");
  }

  const [classRecord, subject] = await Promise.all([
    prisma.class.findFirst({ where: { code: "CLASS_5", active: true }, select: { id: true } }),
    prisma.subject.findFirst({ where: { code: "ENGLISH", active: true }, select: { id: true } }),
  ]);
  if (!classRecord || !subject) {
    throw new Error("Fixture prerequisites are missing. Run the existing seed before setup.");
  }

  const existingBook = await prisma.book.findUnique({ where: { slug: FIXTURE_SLUG }, select: { id: true, publisherId: true } });
  if (existingBook && existingBook.publisherId !== admin.publisherId) {
    throw new Error("The reserved E2E fixture slug belongs to another publisher; refusing mutation.");
  }

  const book = existingBook
    ? await prisma.book.update({
        where: { id: existingBook.id },
        data: { title: BOOK_TITLE, publisherId: admin.publisherId, classId: classRecord.id, subjectId: subject.id, published: false, archived: false },
      })
    : await prisma.book.create({
        data: {
          title: BOOK_TITLE,
          slug: FIXTURE_SLUG,
          publisherId: admin.publisherId,
          classId: classRecord.id,
          subjectId: subject.id,
          description: "Reserved disposable browser fixture for Content Studio Layout V2.",
          published: false,
          archived: false,
        },
      });

  const existingChapter = await prisma.bookChapter.findFirst({ where: { bookId: book.id, slug: CHAPTER_SLUG }, select: { id: true } });
  const chapter = existingChapter
    ? await prisma.bookChapter.update({
        where: { id: existingChapter.id },
        data: { title: CHAPTER_TITLE, published: false, archived: false, content: Prisma.JsonNull },
      })
    : await prisma.bookChapter.create({
        data: { bookId: book.id, chapterNumber: 1, title: CHAPTER_TITLE, slug: CHAPTER_SLUG, published: false, archived: false },
      });

  const existingModule = await prisma.bookModule.findFirst({ where: { bookId: book.id, title: MODULE_TITLE }, select: { id: true } });
  const moduleRecord = existingModule
    ? await prisma.bookModule.update({
        where: { id: existingModule.id },
        data: { chapterId: chapter.id, title: MODULE_TITLE, published: false, archived: false, content: emptyV2Document() },
      })
    : await prisma.bookModule.create({
        data: { bookId: book.id, chapterId: chapter.id, title: MODULE_TITLE, published: false, archived: false, content: emptyV2Document() },
      });

  const landscape = readFileSync(new URL("../tests/fixtures/content-studio/e2e-image.svg", import.meta.url), "utf8");
  const portrait = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="160" viewBox="0 0 100 160"><rect width="100" height="160" rx="12" fill="#fef3c7"/><circle cx="50" cy="54" r="26" fill="#d97706"/><path d="M12 142 42 92l20 18 14-12 12 44H12Z" fill="#92400e"/><text x="50" y="24" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#78350f">E2E</text></svg>`;

  const imageResourceIds = (await Promise.all([
    ensureImageResource({ publisherId: admin.publisherId, bookId: book.id, chapterId: chapter.id, moduleId: moduleRecord.id, title: IMAGE_TITLES[0], filename: "landscape.svg", svg: landscape }),
    ensureImageResource({ publisherId: admin.publisherId, bookId: book.id, chapterId: chapter.id, moduleId: moduleRecord.id, title: IMAGE_TITLES[1], filename: "portrait.svg", svg: portrait }),
  ])).filter((id): id is string => Boolean(id));

  return { bookId: book.id, moduleId: moduleRecord.id, publisherId: admin.publisherId, imageResourceIds };
}


async function main() {
  const fixture = await ensureContentStudioFixture();
  console.log(JSON.stringify(fixture, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});