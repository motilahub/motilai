import { cookies } from "next/headers";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { Pool, type PoolClient } from "pg";

export type UserRole = "admin" | "user";
export type UserType = "user" | "staff" | "customer" | "service";
export type User = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  phone: string;
  avatarUrl: string;
  userType: UserType;
  passwordHash: string;
  role: UserRole;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
};

const SESSION_COOKIE = "motilai_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const SYSTEM_ADMIN_USERNAME = "admin";
const SYSTEM_ADMIN_EMAIL = "admin@motilai.local";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let databaseReady: Promise<void> | undefined;

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    username: String(row.username),
    email: String(row.email),
    displayName: String(row.display_name ?? ""),
    phone: String(row.phone ?? ""),
    avatarUrl: String(row.avatar_url ?? ""),
    userType: (row.user_type ?? "user") as UserType,
    passwordHash: String(row.password_hash),
    role: row.role as UserRole,
    disabled: Boolean(row.disabled),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at ?? row.created_at)).toISOString(),
  };
}

export async function initDatabase() {
  if (!databaseReady) {
    databaseReady = initializeDatabase().catch((error) => {
      // A transient database/DNS failure must not poison all later requests.
      databaseReady = undefined;
      throw error;
    });
  }
  return databaseReady;
}

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('motilai:database-init'))");
    await client.query(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', avatar_url TEXT NOT NULL DEFAULT '', user_type TEXT NOT NULL DEFAULT 'user' CHECK (user_type IN ('user', 'staff', 'customer', 'service')), password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')), disabled BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT ''");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT ''");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT ''");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type TEXT NOT NULL DEFAULT 'user'");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
    await client.query("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check");
    await client.query("ALTER TABLE users ADD CONSTRAINT users_user_type_check CHECK (user_type IN ('user', 'staff', 'customer', 'service'))");
    await client.query(`CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL)`);
    await client.query(`CREATE TABLE IF NOT EXISTS model_providers (id TEXT PRIMARY KEY, name TEXT NOT NULL, provider_type TEXT NOT NULL DEFAULT 'custom', base_url TEXT NOT NULL, api_key TEXT NOT NULL DEFAULT '', model TEXT NOT NULL, enabled BOOLEAN NOT NULL DEFAULT FALSE, models JSONB NOT NULL DEFAULT '[]'::jsonb, settings JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await client.query("ALTER TABLE model_providers ADD COLUMN IF NOT EXISTS provider_type TEXT NOT NULL DEFAULT 'custom'");
    await client.query("ALTER TABLE model_providers ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb");
    await client.query(`CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '', updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await client.query(`CREATE TABLE IF NOT EXISTS assistant_resources (id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('agent', 'knowledge', 'tool')), name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', enabled BOOLEAN NOT NULL DEFAULT TRUE, config JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await client.query(`INSERT INTO users (id, username, email, display_name, user_type, password_hash, role, disabled) VALUES ('system-admin', $1, $2, '系统管理员', 'staff', $3, 'admin', FALSE) ON CONFLICT (username) DO UPDATE SET role = 'admin', disabled = FALSE, user_type = 'staff'`, [SYSTEM_ADMIN_USERNAME, SYSTEM_ADMIN_EMAIL, hashPassword("admin")]);
    await client.query(`INSERT INTO assistant_resources (id, kind, name, description, config) VALUES ('general', 'agent', '通用助手', '日常问答、分析与写作', '{"prompt":"你是一个准确、直接且结构清晰的通用助手。"}'::jsonb), ('analyst', 'agent', '数据分析师', '数据解读、指标与结论', '{"prompt":"你是一名数据分析师，请基于数据给出清晰的指标解读和结论。"}'::jsonb), ('workspace', 'knowledge', '项目知识库', '检索当前项目资料', '{"content":""}'::jsonb), ('web-search', 'tool', '联网搜索', '获取最新公开信息', '{"parameters":{},"endpoint":""}'::jsonb) ON CONFLICT (id) DO NOTHING`);
    await importLegacyUsers(client);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

async function importLegacyUsers(client: PoolClient) {
  const legacyFile = process.env.MOTILAI_LEGACY_USERS_FILE;
  if (!legacyFile) return;
  try {
    const users = JSON.parse(readFileSync(legacyFile, "utf8")) as User[];
    for (const user of users) {
      await client.query(`INSERT INTO users (id, username, email, display_name, phone, avatar_url, user_type, password_hash, role, disabled, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11) ON CONFLICT (username) DO NOTHING`, [user.id, user.username, user.email, user.displayName ?? "", user.phone ?? "", user.avatarUrl ?? "", user.userType ?? "user", user.passwordHash, user.username === SYSTEM_ADMIN_USERNAME ? "admin" : user.role, user.username === SYSTEM_ADMIN_USERNAME ? false : user.disabled, user.createdAt]);
    }
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
}

export function publicUser(user: User) {
  const safeUser = { ...user } as Omit<User, "passwordHash"> & { passwordHash?: string };
  delete safeUser.passwordHash;
  return safeUser;
}
function normalizeUsername(username: string) { return username.trim().toLowerCase(); }
function normalizeEmail(email: string) { return email.trim().toLowerCase(); }
export function hashPassword(password: string) { const salt = randomBytes(16).toString("hex"); return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`; }
function verifyPassword(password: string, stored: string) { const [salt, expectedHex] = stored.split(":"); if (!salt || !expectedHex) return false; const actual = scryptSync(password, salt, 64); const expected = Buffer.from(expectedHex, "hex"); return expected.length === actual.length && timingSafeEqual(actual, expected); }

export async function createUser(input: { username: string; email: string; password: string; displayName?: string; phone?: string; avatarUrl?: string; userType?: UserType; role?: UserRole; disabled?: boolean }) {
  await initDatabase();
  const username = normalizeUsername(input.username); const email = normalizeEmail(input.email);
  if (!/^[a-z0-9_\-]{3,24}$/.test(username)) throw new Error("用户名需为 3-24 位字母、数字、下划线或短横线");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("请输入有效的邮箱地址");
  if (input.password.length < 8) throw new Error("密码至少需要 8 位");
  const userType = input.userType ?? "user";
  if (!["user", "staff", "customer", "service"].includes(userType)) throw new Error("无效的用户类型");
  try { const result = await pool.query(`INSERT INTO users (id, username, email, display_name, phone, avatar_url, user_type, password_hash, role, disabled) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`, [randomUUID(), username, email, input.displayName?.trim() ?? "", input.phone?.trim() ?? "", input.avatarUrl?.trim() ?? "", userType, hashPassword(input.password), input.role ?? "user", input.disabled ?? false]); return rowToUser(result.rows[0]); }
  catch (error) { if ((error as { code?: string }).code === "23505") throw new Error("用户名或邮箱已存在"); throw error; }
}

export async function authenticate(identifier: string, password: string) { await initDatabase(); const normalized = identifier.trim().toLowerCase(); const result = await pool.query("SELECT * FROM users WHERE username = $1 OR email = $1 LIMIT 1", [normalized]); if (!result.rows[0]) return null; const user = rowToUser(result.rows[0]); return !user.disabled && verifyPassword(password, user.passwordHash) ? user : null; }
export async function createSession(userId: string) { await initDatabase(); const token = randomBytes(32).toString("base64url"); await pool.query("INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')", [token, userId]); return { token, maxAge: SESSION_MAX_AGE }; }
export async function deleteSession(token: string | undefined) { if (!token) return; await initDatabase(); await pool.query("DELETE FROM sessions WHERE token = $1", [token]); }
export async function getUserById(id: string) { await initDatabase(); const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]); return result.rows[0] ? rowToUser(result.rows[0]) : null; }
export async function getCurrentUser() { await initDatabase(); const token = (await cookies()).get(SESSION_COOKIE)?.value; if (!token) return null; const result = await pool.query(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1 AND s.expires_at > NOW() AND u.disabled = FALSE`, [token]); if (!result.rows[0]) { await deleteSession(token); return null; } return rowToUser(result.rows[0]); }
export function sessionCookie(token: string, maxAge = SESSION_MAX_AGE) { return { name: SESSION_COOKIE, value: token, httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge }; }
export function clearSessionCookie() { return { ...sessionCookie("", 0), expires: new Date(0) }; }
export async function listUsers() { await initDatabase(); const result = await pool.query("SELECT * FROM users ORDER BY created_at DESC"); return result.rows.map(rowToUser); }
export async function updateUser(id: string, update: { username?: string; email?: string; displayName?: string; phone?: string; avatarUrl?: string; userType?: UserType; role?: UserRole; disabled?: boolean }) {
  await initDatabase();
  const current = await getUserById(id);
  if (!current) return null;
  const username = update.username === undefined ? current.username : normalizeUsername(update.username);
  const email = update.email === undefined ? current.email : normalizeEmail(update.email);
  if (!/^[a-z0-9_\-]{3,24}$/.test(username)) throw new Error("用户名需为 3-24 位字母、数字、下划线或短横线");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("请输入有效的邮箱地址");
  const userType = update.userType ?? current.userType;
  if (!["user", "staff", "customer", "service"].includes(userType)) throw new Error("无效的用户类型");
  const protectedAccount = current.id === "system-admin" || current.username === SYSTEM_ADMIN_USERNAME;
  const result = await pool.query("UPDATE users SET username = $2, email = $3, display_name = $4, phone = $5, avatar_url = $6, user_type = $7, role = $8, disabled = $9, updated_at = NOW() WHERE id = $1 RETURNING *", [id, username, email, update.displayName?.trim() ?? current.displayName, update.phone?.trim() ?? current.phone, update.avatarUrl?.trim() ?? current.avatarUrl, protectedAccount ? "staff" : userType, protectedAccount ? "admin" : update.role ?? current.role, protectedAccount ? false : update.disabled ?? current.disabled]);
  return result.rows[0] ? rowToUser(result.rows[0]) : null;
}

export async function deleteUser(id: string) {
  await initDatabase();
  const current = await getUserById(id);
  if (!current) return false;
  if (current.id === "system-admin" || current.username === SYSTEM_ADMIN_USERNAME) throw new Error("系统管理员不可删除");
  await pool.query("DELETE FROM users WHERE id = $1", [id]);
  return true;
}

export async function setUserPassword(id: string, password: string) {
  await initDatabase();
  if (password.length < 8) throw new Error("密码至少需要 8 位");
  const result = await pool.query("UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1 RETURNING *", [id, hashPassword(password)]);
  return result.rows[0] ? rowToUser(result.rows[0]) : null;
}

export async function changeUserPassword(id: string, currentPassword: string, newPassword: string) {
  const user = await getUserById(id);
  if (!user || !verifyPassword(currentPassword, user.passwordHash)) throw new Error("当前密码错误");
  return setUserPassword(id, newPassword);
}

export async function databaseQuery<T extends Record<string, unknown> = Record<string, unknown>>(text: string, values: unknown[] = []) {
  await initDatabase();
  return pool.query<T>(text, values);
}
export { SESSION_COOKIE };
