import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("dummy test", () => {
  it("should always pass", () => {
    assert.strictEqual(1, 1);
  });
});
