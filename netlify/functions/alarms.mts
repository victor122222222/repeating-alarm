import { drizzle } from 'drizzle-orm/netlify-db'
import { eq } from 'drizzle-orm'
import type { Config, Context } from '@netlify/functions'
import { schedules } from '../../db/schema'
import { examples, MAX_DAYS, normalize, tones } from '../../src/lib/alarms'
import { z } from 'zod'
export default async (req: Request, context: Context) => {
  const alarm = z.object({
    id: z.string().min(1).max(100),
    name: z.string().trim().min(1).max(60),
    start: z.iso.date(),
    enabled: z.boolean(),
    tone: z.enum(tones),
    days: z
      .array(
        z
          .string()
          .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
          .nullable(),
      )
      .min(1)
      .max(MAX_DAYS),
  })
  const body = z.object({
    alarms: z.array(alarm).max(100),
    vacations: z.array(z.iso.date()).max(1000),
  })
  if (!['GET', 'PUT'].includes(req.method))
    return new Response('Método no permitido', { status: 405 })
  if (
    req.method === 'PUT' &&
    req.headers.get('origin') !== new URL(req.url).origin
  )
    return new Response('Origen no permitido', { status: 403 })
  let owner = context.cookies.get('compas_device')
  if (!owner || !/^[0-9a-f-]{36}$/.test(owner)) {
    owner = crypto.randomUUID()
    context.cookies.set({
      name: 'compas_device',
      value: owner,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 31536000,
    })
  }
  try {
    const db = drizzle()
    if (req.method === 'PUT') {
      const parsed = body.safeParse(await req.json().catch(() => null))
      if (!parsed.success)
        return Response.json(
          { error: 'Revisa los datos de las alarmas.' },
          { status: 400 },
        )
      const data = {
        alarms: parsed.data.alarms,
        vacations: [...new Set(parsed.data.vacations)].sort(),
      }
      await db
        .insert(schedules)
        .values({ owner, ...data })
        .onConflictDoUpdate({ target: schedules.owner, set: data })
      return Response.json(data, {
        headers: { 'Cache-Control': 'no-store' },
      })
    }
    const [row] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.owner, owner))
    if (row)
      return Response.json(
        { alarms: row.alarms.map(normalize), vacations: row.vacations },
        {
          headers: { 'Cache-Control': 'no-store' },
        },
      )
    const initial = examples(new Date().toISOString().slice(0, 10))
    await db
      .insert(schedules)
      .values({ owner, alarms: initial })
      .onConflictDoNothing()
    return Response.json(
      { alarms: initial, vacations: [] },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return Response.json(
      {
        error:
          'No se han podido guardar o cargar las alarmas. Inténtalo de nuevo.',
      },
      { status: 503 },
    )
  }
}
export const config: Config = { path: '/api/alarms' }
