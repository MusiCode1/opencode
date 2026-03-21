/**
 * Tailwind RTL Protection Lint
 *
 * This test scans all TSX files in packages/ui/src/ and packages/app/src/
 * and flags Tailwind CSS classes that use physical directions (left/right)
 * instead of logical ones (start/end).
 *
 * WHY: Tailwind physical classes like `pl-3` (padding-left) always apply to
 * the left side. In RTL layouts, the "start" side is on the right. Logical
 * classes like `ps-3` (padding-inline-start) adapt automatically.
 *
 * WHEN IT FAILS: A TSX file uses a physical Tailwind class inside a
 * class/classList attribute. The error shows file, line, and the logical
 * class to use instead.
 *
 * EXCEPTIONS:
 * - `left-1/2 -translate-x-1/2` centering pattern (symmetrical, not directional)
 * - Lines that are imports, comments, or not inside class attributes
 * - translateX classes with explicit `ltr:`/`rtl:` variants are allowed
 */
import { describe, expect, test } from "bun:test"
import { readFileSync } from "fs"
import { join, relative } from "path"
import { Glob } from "bun"

const UI_SRC = join(import.meta.dir, "../../../../packages/ui/src")
const APP_SRC = join(import.meta.dir, "..")

/**
 * Physical Tailwind classes that should use logical equivalents for RTL support.
 * Each entry: [pattern to detect, suggested replacement]
 */
const PHYSICAL_CLASSES: Array<{ pattern: RegExp; suggestion: string }> = [
  { pattern: /\bpl-/, suggestion: "ps-" },
  { pattern: /\bpr-/, suggestion: "pe-" },
  { pattern: /\bml-/, suggestion: "ms-" },
  { pattern: /\bmr-/, suggestion: "me-" },
  { pattern: /\b-pl-/, suggestion: "-ps-" },
  { pattern: /\b-pr-/, suggestion: "-pe-" },
  { pattern: /\b-ml-/, suggestion: "-ms-" },
  { pattern: /\b-mr-/, suggestion: "-me-" },
  { pattern: /\btext-left\b/, suggestion: "text-start" },
  { pattern: /\btext-right\b/, suggestion: "text-end" },
  { pattern: /\bborder-l\b/, suggestion: "border-s" },
  { pattern: /\bborder-r\b/, suggestion: "border-e" },
  { pattern: /\bborder-l-/, suggestion: "border-s-" },
  { pattern: /\bborder-r-/, suggestion: "border-e-" },
  { pattern: /\brounded-tl-/, suggestion: "rounded-ss-" },
  { pattern: /\brounded-tr-/, suggestion: "rounded-se-" },
  { pattern: /\brounded-bl-/, suggestion: "rounded-es-" },
  { pattern: /\brounded-br-/, suggestion: "rounded-ee-" },
  { pattern: /\brounded-l-/, suggestion: "rounded-s-" },
  { pattern: /\brounded-r-/, suggestion: "rounded-e-" },
]

/**
 * translateX classes that need ltr:/rtl: variants.
 * Bare `-translate-x-full` or `translate-x-full` without direction prefix is wrong.
 */
const TRANSLATE_PATTERN = /(?<!\b(?:ltr|rtl):)-?translate-x-(?:full|\d)/

/** Centering pattern: `left-1/2 -translate-x-1/2` is not directional */
function isCenteringPattern(line: string): boolean {
  return /\bleft-1\/2\b/.test(line) && /-translate-x-1\/2\b/.test(line)
}

/** Check if a line contains a class/classList attribute context */
function isInClassContext(line: string): boolean {
  return /\bclass[=:{]|classList/.test(line)
}

/** Skip lines that are imports, comments, or non-class strings */
function shouldSkipLine(line: string): boolean {
  const trimmed = line.trim()
  return (
    trimmed.startsWith("import ") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("/*")
  )
}

async function scanDirectory(srcDir: string, label: string): Promise<string[]> {
  const violations: string[] = []
  const glob = new Glob("**/*.tsx")

  for await (const path of glob.scan(srcDir)) {
    const fullPath = join(srcDir, path)
    const content = readFileSync(fullPath, "utf-8")
    const lines = content.split("\n")

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (shouldSkipLine(line)) continue
      if (!isInClassContext(line)) continue
      if (isCenteringPattern(line)) continue

      for (const { pattern, suggestion } of PHYSICAL_CLASSES) {
        if (pattern.test(line)) {
          violations.push(`${label}/${relative(srcDir, fullPath)}:${i + 1} — use \`${suggestion}\` instead of \`${pattern.source.replace(/\\b/g, "")}\``)
        }
      }

      if (TRANSLATE_PATTERN.test(line)) {
        violations.push(`${label}/${relative(srcDir, fullPath)}:${i + 1} — translateX needs \`ltr:\`/\`rtl:\` variants for RTL`)
      }
    }
  }

  return violations
}

describe("Tailwind RTL lint", () => {
  test("no physical direction classes in UI and App TSX files", async () => {
    const uiViolations = await scanDirectory(UI_SRC, "ui")
    const appViolations = await scanDirectory(APP_SRC, "app")
    const violations = [...uiViolations, ...appViolations]

    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} physical Tailwind classes that break RTL:\n\n${violations.join("\n")}\n\n` +
          "Use logical Tailwind classes instead (ps-/pe-/ms-/me-/start-/end-/text-start/text-end).\n" +
          "For translateX animations, use ltr:/rtl: variants.\n" +
          "See packages/app/src/rtl/tailwind-rtl-lint.test.ts for mapping.",
      )
    }
  })
})
