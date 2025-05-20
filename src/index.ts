import { Result } from "@carbonteq/fp";
import * as z from "zod/v4";

// type Prettify<T> = {
//   [K in keyof T]: T[K];
// } & {};

const extend = <T, U extends Record<string, unknown>>(
  original: T,
  extensions: U,
  // @ts-expect-error
): T & U => Object.assign(original, extensions);

type Extensions<
  Schema extends z.ZodType,
  Tag extends string | symbol,
  Err extends Error,
  SchemaInput = Schema["_input"],
  SchemaOutput = Schema["_output"],
  BrandedOutput = SchemaOutput & z.core.$brand<Tag>,
> = {
  create: (data: unknown) => Result<BrandedOutput, Err>;
  $infer: BrandedOutput;
  $inferPrimitive: SchemaOutput;
  primitive(branded: BrandedOutput): SchemaOutput;
};

type ZodBrandedWithFactory<
  Schema extends z.ZodType,
  Tag extends string | symbol,
  Err extends Error,
  SchemaInput = Schema["_input"],
  SchemaOutput = Schema["_output"],
> = z.core.$ZodBranded<Schema, Tag> &
  Extensions<Schema, Tag, Err, SchemaInput, SchemaOutput>;

class RefinedValidationError extends Error {
  readonly zodError: z.core.$ZodError;

  constructor(err: z.core.$ZodError) {
    const msg = z.core.prettifyError(err);

    super(msg);
    this.name = "RefinedValidationError";
    this.zodError = err;
  }
}

const defaultFromZodErr = (_data: unknown, err: z.core.$ZodError) =>
  new RefinedValidationError(err);

export function createRefinedType<
  Tag extends string | symbol,
  Schema extends z.ZodType,
  SchemaInput = Schema["_input"],
  SchemaOutput = Schema["_output"],
>(
  _tag: Tag,
  schema: Schema,
): ZodBrandedWithFactory<
  Schema,
  Tag,
  RefinedValidationError,
  SchemaInput,
  SchemaOutput
>;
export function createRefinedType<
  Tag extends string | symbol,
  Schema extends z.ZodType,
  Err extends Error,
  SchemaInput = Schema["_input"],
  SchemaOutput = Schema["_output"],
>(
  _tag: Tag,
  schema: Schema,
  errTransformer: (data: SchemaInput, err: z.core.$ZodError) => Err,
): ZodBrandedWithFactory<Schema, Tag, Err, SchemaInput, SchemaOutput>;
export function createRefinedType<
  Tag extends string | symbol,
  Schema extends z.ZodType,
  E extends Error,
  SchemaInput = Schema["_input"],
  SchemaOutput = Schema["_output"],
>(
  tag: Tag,
  schema: Schema,
  errConst?: (data: unknown, err: z.core.$ZodError) => E,
): ZodBrandedWithFactory<Schema, Tag, E> {
  const errTransformer = errConst ?? defaultFromZodErr;

  type ExpectedBrand = SchemaOutput & z.core.$brand<Tag>;
  const branded = schema.brand<Tag>();

  const factory = (data: unknown): Result<ExpectedBrand, E> => {
    const res = branded.safeParse(data);

    if (res.success) return Result.Ok(res.data as ExpectedBrand);
    const err = errTransformer(data, res.error) as E;
    return Result.Err(err);
  };

  const extensions: Extensions<Schema, Tag, E, SchemaInput, SchemaOutput> = {
    create: factory,
    //@ts-expect-error
    $infer: tag,
    //@ts-expect-error
    $inferPrimitive: tag,

    primitive(branded) {
      return branded;
    },
  };
  const finalBranded = extend(branded, extensions);

  //@ts-expect-error
  return finalBranded;
}

export type Unbrand<T> = T extends z.ZodType<unknown, infer U> ? U : T;

