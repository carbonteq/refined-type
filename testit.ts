import { createRefinedType, type Unbrand } from "./dist/index.js";
import * as z from "zod/v4";

const Email = createRefinedType("Email", z.email());
type Email = typeof Email.$infer;
type NormalEmail = Unbrand<Email>;

console.debug(Email.create("").unwrapErr().message);
console.debug(Email.create("2").unwrapErr().message);
console.debug(Email.create("test@dev.com").unwrap());
console.debug(Email.create("testdev.com").unwrapErr().zodError.message);
