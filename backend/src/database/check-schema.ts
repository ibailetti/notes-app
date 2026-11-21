import 'reflect-metadata';
import { existsSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './database.config';

/**
 * Verifies that the TypeORM entities match the schema Flyway created.
 *
 * TypeORM computes the SQL it *would* run to make the database match the
 * entities (nothing is executed). No pending SQL means the mapping and the
 * schema agree; otherwise the differences are printed and the exit code is 1.
 *
 *   npm run db:check
 */
const ENV_FILE = join(__dirname, '..', '..', '.env');

async function main(): Promise<number> {
  // Values already set in the environment take precedence over the file.
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

  const dataSource = new DataSource(
    buildDataSourceOptions((key) => process.env[key]),
  );
  await dataSource.initialize();
  try {
    const { upQueries } = await dataSource.driver.createSchemaBuilder().log();
    const tables = dataSource.entityMetadatas.map((m) => m.tableName).sort();

    if (upQueries.length === 0) {
      console.log(
        `✔ Entities match the database schema (${tables.join(', ')}).`,
      );
      return 0;
    }
    console.error(
      '✖ Entities and database schema differ. TypeORM would run:\n',
    );
    for (const { query } of upQueries) console.error(`  ${query};`);
    console.error(
      '\nFix the entity mapping, or add a Flyway migration in db/migrations.',
    );
    return 1;
  } finally {
    await dataSource.destroy();
  }
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error('✖ Schema check failed:', error);
    process.exit(1);
  },
);
