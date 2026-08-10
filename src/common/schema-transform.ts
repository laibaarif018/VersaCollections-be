import { Schema } from 'mongoose';

/**
 * Standard JSON shape for every document we return: expose the `id` virtual,
 * drop Mongoose's `__v`, and remove any fields that must never leave the server.
 */
export function applyJsonTransform(schema: Schema, omit: string[] = []): void {
  schema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
      const obj = ret as unknown as Record<string, unknown>;
      delete obj.__v;
      for (const key of omit) delete obj[key];
      return obj;
    },
  });
}
