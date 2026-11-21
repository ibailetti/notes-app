import { DefaultNamingStrategy, NamingStrategyInterface, Table } from 'typeorm';

/**
 * Readable, deterministic constraint and index names (instead of TypeORM's
 * hashed defaults) so the entity metadata lines up with the names that the
 * Flyway migrations create in db/migrations:
 *   pk_<table>, uq_<table>_<columns>, fk_<table>_<columns>, idx_<table>_<columns>
 * Column names are not derived here: every entity maps them explicitly.
 */
export class ConstraintNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  primaryKeyName(tableOrName: Table | string): string {
    return `pk_${this.table(tableOrName)}`;
  }

  uniqueConstraintName(tableOrName: Table | string, columns: string[]): string {
    return `uq_${this.table(tableOrName)}_${this.columns(columns)}`;
  }

  foreignKeyName(tableOrName: Table | string, columns: string[]): string {
    return `fk_${this.table(tableOrName)}_${columns.join('_')}`;
  }

  indexName(tableOrName: Table | string, columns: string[]): string {
    return `idx_${this.table(tableOrName)}_${columns.join('_')}`;
  }

  private table(tableOrName: Table | string): string {
    const name = typeof tableOrName === 'string' ? tableOrName : tableOrName.name;
    // Strip a schema prefix such as "public.notes".
    return name.split('.').pop() as string;
  }

  /** Sorted so the name doesn't depend on declaration order. */
  private columns(columns: string[]): string {
    return [...columns].sort().join('_');
  }
}
