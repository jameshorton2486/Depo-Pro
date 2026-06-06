import { describe, expect, it } from "vitest";

import { emptyCaseRecord } from "../../types/case";
import { buildUfmMetadata } from "../ufm/buildUfmMetadata";
import {
  FEDERAL_NOD_FIXTURE,
  MULTI_PARTY_NOD_FIXTURE,
  TEXAS_STATE_NOD_FIXTURE,
  ZOOM_NOD_FIXTURE,
} from "./__fixtures__/ufmNoticeFixtures";
import { applyExtraction } from "./applyExtraction";

function buildRecord() {
  return emptyCaseRecord("case_ufm_fixture", "2026-06-06T12:00:00.000Z");
}

describe("UFM extraction expansion fixtures", () => {
  it("maps a federal notice into expanded caption, scheduling, and reporter-request fields", () => {
    const application = applyExtraction(FEDERAL_NOD_FIXTURE, buildRecord());

    expect(application.fieldUpdates.find((update) => update.path === "caption.jurisdiction_type")?.value).toBe("federal");
    expect(application.fieldUpdates.find((update) => update.path === "session.location_type")?.value).toBe("zoom");
    expect(application.fieldUpdates.find((update) => update.path === "service.service_date")?.value).toBe("2026-04-10");
    expect(application.fieldUpdates.find((update) => update.path === "reporter_requests.audiovisual_recording")?.value).toBe(true);
    expect(application.partyAdds).toHaveLength(3);
    expect(application.lawFirmAdds).toHaveLength(1);
  });

  it("captures Texas state scheduling metadata from the Garza-style fixture", () => {
    const application = applyExtraction(TEXAS_STATE_NOD_FIXTURE, buildRecord());

    expect(application.fieldUpdates.find((update) => update.path === "caption.jurisdiction_type")?.value).toBe("texas_state");
    expect(application.fieldUpdates.find((update) => update.path === "scheduling.ordered_by")?.value).toBe("Goldman & Peterson, PLLC");
    expect(application.fieldUpdates.find((update) => update.path === "scheduling.service_type")?.value).toBe("CR_plus_Zoom");
    expect(application.partyAdds).toHaveLength(4);
  });

  it("preserves the exact remote platform in scheduling metadata for non-Zoom remote notices", () => {
    const application = applyExtraction(ZOOM_NOD_FIXTURE, buildRecord());

    expect(application.fieldUpdates.find((update) => update.path === "session.location_type")?.value).toBe("zoom");
    expect(application.fieldUpdates.find((update) => update.path === "scheduling.remote_platform")?.value).toBe("Teams");
  });

  it("supports multi-party captions without collapsing party roles", () => {
    const application = applyExtraction(MULTI_PARTY_NOD_FIXTURE, buildRecord());

    expect(application.partyAdds.map((entry) => entry.party.role.value)).toContain("third_party");
    expect(application.partyAdds.map((entry) => entry.party.role.value)).toContain("cross_plaintiff");
  });

  it("surfaces expanded UFM metadata from the case payload", () => {
    const record = buildRecord();
    record.caption.case_number.value = "C-1628-25-E";
    record.caption.case_style.value = "Maria L. Lopez De Martinez and Alfredo Montes Navarro v. Rafael Robles Calderon and All American Heavy Equipment Leasing, LLC";
    record.caption.court_name.value = "275th Judicial District Court";
    record.caption.judicial_district.value = "275th Judicial District";
    record.caption.state.value = "Texas";
    record.caption.jurisdiction_type.value = "texas_state";
    record.scheduling.noticing_party.value = "Plaintiff";
    record.scheduling.service_type.value = "CR_plus_Zoom";
    record.service.service_date.value = "2026-04-20";
    record.service.service_emails.value = ["Raul@LJGLaw.com"];
    record.parties = [
      {
        party_id: "party_1",
        name: { value: "Maria L. Lopez De Martinez", source: "extracted", confirmed: false, conflict: false, confidence_score: 0.9 },
        role: { value: "plaintiff", source: "extracted", confirmed: false, conflict: false, confidence_score: 0.9 },
        role_modifier: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
        entity_type: { value: "individual", source: "extracted", confirmed: false, conflict: false, confidence_score: 0.5 },
        fka_or_dba: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      },
    ];

    const envelope = buildUfmMetadata({ record, provenance: [] });

    expect(envelope.ufm_metadata.jurisdiction_type).toBe("texas_state");
    expect(envelope.ufm_metadata.judicial_district).toBe("275th Judicial District");
    expect(envelope.ufm_metadata.noticing_party).toBe("Plaintiff");
    expect(envelope.ufm_metadata.service_type).toBe("CR_plus_Zoom");
    expect(envelope.ufm_metadata.service_emails).toEqual(["Raul@LJGLaw.com"]);
    expect(envelope.ufm_metadata.parties).toHaveLength(1);
  });
});
