import { randomUUID } from "node:crypto";

import { relations } from "drizzle-orm";
import { boolean, datetime, index, mysqlTable, text, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

import { createdAtColumn, idColumn, updatedAtColumn, userIdColumn } from "./shared";
import type { AuthProviderId } from "./types";

export const user = mysqlTable(
  "user",
  {
    id: idColumn(),
    publicId: varchar("public_id", { length: 32 })
      .notNull()
      .$defaultFn(() => randomUUID().replaceAll("-", "")),
    name: varchar("name", { length: 191 }).notNull().default(""),
    email: varchar("email", { length: 320 }).notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: varchar("image", { length: 1024 }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("user_public_id_uq").on(table.publicId),
    uniqueIndex("user_email_uq").on(table.email),
  ],
);

export const session = mysqlTable(
  "session",
  {
    id: idColumn(),
    userId: userIdColumn(),
    token: varchar("token", { length: 255 }).notNull(),
    expiresAt: datetime("expires_at", { mode: "date", fsp: 3 }).notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: varchar("user_agent", { length: 512 }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("session_token_uq").on(table.token),
    index("session_user_expires_idx").on(table.userId, table.expiresAt),
    index("session_expires_idx").on(table.expiresAt),
  ],
);

export const account = mysqlTable(
  "account",
  {
    id: idColumn(),
    userId: userIdColumn(),
    accountId: varchar("account_id", { length: 255 }).notNull(),
    providerId: varchar("provider_id", { length: 64 }).$type<AuthProviderId | string>().notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: datetime("access_token_expires_at", { mode: "date", fsp: 3 }),
    refreshTokenExpiresAt: datetime("refresh_token_expires_at", { mode: "date", fsp: 3 }),
    scope: varchar("scope", { length: 512 }),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("account_provider_account_uq").on(table.providerId, table.accountId),
    index("account_user_idx").on(table.userId),
  ],
);

export const verification = mysqlTable(
  "verification",
  {
    id: idColumn(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    value: varchar("value", { length: 255 }).notNull(),
    expiresAt: datetime("expires_at", { mode: "date", fsp: 3 }).notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("verification_identifier_expires_idx").on(table.identifier, table.expiresAt),
    index("verification_expires_idx").on(table.expiresAt),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  sessions: many(session),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));
