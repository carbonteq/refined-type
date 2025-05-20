# @carbonteq/refined-type

[![npm version](https://img.shields.io/npm/v/@carbonteq/refined-type.svg)](https://www.npmjs.com/package/@carbonteq/refined-type)
[![license](https://img.shields.io/npm/l/@carbonteq/refined-type.svg)](https://github.com/carbonteq/refined-type/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](https://www.typescriptlang.org/)
[![Linted with Biome](https://img.shields.io/badge/Linted_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)

> 🛡️ Type-safe, runtime-validated, and nominally-typed primitives for TypeScript, built on Zod.

## Motivation: Refined Types and Branded Types

**Refined types** and **branded types** address a fundamental challenge in TypeScript development: the inability to distinguish between primitive types that represent different semantic concepts.

### The Problem

In TypeScript's structural type system:

1. **Type Safety Gaps**: TypeScript's primitive types (`string`, `number`, etc.) don't prevent logical errors like passing an email to a URL parameter, confusing different string IDs, or mixing measurement units.

   ```typescript
   // These are all just strings to TypeScript!
   function sendEmail(to: string, subject: string) { /* ... */ }
   
   // Nothing prevents these dangerous mistakes:
   sendEmail(subject, emailAddress); // Oops, parameters swapped
   sendEmail(userId, subject);       // Oops, wrong string type
   ```

2. **No Runtime Type Guarantees**: TypeScript's static type system is erased at runtime, allowing invalid values to pass through if they match the expected structure.

3. **Lack of Nominal Typing**: TypeScript cannot natively differentiate between structurally identical types with different semantic meanings (email vs. username vs. password).

4. **Validation Fragmentation**: Developers end up duplicating validation logic across the codebase, often inconsistently.

### What are Refined and Branded Types?

- **Refined Types**: Types with associated runtime validations that ensure values satisfy specific constraints or predicates.
  
- **Branded Types**: Types that are "branded" with a unique tag to make them nominally distinct despite having the same underlying structure.

  ```typescript
  // Without branding:
  type UserId = string;
  type PostId = string;
  
  // TypeScript sees these as identical: 
  function getPost(id: PostId) { /* ... */ }
  const userId: UserId = "user-123";
  getPost(userId); // No error! 😱
  ```

### Traditional Branded Types in TypeScript

Developers have traditionally created branded types using a variety of techniques, each with significant drawbacks:

#### 1. Using declaration merging and interfaces:

```typescript
// Approach 1: Using interfaces
interface EmailBrand { readonly __brand: unique symbol }
type Email = string & EmailBrand;

// Problems:
// 1. No runtime validation
// 2. Easy to bypass with type casting
const email = "invalid-email" as Email; // Compiles fine! 😱
```

#### 2. Using opaque types with private symbols:

```typescript
// Approach 2: Using symbols
type Brand<T, B> = T & { __brand: B };
type Email = Brand<string, "Email">;

// Creation function with no validation
const asEmail = (str: string): Email => str as Email;

// Problems:
// 1. No validation at runtime
// 2. Easy to create invalid values
const email = asEmail("not-valid"); // No error!
```

#### 3. Using class-based wrappers:

```typescript
// Approach 3: Class wrapper
class Email {
  private __brand: void;
  constructor(public readonly value: string) {
    // Maybe some validation, but must use try/catch
    if (!value.includes('@')) throw new Error('Invalid email');
  }
}

// Problems:
// 1. Boxing/unboxing overhead
// 2. Exception-based validation
// 3. Need to access .value property
try {
  const email = new Email("user@example"); // Runtime exception
  sendEmail(email.value); // Must extract .value
} catch (e) {
  // Error handling with try/catch everywhere
}
```

All these approaches suffer from common problems:

- **No unified validation strategy**: Ad-hoc validation if any
- **Exception-based error handling**: Try/catch blocks everywhere
- **Manual type casting**: Prone to mistakes or intentional bypassing
- **No standardized error types**: Difficult to handle errors consistently
- **No composition model**: Difficult to compose branded types
- **Poor developer experience**: Verbose and error-prone

## Our Solution

`@carbonteq/refined-type` elegantly combines both approaches to create a comprehensive solution:

1. **Zod Integration**: Leverages Zod's powerful validation capabilities for comprehensive runtime checks with excellent error reporting.

2. **Nominal Type Safety**: Uses TypeScript's branded types to create true nominal distinctions between types.

3. **Result-based API**: Implements a functional `Result<T, E>` type from `@carbonteq/fp` that eliminates exceptions and enables elegant error handling.

4. **Developer Experience**: Provides intuitive helper types and utilities for seamless integration into any TypeScript project.

5. **Custom Error Handling**: Supports domain-specific error transformations to create meaningful error messages for your business logic.

6. **Zero Runtime Overhead**: No performance penalties for primitive operations after validation.

## Key Features

- ✅ **Type Safety**: Full compile-time and runtime type safety
- 🏷️ **Nominal Typing**: True nominal type distinctions in TypeScript
- 🔄 **Functional API**: Uses `Result` type for elegant error handling
- 🧩 **Composable**: Chain and compose validations easily
- 🛠️ **Customizable**: Extend with your own validators and error types
- 📦 **Lightweight**: Minimal runtime footprint

## Usage Examples

### Basic Usage

```typescript
import { createRefinedType } from '@carbonteq/refined-type';
import * as z from 'zod/v4';

// Create a refined Email type with built-in validation
const Email = createRefinedType('Email', z.string().email());
type Email = typeof Email.$infer; // Get the branded type

// === Type Safety ===
// These won't compile:
// const email1: Email = "invalid@email"; // Error: Type 'string' is not assignable to type 'Email'
// const email2: Email = "user@example.com"; // Error: Must use .create() to construct

// === Runtime Validation ===
// Safe creation with validation
const emailResult = Email.create('user@example.com');
if (emailResult.isOk()) {
  const validEmail = emailResult.unwrap();
  sendEmail(validEmail); // validEmail is branded and type-safe
  
  // Functions requiring Email type will only accept valid emails
  function sendEmail(to: Email) { /* ... */ }
  
  // This won't compile - string is not assignable to Email
  // sendEmail("some-string@example.com"); // Error!
}

// === Error Handling ===
const invalidResult = Email.create('not-an-email');
if (invalidResult.isErr()) {
  // Structured error handling
  console.error(invalidResult.unwrapErr().message);
  // "Invalid email"
}
```

### Custom Error Types

```typescript
import { createRefinedType, RefinedValidationError } from '@carbonteq/refined-type';
import { Result } from '@carbonteq/fp';
import * as z from 'zod/v4';

// Define domain-specific error type
class InvalidUserIdError extends RefinedValidationError {
  constructor(data: unknown, err: z.ZodError) {
    super(err);
    this.name = 'InvalidUserIdError';
    this.message = `Invalid user ID: ${data}. Must be a valid UUID.`;
  }
}

// Create a UserId type with custom error handling
const UserId = createRefinedType(
  'UserId',
  z.string().uuid(),
  (data, err) => new InvalidUserIdError(data, err)
);
type UserId = typeof UserId.$infer;

// Usage in application code
function fetchUser(id: unknown): Result<User, InvalidUserIdError | ApiError> {
  // Validate and create UserId first
  const userIdResult = UserId.create(id);
  
  if (userIdResult.isErr()) {
    return Result.Err(userIdResult.unwrapErr());
  }
  
  const userId = userIdResult.unwrap();
  return api.getUser(userId);
}
```

### Working with Primitive Values

```typescript
import { createRefinedType, Unbrand } from '@carbonteq/refined-type';
import { Result } from '@carbonteq/fp';
import * as z from 'zod/v4';

// Define a refined number type for positive numbers
const PositiveNumber = createRefinedType(
  'PositiveNumber',
  z.number().positive()
);
type PositiveNumber = typeof PositiveNumber.$infer;

// Get the underlying primitive type (number in this case)
type UnbrandedNumber = Unbrand<PositiveNumber>; // Plain number

// Converting back to primitive when needed
function calculateTotal(price: PositiveNumber, quantity: PositiveNumber): number {
  // Access the primitive values
  const priceValue = PositiveNumber.primitive(price);
  const quantityValue = PositiveNumber.primitive(quantity);
  
  return priceValue * quantityValue;
}

// Create safe numeric types
const priceResult = PositiveNumber.create(29.99);
const quantityResult = PositiveNumber.create(3);

// Use Result combinators for elegant handling
const totalResult = Result.CombineResults([priceResult, quantityResult])
  .map(([price, quantity]) => calculateTotal(price, quantity));

// Safe unwrapping
const total = totalResult.unwrapOr(0);
```

### Complex Composition

```typescript
import { createRefinedType } from '@carbonteq/refined-type';
import { Result } from '@carbonteq/fp';
import * as z from 'zod/v4';

// Create domain-specific types
const Name = createRefinedType('Name', z.string().min(2).max(50));
const Age = createRefinedType('Age', z.number().int().min(0).max(120));
const Email = createRefinedType('Email', z.string().email());

// Compose them into a schema
const personSchema = z.object({
  name: Name,
  age: Age,
  email: Email,
});

// Define the type using our refined types
type Person = {
  name: typeof Name;
  age:  typeof Age;
  email: typeof Email;
};

// Validate an entire object with multiple refined types
function createPerson(data: unknown): Result<Person, Error> {
  const result = personSchema.safeParse(data);
  if (!result.success) {
    return Result.Err(new Error("Invalid person data"));
  }
  return Result.Ok(result.data as Person);
}
```



## Installation

```bash
# NPM
npm install @carbonteq/refined-type @carbonteq/fp zod

# Yarn
yarn add @carbonteq/refined-type @carbonteq/fp zod

# PNPM
pnpm add @carbonteq/refined-type @carbonteq/fp zod
```

## Requirements

- Node.js >= 18
- TypeScript >= 4.9
- Zod >= 3.25.0
- @carbonteq/fp >= 0.7.0


## License

MIT
