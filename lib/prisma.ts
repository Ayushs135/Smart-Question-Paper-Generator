import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

function loadLocalEnv() {
  if (typeof process !== "undefined" && !process.env.DATABASE_URL) {
    try {
      const fs = require("fs");
      const path = require("path");
      const envPath = path.resolve(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, "utf-8").split("\n");
        for (const line of lines) {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            const key = match[1];
            let val = match[2] || "";
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
            if (!process.env[key]) process.env[key] = val.trim();
          }
        }
      }
    } catch {}
  }
}

const prismaClientSingleton = () => {
  loadLocalEnv();
  const connectionUrl = process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  const isRemoteLibsql =
    connectionUrl?.startsWith("libsql://") ||
    connectionUrl?.startsWith("https://") ||
    (Boolean(authToken) && !connectionUrl?.startsWith("file:"));

  // Use libSQL adapter when Turso / remote libSQL connection is configured
  if (isRemoteLibsql && connectionUrl) {
    const libsql = createClient({
      url: connectionUrl,
      authToken: authToken,
    });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter });
  }

  // Default to standard PrismaClient for local file-based SQLite development
  return new PrismaClient();
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined;
} & typeof global;

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}


