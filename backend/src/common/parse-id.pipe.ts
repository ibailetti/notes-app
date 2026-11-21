import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/** Largest value of a PostgreSQL `integer` (int4) column. */
export const MAX_ID = 2_147_483_647;

/**
 * Parses a route id. Unlike ParseIntPipe it also rejects values outside the
 * int4 range, which PostgreSQL would answer with "integer out of range".
 */
@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const id = Number(value);
    if (
      !/^\d+$/.test(value) ||
      !Number.isSafeInteger(id) ||
      id < 1 ||
      id > MAX_ID
    ) {
      throw new BadRequestException(`Invalid id "${value}"`);
    }
    return id;
  }
}
