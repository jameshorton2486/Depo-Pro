import type { FieldRow } from "./fieldProjection";

export function getFieldRowKey(row: FieldRow): string {
  return row.id;
}

export function getRenderableFieldRowKeys(rows: readonly FieldRow[]): string[] {
  return rows.map(getFieldRowKey);
}

export function findNextConfirmableRowId(
  rows: readonly FieldRow[],
  currentRowId: string,
  locallyConfirmedIds: ReadonlySet<string>,
): string | null {
  if (rows.length === 0) {
    return null;
  }

  const currentIndex = rows.findIndex((row) => row.id === currentRowId);
  if (currentIndex === -1) {
    return null;
  }

  for (let offset = 1; offset <= rows.length; offset += 1) {
    const row = rows[(currentIndex + offset) % rows.length];
    if (
      row.value !== ""
      && row.status === "Needs Confirmation"
      && !row.conflict
      && !locallyConfirmedIds.has(row.id)
    ) {
      return row.id;
    }
  }

  return null;
}
