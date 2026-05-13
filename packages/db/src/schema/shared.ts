import { sql } from "drizzle-orm";
import { bigint, datetime } from "drizzle-orm/mysql-core";

export function idColumn(name = "id") {
  return bigint(name, { mode: "number", unsigned: true }).autoincrement().primaryKey();
}

export function userIdColumn(name = "user_id") {
  return bigint(name, { mode: "number", unsigned: true }).notNull();
}

export function refIdColumn(name: string) {
  return bigint(name, { mode: "number", unsigned: true }).notNull();
}

export function nullableRefIdColumn(name: string) {
  return bigint(name, { mode: "number", unsigned: true });
}

export function nullableUserIdColumn(name = "user_id") {
  return bigint(name, { mode: "number", unsigned: true });
}

export function createdAtColumn(name = "created_at") {
  return datetime(name, { mode: "date", fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`);
}

export function updatedAtColumn(name = "updated_at") {
  return datetime(name, { mode: "date", fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`)
    .$onUpdate(() => new Date());
}
