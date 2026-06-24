import express, { NextFunction, Request, Response } from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { Collection, MongoClient } from "mongodb";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const LEGACY_DB_FILE = path.join(process.cwd(), "db.json");
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "vote_starmoon_accounting";
const ADMIN_TOKEN = "admin-session-secure-token";
const SETTINGS_ID = "app-settings";

app.use(express.json());

type CandidateType = "star" | "moon";

interface CandidateRecord {
  id: string;
  name: string;
  number: number;
  type: CandidateType;
  bio: string;
  imageUrl: string;
  votesCount: number;
}

interface VoteRecord {
  studentId: string;
  studentIdNormalized: string;
  starId: string;
  moonId: string;
  timestamp: string;
}

interface SettingsRecord {
  _id: string;
  adminPasswordHash: string;
}

interface LegacyDatabaseSchema {
  candidates?: CandidateRecord[];
  votes?: Array<{
    studentId: string;
    starId: string;
    moonId: string;
    timestamp: string;
  }>;
  adminPasswordHash?: string;
}

interface DatabaseCollections {
  client: MongoClient;
  candidates: Collection<CandidateRecord>;
  votes: Collection<VoteRecord>;
  settings: Collection<SettingsRecord>;
}

const DEFAULT_CANDIDATES: CandidateRecord[] = [
  {
    id: "star-1",
    name: "AccG01 น.ส. วรรณิษา เจริญยิ่ง",
    number: 1,
    type: "star",
    bio: "ผู้เข้าประกวดดาวบัญชี หมายเลข AccG01 ยิ้มสดใส มั่นใจ เต็มเปี่ยมไปด้วยพลังงานบวก 🌟",
    imageUrl: "👸",
    votesCount: 0,
  },
  {
    id: "star-2",
    name: "AccG02 น.ส. อรนิภา ศรีชัย",
    number: 2,
    type: "star",
    bio: "ผู้เข้าประกวดดาวบัญชี หมายเลข AccG02 นอบน้อม อารมณ์ดี เรียบร้อย รักการบริการ ✨",
    imageUrl: "💖",
    votesCount: 0,
  },
  {
    id: "star-3",
    name: "AccG03 นางสาวเพชรา กอศิริวลานนท์ (หนูดี)",
    number: 3,
    type: "star",
    bio: "ผู้เข้าประกวดดาวบัญชี หมายเลข AccG03 สวยเก่ง เรียนเด่น ร่าเริง มีน้ำใจเป็นเลิศ ⭐",
    imageUrl: "💎",
    votesCount: 0,
  },
  {
    id: "moon-1",
    name: "AccB01 นายธีรพงษ์ วงดาลา",
    number: 1,
    type: "moon",
    bio: "ผู้เข้าประกวดเดือนบัญชี หมายเลข AccB01 บุคลิกภาพดีเด่น ขยันขันแข็ง อารมณ์ดี 🤴",
    imageUrl: "🤵",
    votesCount: 0,
  },
  {
    id: "moon-2",
    name: "AccB02 นางสาวรัญชรินทร์ ขุนทดเรืองโรจน์ (รัญ)",
    number: 2,
    type: "moon",
    bio: "ผู้เข้าประกวดเดือนบัญชี หมายเลข AccB02 ทัศนคติเชิงบวก อัธยาศัยดี มีความเป็นผู้นำ 🍀",
    imageUrl: "☘️",
    votesCount: 0,
  },
  {
    id: "moon-3",
    name: "AccB03 นายนพเก้า ดวงแก้ว",
    number: 3,
    type: "moon",
    bio: "ผู้เข้าประกวดเดือนบัญชี หมายเลข AccB03 มาดอบอุ่น บุคลิกภาพเท่ สุภาพ และมีวินัย ⚡",
    imageUrl: "🪐",
    votesCount: 0,
  },
];

let collectionsPromise: Promise<DatabaseCollections> | null = null;

function normalizeStudentId(studentId: string) {
  return studentId.trim().toLowerCase();
}

function sortCandidates(candidates: CandidateRecord[]) {
  const typeOrder: Record<CandidateType, number> = { star: 0, moon: 1 };
  return [...candidates].sort((left, right) => {
    const typeDiff = typeOrder[left.type] - typeOrder[right.type];
    if (typeDiff !== 0) {
      return typeDiff;
    }
    return left.number - right.number;
  });
}

function hasOldPlaceholderCandidates(candidates: CandidateRecord[]) {
  return candidates.some(
    (candidate) =>
      candidate.name.includes("ศิริพร") ||
      candidate.name.includes("พิมพ์มาดา") ||
      candidate.name.includes("ชลธิชา") ||
      (candidate.id === "star-1" && !candidate.name.includes("AccG01"))
  );
}

