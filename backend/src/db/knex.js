import config from '../config/index.js'
import { createMysqlKnex } from './createKnex.js'

const knex = createMysqlKnex(config.db)

export default knex
