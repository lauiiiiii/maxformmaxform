import { parseJsonField } from '../utils/jsonField.js'
import getDb from '../db/getDb.js'

const TABLE = 'system_configs'

function toDto(row) {
  if (!row) return null
  parseJsonField(row, 'config_value')
  return {
    ...row,
    configKey: row.config_key,
    configValue: row.config_value,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

const SystemConfig = {
  async findByKey(configKey, options = {}) {
    const db = getDb(options)
    const row = await db(TABLE).where('config_key', configKey).first()
    return toDto(row)
  },

  async upsert({ config_key, config_value = null, updated_by = null }, options = {}) {
    const db = getDb(options)
    const existing = await db(TABLE).where('config_key', config_key).first()

    if (existing) {
      await db(TABLE)
        .where('config_key', config_key)
        .update({
          config_value: config_value == null ? null : JSON.stringify(config_value),
          updated_by,
          updated_at: db.fn.now()
        })
    } else {
      await db(TABLE).insert({
        config_key,
        config_value: config_value == null ? null : JSON.stringify(config_value),
        updated_by,
        updated_at: db.fn.now()
      })
    }

    return SystemConfig.findByKey(config_key, options)
  }
}

export default SystemConfig