function readLegacyDB(): LegacyDatabaseSchema | null {
  try {
    if (!fs.existsSync(LEGACY_DB_FILE)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(LEGACY_DB_FILE, "utf-8")) as LegacyDatabaseSchema;
  } catch (error) {
    console.error("Failed to read legacy db.json for migration:", error);
    return null;
  }
}

function getSeedDataFromLegacy() {
  const legacy = readLegacyDB();
  const legacyCandidates = legacy?.candidates ?? [];
  const useDefaults = legacyCandidates.length === 0 || hasOldPlaceholderCandidates(legacyCandidates);

  return {
    candidates: useDefaults ? DEFAULT_CANDIDATES : legacyCandidates,
    votes: useDefaults ? [] : legacy?.votes ?? [],
    adminPasswordHash: legacy?.adminPasswordHash?.trim() || "admin123",
  };
}

function toVoteRecord(vote: { studentId: string; starId: string; moonId: string; timestamp: string }): VoteRecord {
  return {
    studentId: vote.studentId.trim(),
    studentIdNormalized: normalizeStudentId(vote.studentId),
    starId: vote.starId,
    moonId: vote.moonId,
    timestamp: vote.timestamp,
  };
}

function stripVoteNormalization(vote: VoteRecord) {
  return {
    studentId: vote.studentId,
    starId: vote.starId,
    moonId: vote.moonId,
    timestamp: vote.timestamp,
  };
}

async function recalculateVotesCount(collections: DatabaseCollections) {
  const [candidates, votes] = await Promise.all([
    collections.candidates.find({}, { projection: { _id: 0 } }).toArray(),
    collections.votes.find({}, { projection: { _id: 0 } }).toArray(),
  ]);

  if (candidates.length === 0) {
    return;
  }

  const counts = new Map<string, number>();
  for (const vote of votes) {
    counts.set(vote.starId, (counts.get(vote.starId) || 0) + 1);
    counts.set(vote.moonId, (counts.get(vote.moonId) || 0) + 1);
  }

  await collections.candidates.bulkWrite(
    candidates.map((candidate) => ({
      updateOne: {
        filter: { id: candidate.id },
        update: { $set: { votesCount: counts.get(candidate.id) || 0 } },
      },
    }))
  );
}

async function ensureSeedData(collections: DatabaseCollections) {
  await Promise.all([
    collections.candidates.createIndex({ id: 1 }, { unique: true }),
    collections.votes.createIndex({ studentIdNormalized: 1 }, { unique: true }),
  ]);

  const [candidateCount, settings] = await Promise.all([
    collections.candidates.countDocuments(),
    collections.settings.findOne({ _id: SETTINGS_ID }),
  ]);

  const seedData = getSeedDataFromLegacy();

  if (!settings) {
    await collections.settings.insertOne({
      _id: SETTINGS_ID,
      adminPasswordHash: seedData.adminPasswordHash,
    });
  }

  if (candidateCount === 0) {
    await collections.candidates.insertMany(seedData.candidates.map((candidate) => ({ ...candidate })));

    if (seedData.votes.length > 0) {
      await collections.votes.insertMany(seedData.votes.map(toVoteRecord), { ordered: false });
    }
  }

  await recalculateVotesCount(collections);
}

async function getCollections() {
  if (!collectionsPromise) {
    collectionsPromise = (async () => {
      if (!MONGODB_URI) {
        throw new Error("Missing MONGODB_URI. Set it in your environment before starting the server.");
      }

      const client = new MongoClient(MONGODB_URI);
      await client.connect();

      const database = client.db(MONGODB_DB_NAME);
      const collections: DatabaseCollections = {
        client,
        candidates: database.collection<CandidateRecord>("candidates"),
        votes: database.collection<VoteRecord>("votes"),
        settings: database.collection<SettingsRecord>("settings"),
      };

      await ensureSeedData(collections);
      return collections;
    })().catch((error) => {
      collectionsPromise = null;
      throw formatMongoError(error);
    });
  }

  return collectionsPromise;
}

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: number }).code === 11000;
}

function formatMongoError(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const mongoError = error as { code?: number };
    if (mongoError.code === 8000) {
      return new Error(
        "MongoDB authentication failed. Verify MONGODB_URI, Atlas Database Access username/password, and that the user is allowed to access this cluster."
      );
    }
  }

  return error;
}

function isAdminAuthorized(req: Request) {
  return req.headers.authorization === `Bearer ${ADMIN_TOKEN}`;
}

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };
}

