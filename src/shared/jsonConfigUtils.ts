import { DatabaseConnection, Procedure } from './openEdgeConfigFile';

/**
 * Splits extraParameters string into args array, filtering out empty strings.
 */
export function splitExtraParameters(extraParameters: string | undefined): string[] {
  return (extraParameters ?? '').split(' ').filter((s) => s.length > 0);
}

/**
 * Ensures database connections are plain serializable objects.
 * Only includes fields used by dynrun.p (name, connect, aliases).
 */
export function sanitizeDbConnections(
  dbConnections: DatabaseConnection[] | undefined,
): Array<{ name: string; connect: string; aliases: string[] }> {
  if (!dbConnections || !Array.isArray(dbConnections)) return [];
  return dbConnections.map((db) => ({
    name: String(db.name ?? ''),
    connect: String(db.connect ?? ''),
    aliases: Array.isArray(db.aliases) ? db.aliases.map(String) : [],
  }));
}

/**
 * Ensures procedures are plain serializable objects.
 */
export function sanitizeProcedures(
  procedures: Procedure[] | undefined,
): Array<{ name: string; mode: string }> {
  if (!procedures || !Array.isArray(procedures)) return [];
  return procedures.map((p) => ({
    name: String(p.name ?? ''),
    mode: String(p.mode ?? ''),
  }));
}
