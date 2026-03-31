require('pg').defaults.parseInt8 = true
import { Sequelize } from 'sequelize'
import { Umzug, SequelizeStorage } from 'umzug'
import { POSTGRES_URL } from './config'

const sequelize = new Sequelize(POSTGRES_URL, { dialect: 'postgres', logging: false })

const migrationConf = {
  migrations: { glob: 'src/migrations/*' },
  storage: new SequelizeStorage({ sequelize, tableName: 'migrations' }),
  context: sequelize.getQueryInterface(),
  logger: console,
}

const runMigrations = async () => {
  await sequelize.authenticate()
  const migrator = new Umzug(migrationConf)
  const migrations = await migrator.up()
  console.log('Migrations up to date', { files: migrations.map((mig) => mig.name) })
}

const rollbackMigration = async () => {
  await sequelize.authenticate()
  const migrator = new Umzug(migrationConf)
  await migrator.down()
}

const connectToDatabase = async () => {
  try {
    await runMigrations()
    console.log('database connected')
  } catch (err) {
    console.log('connecting database failed')
    console.log(err)
    return process.exit(1)
  }
  return null
}

export { sequelize, connectToDatabase, rollbackMigration }