app.get(
  "/api/candidates",
  asyncHandler(async (_req, res) => {
    const { candidates } = await getCollections();
    const allCandidates = await candidates.find({}, { projection: { _id: 0 } }).toArray();
    res.json({ candidates: sortCandidates(allCandidates) });
  })
);

app.post(
  "/api/check-status",
  asyncHandler(async (req, res) => {
    const { studentId } = req.body;
    if (!studentId || typeof studentId !== "string") {
      res.status(400).json({ error: "กรุณาระบุรหัสนักศึกษาที่ถูกต้อง" });
      return;
    }

    const { votes } = await getCollections();
    const existingVote = await votes.findOne(
      { studentIdNormalized: normalizeStudentId(studentId) },
      { projection: { _id: 0 } }
    );

    res.json({
      hasVoted: !!existingVote,
      voteDetails: existingVote ? { starId: existingVote.starId, moonId: existingVote.moonId } : null,
    });
  })
);

app.post(
  "/api/vote",
  asyncHandler(async (req, res) => {
    const { studentId, starId, moonId } = req.body;

    if (!studentId || typeof studentId !== "string" || studentId.trim().length < 5) {
      res.status(400).json({ error: "รหัสนักศึกษาไม่ถูกต้อง" });
      return;
    }

    if (!starId || !moonId) {
      res.status(400).json({ error: "กรุณาเลือกทั้งดาวและเดือนเพื่อสิทธิ์การโหวตที่สมบูรณ์" });
      return;
    }

    const collections = await getCollections();
    const cleanStudentId = studentId.trim();
    const normalizedStudentId = normalizeStudentId(cleanStudentId);

    const [starCandidate, moonCandidate] = await Promise.all([
      collections.candidates.findOne({ id: starId, type: "star" }, { projection: { _id: 0 } }),
      collections.candidates.findOne({ id: moonId, type: "moon" }, { projection: { _id: 0 } }),
    ]);

    if (!starCandidate || !moonCandidate) {
      res.status(400).json({ error: "ข้อมูลผู้สมัครดาวหรือเดือนที่เลือกไม่ถูกต้อง" });
      return;
    }

    const newVote: VoteRecord = {
      studentId: cleanStudentId,
      studentIdNormalized: normalizedStudentId,
      starId,
      moonId,
      timestamp: new Date().toISOString(),
    };

    try {
      await collections.votes.insertOne(newVote);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        res.status(400).json({ error: "รหัสนักศึกษานี้ได้ใช้สิทธิ์โหวตไปแล้ว ไม่สามารถโหวตซ้ำได้" });
        return;
      }
      throw error;
    }

    await recalculateVotesCount(collections);

    res.json({
      success: true,
      message: "บันทึกคะแนนโหวตของคุณเรียบร้อยแล้ว! ขอบคุณที่ร่วมกิจกรรม",
      vote: stripVoteNormalization(newVote),
    });
  })
);

app.get(
  "/api/stats",
  asyncHandler(async (_req, res) => {
    const { candidates, votes } = await getCollections();
    const [allCandidates, totalVotes] = await Promise.all([
      candidates.find({}, { projection: { _id: 0 } }).toArray(),
      votes.countDocuments(),
    ]);

    res.json({
      totalVotes,
      candidates: sortCandidates(allCandidates).map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        number: candidate.number,
        type: candidate.type,
        imageUrl: candidate.imageUrl,
        votesCount: candidate.votesCount,
        percentage: totalVotes > 0 ? Math.round((candidate.votesCount / totalVotes) * 100) : 0,
      })),
    });
  })
);

app.post(
  "/api/admin/login",
  asyncHandler(async (req, res) => {
    const { password } = req.body;
    const { settings } = await getCollections();
    const appSettings = await settings.findOne({ _id: SETTINGS_ID }, { projection: { _id: 0 } });

    if (password === appSettings?.adminPasswordHash) {
      res.json({ success: true, token: ADMIN_TOKEN });
      return;
    }

    res.status(401).json({ error: "รหัสผ่านแอดมินไม่ถูกต้อง" });
  })
);

app.get(
  "/api/admin/votes",
  asyncHandler(async (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(403).json({ error: "ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้" });
      return;
    }

    const { votes } = await getCollections();
    const auditVotes = await votes.find({}, { projection: { _id: 0, studentIdNormalized: 0 } }).toArray();
    res.json({ votes: auditVotes });
  })
);

