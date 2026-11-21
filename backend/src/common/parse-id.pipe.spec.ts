import { BadRequestException } from '@nestjs/common';
import { MAX_ID, ParseIdPipe } from './parse-id.pipe';

describe('ParseIdPipe', () => {
  const pipe = new ParseIdPipe();

  it.each(['1', '42', String(MAX_ID)])('accepts %s', (value) => {
    expect(pipe.transform(value)).toBe(Number(value));
  });

  it.each([
    ['zero', '0'],
    ['a negative number', '-5'],
    ['a decimal', '1.5'],
    ['text', 'abc'],
    ['an empty string', ''],
    ['a value above the Postgres integer range', String(MAX_ID + 1)],
    ['a huge number', '99999999999999999999'],
  ])('rejects %s', (_label, value) => {
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });
});
