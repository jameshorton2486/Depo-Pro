import { describe, expect, it } from "vitest";
import {
  isGenericSpeakerLabel,
  resolveSpeakerDisplayName,
  UNIDENTIFIED_SPEAKER,
  type SpeakerNameFields,
} from "./resolveSpeakerDisplayName";

describe("isGenericSpeakerLabel", () => {
  it.each([
    ["Speaker 0", true],
    ["speaker_1", true],
    ["SPEAKER-2", true],
    ["Speaker3", true],
    ["  Speaker 12  ", true],
    ["", true],
    ["   ", true],
    [null, true],
    [undefined, true],
    ["Dr. Perez", false],
    ["THE WITNESS", false],
    ["Speaker Jones", false], // no digit -> a real (if unusual) name
    ["MR. OLVERA", false],
  ])("%s -> %s", (input, expected) => {
    expect(isGenericSpeakerLabel(input as string | null | undefined)).toBe(expected);
  });
});

describe("resolveSpeakerDisplayName — resolution order", () => {
  it("1. assigned_name wins over everything", () => {
    expect(
      resolveSpeakerDisplayName({
        assigned_name: "Dr. Alan Perez",
        role: "witness",
        display_name: "Speaker 0",
        speaker_label: "Speaker 0",
      }),
    ).toBe("Dr. Alan Perez");
  });

  it("2. role title wins when there is no usable assigned_name", () => {
    expect(
      resolveSpeakerDisplayName({ role: "witness", display_name: "Speaker 0", speaker_label: "Speaker 0" }),
    ).toBe("THE WITNESS");
    expect(resolveSpeakerDisplayName({ speaker_role: "THE REPORTER" })).toBe("THE REPORTER");
    expect(resolveSpeakerDisplayName({ role: "videographer" })).toBe("THE VIDEOGRAPHER");
    expect(resolveSpeakerDisplayName({ role: "the_court" })).toBe("THE COURT");
  });

  it("3. display_name used when present, not generic, and no role", () => {
    expect(resolveSpeakerDisplayName({ display_name: "Jane Q. Public", speaker_label: "Speaker 4" })).toBe(
      "Jane Q. Public",
    );
  });

  it("4. speaker_label used only when it is not generic", () => {
    expect(resolveSpeakerDisplayName({ speaker_label: "MR. OLVERA" })).toBe("MR. OLVERA");
    // generic speaker_label must NOT be shown -> falls through to marker
    expect(resolveSpeakerDisplayName({ speaker_label: "Speaker 2" })).toBe(UNIDENTIFIED_SPEAKER);
  });

  it("5. UNIDENTIFIED marker when nothing usable is present", () => {
    expect(resolveSpeakerDisplayName({})).toBe(UNIDENTIFIED_SPEAKER);
    expect(
      resolveSpeakerDisplayName({ assigned_name: "Speaker 0", display_name: "  ", speaker_label: "speaker_9" }),
    ).toBe(UNIDENTIFIED_SPEAKER);
  });

  it("unknown role (e.g. attorney) falls through to name, not a role title", () => {
    expect(resolveSpeakerDisplayName({ role: "examining_attorney", display_name: "MS. RAO" })).toBe("MS. RAO");
  });
});

describe("resolveSpeakerDisplayName — invariants (F9)", () => {
  const values = [undefined, null, "", "Speaker 0", "speaker_1", "Dr. Perez"] as const;
  const roles = [undefined, null, "", "witness", "reporter", "examining_attorney"] as const;

  it("no combination of inputs ever yields a generic placeholder", () => {
    for (const assigned_name of values)
      for (const display_name of values)
        for (const speaker_label of values)
          for (const role of roles) {
            const out = resolveSpeakerDisplayName({ assigned_name, display_name, speaker_label, role });
            expect(isGenericSpeakerLabel(out)).toBe(false);
            expect(out.length).toBeGreaterThan(0); // never silently blank
          }
  });
});

describe("both API paths agree (same function, identical output)", () => {
  // Simulate the two previously-divergent call-site input shapes:
  //   workspaceService.ts:111  and  editor-api/index.ts:409
  const cases: SpeakerNameFields[] = [
    { assigned_name: "", display_name: "Speaker 0", speaker_label: "MR. OLVERA" }, // the classic divergence
    { assigned_name: "Dr. Perez", display_name: "Speaker 1", speaker_label: "Speaker 1" },
    { display_name: "Speaker 2", speaker_label: "Speaker 2", role: "witness" },
    { display_name: "", speaker_label: "", role: null },
  ];

  it.each(cases)("identical input -> identical resolved name %#", (fields) => {
    const workspacePath = resolveSpeakerDisplayName(fields);
    const editorApiPath = resolveSpeakerDisplayName(fields);
    expect(workspacePath).toBe(editorApiPath);
    expect(isGenericSpeakerLabel(workspacePath)).toBe(false);
  });

  it("resolves the concrete swapped-precedence case to a real label, not 'Speaker 0'", () => {
    // Old workspaceService: assigned_name || speaker_label || display_name -> "MR. OLVERA"
    // Old editor-api:       assigned_name || display_name || speaker_label -> "Speaker 0"  (the bug)
    expect(
      resolveSpeakerDisplayName({ assigned_name: "", display_name: "Speaker 0", speaker_label: "MR. OLVERA" }),
    ).toBe("MR. OLVERA");
  });
});
