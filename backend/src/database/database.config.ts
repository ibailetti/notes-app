import { DataSourceOptions } from 'typeorm';
import { Category } from '../categories/category.entity';
import { Note } from '../notes/note.entity';
import { User } from '../users/user.entity';
import { ConstraintNamingStrategy } from './naming.strategy';

type EnvReader = (key: string) => string | undefined;

/**
 * TypeORM connection options, shared by the Nest app and the schema check.
 *
 * Flyway owns the schema (db/migrations), so TypeORM never creates or alters
 * tables: synchronize is off and no TypeORM migrations are used.
 */
export function buildDataSourceOptions(env: EnvReader): DataSourceOptions {
  return {
    type: 'postgres',
    host: env('DB_HOST') || 'localhost',
    port: Number(env('DB_PORT') || 5432),
    username: env('DB_USER') || 'notes',
    password: env('DB_PASSWORD') || 'notes',
    database: env('DB_NAME') || 'notes',
    entities: [User, Note, Category],
    namingStrategy: new ConstraintNamingStrategy(),
    synchronize: false,
    migrationsRun: false,
    dropSchema: false,
  };
}
