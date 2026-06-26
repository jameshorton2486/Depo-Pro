export type CaseContextHint =
  | "personal_injury_spine"
  | "personal_injury_general"
  | "medical_malpractice"
  | "workers_compensation"
  | "products_liability"
  | "general";

export interface MedicalKeyterm {
  term: string;
  boost: number;
}

const MEDICAL_TERMS: Record<CaseContextHint, MedicalKeyterm[]> = {
  personal_injury_spine: [
    { term: "discectomy", boost: 6 },
    { term: "lumbar discectomy", boost: 6 },
    { term: "cervical discectomy", boost: 6 },
    { term: "radiculopathy", boost: 6 },
    { term: "cervical radiculopathy", boost: 6 },
    { term: "lumbar radiculopathy", boost: 6 },
    { term: "pars interarticularis", boost: 6 },
    { term: "epidural steroid injection", boost: 6 },
    { term: "foraminotomy", boost: 6 },
    { term: "cervical fusion", boost: 6 },
    { term: "lumbar fusion", boost: 6 },
    { term: "spinal fusion", boost: 5 },
    { term: "disc herniation", boost: 5 },
    { term: "herniated disc", boost: 5 },
    { term: "degenerative disc disease", boost: 5 },
    { term: "annular tear", boost: 5 },
    { term: "facet joint", boost: 5 },
    { term: "intervertebral disc", boost: 5 },
    { term: "orthopedic spine surgeon", boost: 5 },
    { term: "neurosurgery", boost: 4 },
    { term: "reasonable medical probability", boost: 5 },
    { term: "thecal sac", boost: 5 },
    { term: "foraminal stenosis", boost: 5 },
    { term: "spinal stenosis", boost: 5 },
    { term: "ligamentous rupture", boost: 5 },
    { term: "cervical spine", boost: 4 },
    { term: "lumbar spine", boost: 4 },
    { term: "thoracic spine", boost: 4 },
    { term: "MRI", boost: 4 },
    { term: "CT scan", boost: 4 },
    { term: "Waddell Signs", boost: 5 },
  ],
  personal_injury_general: [
    { term: "reasonable medical probability", boost: 5 },
    { term: "treating physician", boost: 4 },
    { term: "emergency room", boost: 4 },
    { term: "physical therapy", boost: 4 },
    { term: "MRI", boost: 4 },
    { term: "CT scan", boost: 4 },
    { term: "soft tissue", boost: 4 },
    { term: "sprain and strain", boost: 4 },
    { term: "motor vehicle crash", boost: 4 },
  ],
  medical_malpractice: [
    { term: "standard of care", boost: 6 },
    { term: "breach of duty", boost: 6 },
    { term: "proximate cause", boost: 5 },
    { term: "informed consent", boost: 5 },
    { term: "reasonable medical probability", boost: 5 },
    { term: "expert witness", boost: 4 },
    { term: "medical records", boost: 4 },
  ],
  workers_compensation: [
    { term: "compensable injury", boost: 6 },
    { term: "maximum medical improvement", boost: 6 },
    { term: "impairment rating", boost: 6 },
    { term: "Division of Workers Compensation", boost: 5 },
    { term: "treating doctor", boost: 4 },
    { term: "designated doctor", boost: 5 },
    { term: "return to work", boost: 4 },
  ],
  products_liability: [
    { term: "manufacturing defect", boost: 6 },
    { term: "design defect", boost: 6 },
    { term: "failure to warn", boost: 6 },
    { term: "strict liability", boost: 5 },
    { term: "product recall", boost: 5 },
  ],
  general: [],
};

export function getMedicalTerms(hint: CaseContextHint): MedicalKeyterm[] {
  return MEDICAL_TERMS[hint];
}
