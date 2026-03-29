import { migrate } from '../src/db/migrate.js'
import { ensureAdminUser, ensureBaseRoles } from '../src/db/seed.js'

await migrate()
await ensureBaseRoles()
await ensureAdminUser()
await import('../server.js')
