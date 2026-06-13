import { describe, expect, it } from "vitest";

import {
  adaptSpeakerRoleToStageS,
  buildIndexMap,
  participantLabel,
  roleToQaMode,
} from "./speakerMapping";

describe("speakerMapping", () => {
  describe("adaptSpeakerRoleToStageS", () => {
    it("maps the real stored vocabulary to Stage S roles", () => {
      expect(adaptSpeakerRoleToStageS("ATTORNEY")).toBe("examining_attorney");
      expect(adaptSpeakerRoleToStageS("WITNESS")).toBe("witness");
      expect(adaptSpeakerRoleToStageS("REPORTER")).toBe("court_reporter");
      expect(adaptSpeakerRoleToStageS("INTERPRETER")).toBe("interpreter");
      expect(adaptSpeakerRoleToStageS("OTHER")).toBe("other");
    });

    it("accepts lowercase persisted values and falls back unknowns to other", () => {
      expect(adaptSpeakerRoleToStageS("attorney")).toBe("examining_attorney");
      expect(adaptSpeakerRoleToStageS("witness")).toBe("witness");
      expect(adaptSpeakerRoleToStageS("reporter")).toBe("court_reporter");
      expect(adaptSpeakerRoleToStageS("interpreter")).toBe("interpreter");
      expect(adaptSpeakerRoleToStageS("other")).toBe("other");
      expect(adaptSpeakerRoleToStageS("mystery_role")).toBe("other");
      expect(adaptSpeakerRoleToStageS(null)).toBe("other");
      expect(adaptSpeakerRoleToStageS(undefined)).toBe("other");
    });
  });

  describe("roleToQaMode", () => {
    it("returns Q/A only for examining attorney and witness", () => {
      expect(roleToQaMode("examining_attorney")).toBe("Q");
      expect(roleToQaMode("witness")).toBe("A");
      expect(roleToQaMode("court_reporter")).toBe("");
      expect(roleToQaMode("interpreter")).toBe("");
      expect(roleToQaMode("other")).toBe("");
      expect(roleToQaMode(null)).toBe("");
    });
  });

  describe("participantLabel", () => {
    it("returns fixed labels for court officers", () => {
      expect(participantLabel("court_reporter", "Jane Doe", "Ms")).toBe("THE REPORTER");
      expect(participantLabel("videographer", "John Doe", "Mr")).toBe("THE VIDEOGRAPHER");
      expect(participantLabel("interpreter", "Ana Diaz", "Ms")).toBe("THE INTERPRETER");
    });

    it("builds named-role labels from honorific and surname", () => {
      expect(participantLabel("examining_attorney", "marco nunez", "mr")).toBe("MR. NUNEZ");
      expect(participantLabel("witness", "heath thomas", "dr.")).toBe("DR. THOMAS");
    });

    it("returns empty string when a named role is not finalized", () => {
      expect(participantLabel("examining_attorney", "", "mr")).toBe("");
      expect(participantLabel("examining_attorney", "Marco Nunez", "")).toBe("");
      expect(participantLabel("co_counsel", "Marco Nunez", "Judge")).toBe("");
    });

    it("uppercases freeform labels for other roles", () => {
      expect(participantLabel("other", " sidebar conference ", null)).toBe("SIDEBAR CONFERENCE");
      expect(participantLabel("off_record", "", null)).toBe("");
    });
  });

  describe("buildIndexMap", () => {
    it("maps speaker indices to participant info and keeps first duplicate assignment", () => {
      const indexMap = buildIndexMap([
        {
          role: "ATTORNEY",
          name: "Marco Nunez",
          honorific: "mr",
          speakerIndices: [3, 7],
          sortOrder: 1,
          createdAt: "2026-06-13T10:00:00.000Z",
        },
        {
          role: "WITNESS",
          name: "Heath Thomas",
          honorific: "dr",
          speakerIndices: [7, 9],
          sortOrder: 2,
          createdAt: "2026-06-13T11:00:00.000Z",
        },
      ]);

      expect(indexMap.get(3)).toEqual({
        role: "examining_attorney",
        name: "Marco Nunez",
        honorific: "mr",
        label: "MR. NUNEZ",
        qaMode: "Q",
      });
      expect(indexMap.get(7)).toEqual(indexMap.get(3));
      expect(indexMap.get(9)).toEqual({
        role: "witness",
        name: "Heath Thomas",
        honorific: "dr",
        label: "DR. THOMAS",
        qaMode: "A",
      });
    });

    it("keeps unmapped roles as colloquy entries", () => {
      const indexMap = buildIndexMap([
        {
          role: "UNKNOWN_ROLE",
          name: "Side Bar",
          honorific: null,
          speakerIndices: [4],
          sortOrder: 0,
          createdAt: "2026-06-13T09:00:00.000Z",
        },
      ]);

      expect(indexMap.get(4)).toEqual({
        role: "other",
        name: "Side Bar",
        honorific: "",
        label: "SIDE BAR",
        qaMode: "",
      });
    });
  });
});
