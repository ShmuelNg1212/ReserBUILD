import { describe, expect, it } from "vitest";
import { assertLocalDatabase, isLocalDatabaseUrl } from "./local";

describe("isLocalDatabaseUrl", () => {
  it("accepts local hosts", () => {
    expect(isLocalDatabaseUrl("postgres://localhost:5432/reserbuild")).toBe(true);
    expect(isLocalDatabaseUrl("postgresql://me:pw@127.0.0.1/reserbuild")).toBe(true);
    expect(isLocalDatabaseUrl("postgres://[::1]:5432/reserbuild")).toBe(true);
  });

  it("rejects remote hosts, missing and malformed URLs", () => {
    expect(isLocalDatabaseUrl("postgres://u:p@ep-cool-1.ap-southeast-1.aws.neon.tech/neondb?sslmode=require")).toBe(false);
    expect(isLocalDatabaseUrl("postgres://localhost.evil.com/db")).toBe(false);
    expect(isLocalDatabaseUrl(undefined)).toBe(false);
    expect(isLocalDatabaseUrl("not a url")).toBe(false);
  });

  it("assertLocalDatabase throws for a remote database", () => {
    expect(() => assertLocalDatabase("postgres://u:p@db.example.com/x")).toThrow(/local database/);
    expect(assertLocalDatabase("postgres://localhost/x")).toBe("postgres://localhost/x");
  });
});
