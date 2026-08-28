import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

/**
 * Guards a route param that is handed straight to a Mongoose `_id` lookup.
 * Without this, a malformed id (`"abc"`, a stray slug, a scanner's probe)
 * reaches `findById`/`findOne({ _id })` unchecked, throws an uncaught
 * `CastError`, and falls through to Nest's default filter as a bare
 * `500 Internal Server Error` instead of a client-correctable `400`.
 */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isValidObjectId(value)) {
      throw new BadRequestException(`"${value}" is not a valid id`);
    }
    return value;
  }
}
