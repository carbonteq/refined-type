import * as z from "zod/v4";
import {
  RefinedValidationError,
  createRefinedType,
  extend,
  unsafeCast,
} from "./core.js";

export class InvalidUUIDError extends RefinedValidationError {}

const UUIDInner = createRefinedType(
  "UUID",
  z.uuid(),
  (_data, err) => new InvalidUUIDError(err),
);
export type UUID = typeof UUIDInner.$infer;
export const UUID = extend(UUIDInner, {
  init: () => crypto.randomUUID() as UUID,
  fromTrusted: unsafeCast<UUID, string>,
});

export class InvalidEmailError extends RefinedValidationError {}

export const Email = createRefinedType(
  "Email",
  z.email(),
  (data, err) => new InvalidEmailError(err),
);
export type Email = typeof Email.$infer;

export class InvalidDateTime extends RefinedValidationError {}
const DTInner = createRefinedType(
  "DateTime",
  z.union([z.number(), z.string(), z.date()]).pipe(z.coerce.date()),
  (_, err) => new InvalidDateTime(err),
);
export type DateTime = typeof DTInner.$infer;
export const DateTime = extend(DTInner, {
  now: () => new Date() as DateTime,
  from: unsafeCast<DateTime, Date | DateTime>,
});
