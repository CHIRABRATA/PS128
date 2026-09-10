import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Batch 3 (F-11 & F-12): Code Hygiene & Clean Production Codebase", () => {
  it("F-11: ensures no ad-hoc run_phase test scripts exist in lib/ directories", () => {
    const libDirs = [
      path.resolve(__dirname, "../lib/actions"),
      path.resolve(__dirname, "../lib/api"),
      path.resolve(__dirname, "../lib/storage"),
    ];

    for (const dir of libDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        const legacyPhaseScripts = files.filter((f) => f.startsWith("run_phase"));
        expect(
          legacyPhaseScripts,
          `Found ad-hoc test scripts in ${dir}: ${legacyPhaseScripts.join(", ")}`
        ).toEqual([]);
      }
    }
  });

  it("F-12: ensures no stray console.log statements exist in sync.ts", () => {
    const syncFile = path.resolve(__dirname, "../lib/offline/sync.ts");
    expect(fs.existsSync(syncFile)).toBe(true);
    const content = fs.readFileSync(syncFile, "utf-8");
    expect(content).not.toContain("console.log(");
  });

  it("F-12: ensures no stray console.log statements exist in PwaRegister.tsx", () => {
    const pwaFile = path.resolve(__dirname, "../components/pwa/PwaRegister.tsx");
    expect(fs.existsSync(pwaFile)).toBe(true);
    const content = fs.readFileSync(pwaFile, "utf-8");
    expect(content).not.toContain("console.log(");
  });
});
