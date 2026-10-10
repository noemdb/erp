/** Mantenimiento global de base de datos (solo admin): backup, restore, limpieza.
 * Superficie pública del módulo. La DB solo se toca desde `repo.ts`
 * (operador global con rol migrador, fuera de `withTenant` por diseño:
 * no hay tenant en un backup/restore/limpieza total — ver ADR-037).
 */
export {
  PRACTICA_EMAILS,
  CLEAN_CONFIRM,
  RESTORE_CONFIRM,
  MAX_RESTORE_MB,
  MAX_RESTORE_BYTES,
  SAFETY_KEEP,
  CleanInputSchema,
  PreviewInputSchema,
  RestoreInputSchema,
  buildBackupFilename,
  looksLikeSqlDump,
  backupFilenameFor,
  sha256Hex,
  verifyDumpSql,
  appendHistory,
  readHistory,
  saveSafetyCopy,
  type HistoryEntry,
  type DumpVerification,
} from "./service";
export { cleanDatabaseAction, previewCleanAction, listCleanCompaniesAction } from "./actions";
