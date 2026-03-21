import knex from './knex.js'

export async function migrate() {
  const hasUsers = await knex.schema.hasTable('users')
  if (hasUsers) return

  await knex.schema.createTable('roles', t => {
    t.increments('id').unsigned()
    t.string('name', 50).notNullable()
    t.string('code', 50).notNullable().unique()
    t.json('permissions').nullable()
    t.string('remark', 255).nullable()
    t.datetime('created_at').defaultTo(knex.fn.now())
  })

  await knex.schema.createTable('depts', t => {
    t.increments('id').unsigned()
    t.string('name', 100).notNullable()
    t.integer('parent_id').unsigned().nullable()
    t.integer('sort_order').defaultTo(0)
    t.datetime('created_at').defaultTo(knex.fn.now())
    t.index('parent_id')
  })

  await knex.schema.createTable('users', t => {
    t.increments('id').unsigned()
    t.string('username', 50).notNullable().unique()
    t.string('password', 255).notNullable()
    t.string('email', 255).nullable()
    t.integer('role_id').unsigned().nullable()
    t.integer('dept_id').unsigned().nullable()
    t.string('avatar', 500).nullable()
    t.boolean('is_active').defaultTo(true)
    t.datetime('last_login_at').nullable()
    t.datetime('created_at').defaultTo(knex.fn.now())
    t.datetime('updated_at').defaultTo(knex.fn.now())
    t.index('role_id')
    t.index('dept_id')
  })

  await knex.schema.createTable('surveys', t => {
    t.increments('id').unsigned()
    t.string('title', 200).notNullable()
    t.text('description').nullable()
    t.integer('creator_id').unsigned().notNullable()
    t.json('questions').notNullable()
    t.json('settings').nullable()
    t.json('style').nullable()
    t.string('share_code', 20).nullable().unique()
    t.enum('status', ['draft', 'published', 'closed']).defaultTo('draft')
    t.integer('response_count').defaultTo(0)
    t.datetime('created_at').defaultTo(knex.fn.now())
    t.datetime('updated_at').defaultTo(knex.fn.now())
    t.index('creator_id')
    t.index('status')
  })

  await knex.schema.createTable('answers', t => {
    t.increments('id').unsigned()
    t.integer('survey_id').unsigned().notNullable()
    t.json('answers_data').notNullable()
    t.string('ip_address', 45).nullable()
    t.string('user_agent', 500).nullable()
    t.integer('duration').nullable()
    t.enum('status', ['completed', 'incomplete']).defaultTo('completed')
    t.datetime('submitted_at').defaultTo(knex.fn.now())
    t.index('survey_id')
    t.index('submitted_at')
  })

  await knex.schema.createTable('files', t => {
    t.increments('id').unsigned()
    t.string('name', 255).notNullable()
    t.string('url', 500).notNullable()
    t.integer('size').unsigned().defaultTo(0)
    t.string('type', 50).nullable()
    t.integer('uploader_id').unsigned().nullable()
    t.datetime('created_at').defaultTo(knex.fn.now())
    t.index('uploader_id')
  })

  console.log('Database tables created')
}

export async function seed() {
  const adminRole = await knex('roles').where('code', 'admin').first()
  if (!adminRole) {
    await knex('roles').insert([
      { name: '管理员', code: 'admin', permissions: JSON.stringify(['*']) },
      { name: '普通用户', code: 'user', permissions: JSON.stringify(['survey:create', 'survey:edit', 'survey:view', 'answer:view']) }
    ])
    console.log('Default roles seeded')
  }
}