// export class InvalidUUID extends RefinedValidationError {
//   constructor(data: unknown) {
//     super(`Invalid UUID: ${data}`);
//   }
// }
//
// // Example of how to use refined branded types with Zod
// // Custom error type not mandatory
// export class InvalidEmail extends RefinedValidationError {
//   constructor(data: unknown) {
//     super(`Invalid Email: ${data}`);
//   }
// }
//
// type TEmail = ZodBrandedWithFactory<z.ZodString, "Email", InvalidEmail>;
// export const Email: TEmail = createRefinedType(
//   "Email",
//   z.string().email(),
//
//   (data, _err) => new InvalidEmail(data),
// );
// export type Email = typeof Email.$infer;
//
// // Not a good example as I wanted to add some custom stuff
// type TUUIDSchema = z.ZodString;
// type TUUIDInner = ZodBrandedWithFactory<TUUIDSchema, "UUID", InvalidUUID>;
// const UUIDInner: TUUIDInner = createRefinedType(
//   "UUID",
//   z.string().uuid(),
//   (data, _err) => new InvalidUUID(data),
// );
// export type UUID = typeof UUIDInner.$infer;
// type TUUID = TUUIDInner & {
//   init: () => UUID;
//   fromTrusted: (s: string) => UUID;
// };
// export const UUID: TUUID = extend(UUIDInner, {
//   init: () => randomUUID() as UUID,
//   fromTrusted: unsafeCast<UUID, string>,
// });
//
// export class InvalidDateTime extends ValidationError {
//   constructor(data: unknown) {
//     super(`Invalid DateTime: ${data}`);
//   }
// }
//
// type TDTInnerSchema = z.ZodPipeline<
//   z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodDate]>,
//   z.ZodDate
// >;
// type TDTInner = ZodBrandedWithFactory<
//   TDTInnerSchema,
//   "DateTime",
//   InvalidDateTime
// >;
// const DTInner: TDTInner = createRefinedType(
//   "DateTime",
//   z.union([z.number(), z.string(), z.date()]).pipe(z.coerce.date()),
//   (data, _err) => new InvalidDateTime(data),
// );
// export type DateTime = typeof DTInner.$infer;
// type TDateTime = TDTInner & {
//   now: () => DateTime;
//   from: (d: Date | DateTime) => DateTime;
// };
// export const DateTime: TDateTime = extend(DTInner, {
//   now: () => new Date() as DateTime,
//   from: unsafeCast<DateTime, Date | DateTime>,
// });
//
// // Enum types
// export class EnumValidationError extends ValidationError {
//   constructor(
//     readonly tag: string | symbol,
//     msg: string,
//     readonly data: unknown,
//     readonly err: ZodError,
//   ) {
//     super(msg);
//   }
// }
//
// type EnumTypeUtil<
//   Tag extends string | symbol,
//   U extends string,
//   T extends [U, ...U[]],
// > = ZodBrandedWithFactory<
//   z.ZodEnum<z.Writeable<T>>,
//   Tag,
//   EnumValidationError
// > & {
//   from: (v: T[number]) => z.Writeable<T>[number] & z.BRAND<Tag>;
//   values: Readonly<T>;
//   eq: (
//     a: T[number] | (T[number] & z.BRAND<Tag>),
//     b: T[number] | (T[number] & z.BRAND<Tag>),
//   ) => boolean;
// };
//
// export const createEnumType = <
//   Tag extends string | symbol,
//   U extends string,
//   T extends [U, ...U[]],
// >(
//   tag: Tag,
//   enumValues: T,
// ): EnumTypeUtil<Tag, U, T> => {
//   type InnerType = ZodBrandedWithFactory<
//     z.ZodEnum<z.Writeable<T>>,
//     Tag,
//     EnumValidationError
//   >;
//   const innerType: InnerType = createRefinedType(
//     tag,
//     z.enum(enumValues),
//     (data, err) =>
//       new EnumValidationError(
//         tag,
//         `<${data.valueOf()}> must be one of ${enumValues.valueOf()}`,
//         data,
//         err,
//       ),
//   );
//
//   type ExtendedType = InnerType & {
//     from: (v: T[number]) => z.Writeable<T>[number] & z.BRAND<Tag>;
//     values: Readonly<T>;
//     eq: (
//       a: T[number] | (T[number] & z.BRAND<Tag>),
//       b: T[number] | (T[number] & z.BRAND<Tag>),
//     ) => boolean;
//   };
//
//   const extended: ExtendedType = extend(innerType, {
//     from: unsafeCast<typeof innerType.$infer, T[number]>,
//     get values(): Readonly<T> {
//       return enumValues;
//     },
//     eq(
//       a: T[number] | (T[number] & z.BRAND<Tag>),
//       b: T[number] | (T[number] & z.BRAND<Tag>),
//     ): boolean {
//       return a === b;
//     },
//   });
//
//   return extended;
// };
//
// type MatchActions<T extends string | symbol | number, R> = {
//   [K in T]: () => R;
// };
//
// export function matchEnum<
//   Tag extends string | symbol,
//   U extends string,
//   T extends [U, ...U[]],
//   EnumType extends ZodBrandedWithFactory<ZodEnum<T>, Tag, EnumValidationError>,
//   // biome-ignore lint/suspicious/noExplicitAny: <explanation>
//   Actions extends MatchActions<EnumType["$inferPrimitive"], any>,
// >(
//   value: EnumType["$infer"],
//   _enumType: EnumType,
//   actions: Actions,
// ): ReturnType<Actions[EnumType["$inferPrimitive"]]> {
//   const key = value as unknown as keyof typeof actions;
//   if (key in actions) {
//     return actions[key]();
//   }
//   throw new Error(`Unhandled enum value: ${value.valueOf()}`);
// }