app.post(
  "/api/admin/candidates",
  asyncHandler(async (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(403).json({ error: "ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้" });
      return;
    }

    const { name, number, type, bio, imageUrl } = req.body;
    if (!name || !number || !type || !imageUrl) {
      res.status(400).json({ error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน" });
      return;
    }

    if (type !== "star" && type !== "moon") {
      res.status(400).json({ error: "ประเภทผู้สมัครไม่ถูกต้อง" });
      return;
    }

    const { candidates } = await getCollections();
    const newCandidate: CandidateRecord = {
      id: `${type}-${Date.now()}`,
      name: String(name).trim(),
      number: Number(number),
      type,
      bio: bio ? String(bio) : "",
      imageUrl: String(imageUrl).trim(),
      votesCount: 0,
    };

    await candidates.insertOne(newCandidate);
    res.json({ success: true, candidate: newCandidate });
  })
);

app.put(
  "/api/admin/candidates/:id",
  asyncHandler(async (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(403).json({ error: "ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้" });
      return;
    }

    const { id } = req.params;
    const { name, number, bio, imageUrl } = req.body;
    const { candidates } = await getCollections();

    const existingCandidate = await candidates.findOne({ id }, { projection: { _id: 0 } });
    if (!existingCandidate) {
      res.status(404).json({ error: "ไม่พบข้อมูลผู้ประกวดที่ต้องการแก้ไข" });
      return;
    }

    const updatedCandidate: CandidateRecord = {
      ...existingCandidate,
      name: name !== undefined ? String(name) : existingCandidate.name,
      number: number !== undefined ? Number(number) : existingCandidate.number,
      bio: bio !== undefined ? String(bio) : existingCandidate.bio,
      imageUrl: imageUrl !== undefined ? String(imageUrl) : existingCandidate.imageUrl,
    };

    await candidates.updateOne({ id }, { $set: updatedCandidate });
    res.json({ success: true, candidate: updatedCandidate });
  })
);

app.delete(
  "/api/admin/candidates/:id",
  asyncHandler(async (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(403).json({ error: "ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้" });
      return;
    }

    const { id } = req.params;
    const collections = await getCollections();
    const deleteResult = await collections.candidates.deleteOne({ id });

    if (deleteResult.deletedCount === 0) {
      res.status(404).json({ error: "ไม่พบผู้ประกวดที่ต้องการลบ" });
      return;
    }

    await collections.votes.deleteMany({ $or: [{ starId: id }, { moonId: id }] });
    await recalculateVotesCount(collections);

    res.json({ success: true, message: "ลบผู้เข้าประกวดเรียบร้อยแล้ว" });
  })
);

app.post(
  "/api/admin/reset",
  asyncHandler(async (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(403).json({ error: "ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้" });
      return;
    }

    const { votes, candidates } = await getCollections();
    await Promise.all([
      votes.deleteMany({}),
      candidates.updateMany({}, { $set: { votesCount: 0 } }),
    ]);

    res.json({ success: true, message: "รีเซ็ตคะแนนโหวตและผู้ใช้สิทธิ์ทั้งหมดเรียบร้อยแล้ว" });
  })
);

app.delete(
  "/api/admin/votes/:studentId",
  asyncHandler(async (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(403).json({ error: "ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้" });
      return;
    }

    const { studentId } = req.params;
    const collections = await getCollections();
    const deleteResult = await collections.votes.deleteOne({ studentIdNormalized: normalizeStudentId(studentId) });

    if (deleteResult.deletedCount === 0) {
      res.status(404).json({ error: "ไม่พบข้อมูลการโหวตของรหัสนักศึกษานี้" });
      return;
    }

    await recalculateVotesCount(collections);
    res.json({ success: true, message: `ยกเลิกผลโหวตของรหัส ${studentId} เรียบร้อยแล้ว` });
  })
);

app.post(
  "/api/admin/change-password",
  asyncHandler(async (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(403).json({ error: "ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้" });
      return;
    }

    const { newPassword } = req.body;
    if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 4) {
      res.status(400).json({ error: "กรุณาระบุรหัสผ่านใหม่ที่มีความยาวอย่างน้อย 4 ตัวอักษร" });
      return;
    }

    const { settings } = await getCollections();
    await settings.updateOne(
      { _id: SETTINGS_ID },
      { $set: { adminPasswordHash: newPassword.trim() } },
      { upsert: true }
    );

    res.json({ success: true, message: "เปลี่ยนรหัสผ่านแอดมินสำเร็จ" });
  })
);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Server error:", formatMongoError(error));
  res.status(500).json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
});

async function startServer() {
  await getCollections();

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;

if (!process.env.VERCEL) {
  startServer().catch((error) => {
    console.error("Failed to start server:", formatMongoError(error));
    process.exit(1);
  });
}