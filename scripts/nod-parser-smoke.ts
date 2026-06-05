import { parseNODText } from "../src/lib/parsing/nodParser";
import { applyExtraction } from "../src/lib/parsing/applyExtraction";
import { emptyCaseRecord } from "../src/types/case";

const texasNodText = `
IN THE DISTRICT COURT OF BEXAR COUNTY, TEXAS
438TH JUDICIAL DISTRICT

JANE SMITH
Plaintiff

vs.

MERIDIAN INFRASTRUCTURE PARTNERS, LLC
Defendant

CAUSE NO. 2026-CI-10452

NOTICE OF ORAL DEPOSITION OF JUNIOR HERNANDEZ

Date: June 10, 2026
Time: 9:30 AM
Location: 1415 N. Akard Street, Dallas, TX 75201
Deponent: Junior Hernandez

THORNTON & ASSOCIATES, PLLC
Rebecca A. Thornton
State Bar No. 24012345
500 North Akard Street
Dallas, TX 75201
Phone: (214) 555-0110
Email: rebecca@thorntonlaw.com
ATTORNEYS FOR PLAINTIFF

MERIDIAN LEGAL DEPARTMENT, LLC
David K. Morales
State Bar No. 24054321
2100 Ross Avenue
Dallas, TX 75201
Phone: (214) 555-0170
Email: david@meridianlegal.com
ATTORNEYS FOR DEFENDANT
`;

const parsed = parseNODText(texasNodText);
const record = emptyCaseRecord("smoke_case_001", new Date("2026-06-04T00:00:00Z").toISOString());
const application = applyExtraction(parsed, record);

const result = {
  parsed,
  mapped: {
    fieldUpdates: application.fieldUpdates,
    conflicts: application.conflicts,
    attorneyAdds: application.attorneyAdds.map((entry) => ({
      name: entry.attorney.name.value,
      firm: entry.attorney.firm.value,
      representing: entry.attorney.representing.value,
      address: entry.attorney.address,
      city: entry.attorney.city,
      state: entry.attorney.state,
      zip: entry.attorney.zip,
      phone: entry.attorney.phone,
      email: entry.attorney.email,
    })),
    witnessAdds: application.witnessAdds.map((entry) => ({
      name: entry.witness.name.value,
      party_affiliation: entry.witness.party_affiliation.value,
    })),
    keyterms: application.keyterms,
  },
};

console.log(JSON.stringify(result, null, 2));
