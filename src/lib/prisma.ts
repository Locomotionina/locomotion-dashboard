import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaClient(): PrismaClient {
  let dbUrl = process.env.DATABASE_URL;

  // On Vercel / serverless deployments, copy SQLite file to /tmp so writes succeed
  if (process.env.VERCEL) {
    const sourceDb = path.join(process.cwd(), "prisma", "dev.db");
    const targetDb = path.join("/tmp", "dev.db");

    try {
      if (!fs.existsSync(targetDb) && fs.existsSync(sourceDb)) {
        fs.copyFileSync(sourceDb, targetDb);
        console.log("Successfully copied SQLite database to /tmp/dev.db for Vercel writable execution.");
      }
      dbUrl = "file:/tmp/dev.db";
    } catch (e) {
      console.error("Vercel DB setup error:", e);
    }
  }

  return new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? getPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
