import { existsSync, readFileSync, writeFileSync } from 'node:fs';

/**
 * Parse a `.env`-style string into a flat key/value record.
 * Supports `#` comments, blank lines, and single/double-quoted values.
 */
export function parseEnv(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!key) continue;
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/** Read a `.env` file into a record (empty record if the file doesn't exist). */
export function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  return parseEnv(readFileSync(path, 'utf8'));
}

/**
 * Write variables into a `.env` file. By default existing keys are preserved
 * and only the provided keys are added/overwritten — this never clobbers
 * unrelated secrets that already live in the file.
 */
export function writeEnvFile(
  path: string,
  vars: Record<string, string>,
  { append = true }: { append?: boolean } = {}
): Record<string, string> {
  const existing = append ? readEnvFile(path) : {};
  const merged = { ...existing, ...vars };
  const lines = Object.entries(merged).map(([k, v]) => `${k}=${v}`);
  writeFileSync(path, lines.join('\n') + '\n', 'utf8');
  return merged;
}
