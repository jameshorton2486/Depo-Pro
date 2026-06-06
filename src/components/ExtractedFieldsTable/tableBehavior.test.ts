import { describe, expect, it } from "vitest";

import type { FieldRow } from "./fieldProjection";
import { getRenderableFieldRowKeys } from "./tableBehavior";

function makeRow(id: string, status: FieldRow["status"]): FieldRow {
  return {
    id,
    category: "Session",
    label: id,
    path: id,
    value: "value",
    rawValue: "value",
    source: "manual",
    displaySource: "Manual",
    status,
    conflict: false,
    conflictAlternate: null,
    confidence_score: null,
    required: false,
  };
}

describe("tableBehavior", () => {
  it("keeps row identity stable when a mid-list field becomes confirmed", () => {
    const before = [
      makeRow("caption.case_name", "Needs Confirmation"),
      makeRow("session.location_type", "Needs Confirmation"),
      makeRow("reporter.name", "Confirmed"),
    ];
    const after = [
      makeRow("caption.case_name", "Needs Confirmation"),
      makeRow("session.location_type", "Confirmed"),
      makeRow("reporter.name", "Confirmed"),
    ];

    expect(getRenderableFieldRowKeys(after)).toEqual(getRenderableFieldRowKeys(before));
  });
});
