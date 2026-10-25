import { drizzle } from 'drizzle-orm/netlify-db'
import { eq } from 'drizzle-orm'
import type { Config, Context } from '@netlify/functions'
import { schedules } from '../../db/schema'
import { examples } from '../../src/lib/alarms'
import { z } from 'zod'
export default async (req: Request, context: Context) => {
  const alarm = z.object({
    id: z.string().min(1).max(100),
    name: z.string().trim().min(1).max(60),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    work: z.number().int().min(1).max(60),
    rest: z.number().int().min(0).max(60),
    start: z.iso.date(),
    enabled: z.boolean(),
    tone: z.enum(['Amanecer', 'Brisa', 'Órbita']),
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
      const parsed = z
        .array(alarm)
        .max(100)
        .safeParse(await req.json())
      if (!parsed.success)
        return Response.json(
          { error: 'Revisa los datos de las alarmas.' },
          { status: 400 },
        )
      await db
        .insert(schedules)
        .values({ owner, alarms: parsed.data })
        .onConflictDoUpdate({
          target: schedules.owner,
          set: { alarms: parsed.data },
        })
      return Response.json(parsed.data, {
        headers: { 'Cache-Control': 'no-store' },
      })
    }
    const [row] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.owner, owner))
    if (row)
      return Response.json(row.alarms, {
        headers: { 'Cache-Control': 'no-store' },
      })
    const initial = examples(new Date().toISOString().slice(0, 10))
    await db
      .insert(schedules)
      .values({ owner, alarms: initial })
      .onConflictDoNothing()
    return Response.json(initial, { headers: { 'Cache-Control': 'no-store' } })
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
