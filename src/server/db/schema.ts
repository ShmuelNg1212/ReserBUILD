import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  time,
  timestamp,
} from "drizzle-orm/pg-core";

// Tables follow doc/canonical/erd.png. Additions: users.password_hash,
// the sessions table, and the admin role (doc/adr/0001-admin-role.md).

export const userRole = pgEnum("user_role", ["student", "faculty", "admin"]);
export const spaceType = pgEnum("space_type", ["build", "meeting"]);
export const dayOfWeek = pgEnum("day_of_week", ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
export const reservationStatus = pgEnum("reservation_status", [
  "pending",
  "confirmed",
  "checked_in",
  "completed",
  "cancelled",
  "no_show",
]);
export const paymentMethod = pgEnum("payment_method", ["cash", "e_wallet", "bank_transfer"]);
export const paymentStatus = pgEnum("payment_status", ["pending", "paid", "voided"]);

const money = (name: string) => numeric(name, { precision: 10, scale: 2 });
const tstz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = pgTable(
  "users",
  {
    userId: serial("user_id").primaryKey(),
    schoolId: text("school_id").notNull().unique(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone"),
    role: userRole("role").notNull(),
    department: text("department"),
    program: text("program"),
    yearLevel: integer("year_level"),
    passwordHash: text("password_hash").notNull(),
    createdAt: tstz("created_at").notNull().defaultNow(),
  },
  (t) => [
    check(
      "users_year_level_by_role",
      sql`(${t.role} = 'student' and ${t.yearLevel} is not null) or (${t.role} <> 'student' and ${t.yearLevel} is null)`,
    ),
  ],
);

export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.userId, { onDelete: "cascade" }),
  expiresAt: tstz("expires_at").notNull(),
});

export const spaces = pgTable(
  "spaces",
  {
    spaceId: serial("space_id").primaryKey(),
    code: char("code", { length: 1 }).notNull().unique(),
    name: text("name").notNull(),
    spaceType: spaceType("space_type").notNull(),
    capacity: integer("capacity").notNull(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [
    check("spaces_code_valid", sql`${t.code} in ('A', 'B', 'C', 'D')`),
    check("spaces_capacity_positive", sql`${t.capacity} > 0`),
  ],
);

export const rates = pgTable(
  "rates",
  {
    rateId: serial("rate_id").primaryKey(),
    // null = all spaces
    spaceId: integer("space_id").references(() => spaces.spaceId),
    // null = daily
    dayOfWeek: dayOfWeek("day_of_week"),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    hourlyRate: money("hourly_rate").notNull(),
    isPeak: boolean("is_peak").notNull().default(false),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    // null = open-ended
    effectiveTo: date("effective_to", { mode: "string" }),
  },
  (t) => [
    check("rates_window_valid", sql`${t.endTime} > ${t.startTime}`),
    check("rates_hourly_rate_positive", sql`${t.hourlyRate} > 0`),
    check("rates_effective_valid", sql`${t.effectiveTo} is null or ${t.effectiveTo} >= ${t.effectiveFrom}`),
  ],
);

export const reservations = pgTable(
  "reservations",
  {
    reservationId: serial("reservation_id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.userId),
    spaceId: integer("space_id")
      .notNull()
      .references(() => spaces.spaceId),
    startAt: tstz("start_at").notNull(),
    endAt: tstz("end_at").notNull(),
    purpose: text("purpose").notNull(),
    headcount: integer("headcount").notNull(),
    status: reservationStatus("status").notNull().default("confirmed"),
    totalAmount: money("total_amount").notNull(),
    createdAt: tstz("created_at").notNull().defaultNow(),
    checkedInAt: tstz("checked_in_at"),
    cancelledAt: tstz("cancelled_at"),
  },
  (t) => [
    check("reservations_time_valid", sql`${t.endAt} > ${t.startAt}`),
    check("reservations_headcount_positive", sql`${t.headcount} > 0`),
    index("reservations_user_idx").on(t.userId),
    // The overlap exclusion constraint is in a custom migration.
  ],
);

export const participants = pgTable("participants", {
  participantId: serial("participant_id").primaryKey(),
  reservationId: integer("reservation_id")
    .notNull()
    .references(() => reservations.reservationId, { onDelete: "cascade" }),
  // null = external participant
  userId: integer("user_id").references(() => users.userId),
  fullName: text("full_name").notNull(),
  email: text("email"),
  affiliation: text("affiliation"),
  attended: boolean("attended").notNull().default(false),
});

export const charges = pgTable("charges", {
  chargeId: serial("charge_id").primaryKey(),
  reservationId: integer("reservation_id")
    .notNull()
    .references(() => reservations.reservationId, { onDelete: "cascade" }),
  rateId: integer("rate_id")
    .notNull()
    .references(() => rates.rateId),
  segmentStart: tstz("segment_start").notNull(),
  segmentEnd: tstz("segment_end").notNull(),
  hours: numeric("hours", { precision: 6, scale: 2 }).notNull(),
  rateApplied: money("rate_applied").notNull(),
  amount: money("amount").notNull(),
});

export const payments = pgTable(
  "payments",
  {
    paymentId: serial("payment_id").primaryKey(),
    reservationId: integer("reservation_id")
      .notNull()
      .references(() => reservations.reservationId),
    amount: money("amount").notNull(),
    method: paymentMethod("method").notNull(),
    referenceNo: text("reference_no"),
    status: paymentStatus("status").notNull(),
    paidAt: tstz("paid_at"),
    receivedBy: text("received_by").notNull(),
  },
  (t) => [check("payments_amount_positive", sql`${t.amount} > 0`)],
);

export type User = typeof users.$inferSelect;
export type Space = typeof spaces.$inferSelect;
export type Rate = typeof rates.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type Charge = typeof charges.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Role = (typeof userRole.enumValues)[number];
export type DayOfWeek = (typeof dayOfWeek.enumValues)[number];
export type ReservationStatus = (typeof reservationStatus.enumValues)[number];
