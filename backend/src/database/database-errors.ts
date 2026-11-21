import { QueryFailedError } from 'typeorm';

/** PostgreSQL SQLSTATE for unique_violation. */
const UNIQUE_VIOLATION = '23505';

/** True when a query failed because it broke a UNIQUE constraint. */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === UNIQUE_VIOLATION
  );
}
