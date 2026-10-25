import { pgTable, text, jsonb } from 'drizzle-orm/pg-core'
import type { Alarm } from '../src/lib/alarms'
export const schedules = pgTable('schedules', {
  owner: text('owner').primaryKey(),
  alarms: jsonb('alarms').$type<Alarm[]>().notNull(),
  vacations: jsonb('vacations').$type<string[]>().notNull().default([]),
})
