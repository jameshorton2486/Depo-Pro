import { describe, expect, it } from "vitest";

import type { FieldRow } from "./fieldProjection";
import {
  findNextConfirmableRowId,
  getRenderableFieldRowKeys,
} from "./tableBehavior";

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

  it("advances to the next unconfirmed row in visible mixed order", () => {
    const rows = [
      makeRow("caption.case_name", "Confirmed"),
      makeRow("session.location_type", "Needs Confirmation"),
      makeRow("session.start_time", "Needs Confirmation"),
      { ...makeRow("session.remote_platform", "Needs Confirmation"), value: "", rawValue: "" },
      { ...makeRow("reporter.name", "Conflict"), conflict: true },
      makeRow("witnesses[0].name", "Needs Confirmation"),
    ];

    expect(
      findNextConfirmableRowId(rows, "session.location_type", new Set(["session.location_type"])),
    ).toBe("session.start_time");

    expect(
      findNextConfirmableRowId(
        rows,
        "witnesses[0].name",
        new Set(["session.location_type", "session.start_time", "witnesses[0].name"]),
      ),
    ).toBeNull();
  });
});
