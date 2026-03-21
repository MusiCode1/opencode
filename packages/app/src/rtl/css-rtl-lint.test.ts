/**
 * CSS RTL Protection Lint
 *
 * This test scans all CSS files in packages/ui/src/ and flags any use of
 * physical (left/right) CSS properties that break RTL layouts.
 *
 * WHY: The app supports RTL languages (Hebrew, Arabic). Physical properties
 * like `padding-left` always apply to the left side, but in RTL the "start"
 * side is on the right. CSS logical properties (`padding-inline-start`) adapt
 * automatically to the document direction.
 *
 * WHEN IT FAILS: A CSS file contains a physical property. The error message
 * shows the file, line number, and the logical property to use instead.
 *
 * EXCEPTIONS:
 * - `direction: rtl; text-align: left` blocks are intentional (truncate-start pattern)
 * - CSS comments are ignored
 */
import { describe, expect, test } from "bun:test"
import { readFileSync } from "fs"
import { join, relative } from "path"
import { Glob } from "bun"

const UI_SRC = join(import.meta.dir, "../../../../packages/ui/src")

const PHYSICAL_PATTERNS: Array<{ pattern: RegExp; suggestion: string }> = [
  { pattern: /\bpadding-left\b/, suggestion: "padding-inline-start" },
  { pattern: /\bpadding-right\b/, suggestion: "padding-inline-end" },
  { pattern: /\bmargin-left\b/, suggestion: "margin-inline-start" },
  { pattern: /\bmargin-right\b/, suggestion: "margin-inline-end" },
  { pattern: /\bborder-left\b/, suggestion: "border-inline-start" },
  { pattern: /\bborder-right\b/, suggestion: "border-inline-end" },
  { pattern: /\btext-align:\s*left\b/, suggestion: "text-align: start" },
  { pattern: /\btext-align:\s*right\b/, suggestion: "text-align: end" },
  { pattern: /\bborder-top-left-radius\b/, suggestion: "border-start-start-radius" },
  { pattern: /\bborder-top-right-radius\b/, suggestion: "border-start-end-radius" },
  { pattern: /\bborder-bottom-left-radius\b/, suggestion: "border-end-start-radius" },
  { pattern: /\bborder-bottom-right-radius\b/, suggestion: "border-end-end-radius" },
]

/** Lines that use `direction: rtl; text-align: left` are intentional (truncate-start) */
function isIntentionalRtlBlock(lines: string[], lineIndex: number): boolean {
  const context = lines.slice(Math.max(0, lineIndex - 2), lineIndex + 3).join("\n")
  return context.includes("direction: rtl")
}

function isComment(line: string): boolean {
  const trimmed = line.trim()
  return trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.startsWith("//")
}

/** Standalone `left:` or `right:` as positioning properties */
const POSITION_LEFT = /^\s*left\s*:/
const POSITION_RIGHT = /^\s*right\s*:/

describe("CSS RTL lint", () => {
  test("no physical direction properties in UI CSS files", async () => {
    const violations: string[] = []
    const glob = new Glob("**/*.css")

    for await (const path of glob.scan(UI_SRC)) {
      const fullPath = join(UI_SRC, path)
      const content = readFileSync(fullPath, "utf-8")
      const lines = content.split("\n")

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (isComment(line)) continue
        if (isIntentionalRtlBlock(lines, i)) continue

        for (const { pattern, suggestion } of PHYSICAL_PATTERNS) {
          if (pattern.test(line)) {
            violations.push(`${relative(UI_SRC, fullPath)}:${i + 1} — use \`${suggestion}\` instead of \`${pattern.source.replace(/\\b/g, "").replace(/\\s\*/g, " ")}\``)
          }
        }

        if (POSITION_LEFT.test(line)) {
          violations.push(`${relative(UI_SRC, fullPath)}:${i + 1} — use \`inset-inline-start\` instead of \`left:\``)
        }
        if (POSITION_RIGHT.test(line)) {
          violations.push(`${relative(UI_SRC, fullPath)}:${i + 1} — use \`inset-inline-end\` instead of \`right:\``)
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} physical CSS properties that break RTL:\n\n${violations.join("\n")}\n\n` +
          "Use CSS logical properties instead. See packages/app/src/rtl/css-rtl-lint.test.ts for mapping.",
      )
    }
  })
})
