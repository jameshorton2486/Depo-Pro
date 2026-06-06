import type { FieldRow } from "./fieldProjection";

export function getFieldRowKey(row: FieldRow): string {
  return row.id;
}

export function getRenderableFieldRowKeys(rows: readonly FieldRow[]): string[] {
  return rows.map(getFieldRowKey);
}
