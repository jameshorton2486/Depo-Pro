// lib/transcription/config.ts
// Deepgram configuration for legal transcription

export const DEEPGRAM_MODELS = {
  STANDARD: 'nova-3',
  MEDICAL: 'nova-3-medical', 
  BILINGUAL: 'nova-3'
} as const;

export type DeepgramModelType = 'STANDARD' | 'MEDICAL' | 'BILINGUAL';

export interface DeepgramConfig {
  model: string;
  language?: string;
  detect_language?: boolean;
  punctuate: boolean;
  diarize: boolean;
  smart_format: boolean;
  paragraphs: boolean;
  utterances: boolean;
  filler_words: boolean;
  numerals: boolean;
  profanity_filter: boolean;
  keywords?: string[];
  alternatives?: number;
}

// Base configuration for all transcriptions
const BASE_CONFIG: Omit<DeepgramConfig, 'model'> = {
  punctuate: true,
  diarize: true,
  smart_format: true,
  paragraphs: true,
  utterances: true,
  filler_words: true,  // Keep filler words (verbatim legal requirement)
  numerals: true,
  profanity_filter: false,  // Legal transcripts must be verbatim
  alternatives: 0,
};

// Get configuration based on model type
export function getDeepgramConfig(modelType: DeepgramModelType): DeepgramConfig {
  const config: DeepgramConfig = {
    ...BASE_CONFIG,
    model: DEEPGRAM_MODELS[modelType],
    keywords: LEGAL_VOCABULARY,
  };

  // Bilingual mode enables language detection
  if (modelType === 'BILINGUAL') {
    config.detect_language = true;
    config.language = 'en'; // Primary language
  } else {
    config.language = 'en-US';
    config.detect_language = false;
  }

  return config;
}

// Model descriptions for UI
export const MODEL_DESCRIPTIONS = {
  STANDARD: {
    name: 'Standard (General Legal)',
    description: 'Best for contract disputes, family law, civil cases',
    model: 'nova-3'
  },
  MEDICAL: {
    name: 'Personal Injury / Medical',
    description: 'Optimized for medical malpractice, injury cases, workers\' comp - enhanced medical terminology',
    model: 'nova-3-medical',
    recommended: true
  },
  BILINGUAL: {
    name: 'Bilingual (English + Spanish)',
    description: 'For cases with interpreter or bilingual witness. Note: Uses general model for language detection',
    model: 'nova-3'
  }
} as const;

// Low confidence threshold for flagging words
export const LOW_CONFIDENCE_THRESHOLD = 0.85;

// Context window for flagged words (words before/after)
export const CONTEXT_WINDOW_SIZE = 5;

// Speaker types for depositions
export const SPEAKER_TYPES = [
  'Attorney',
  'Witness', 
  'Translator',
  'Court Reporter',
  'Videographer',
  'Opposing Counsel',
  'Expert Witness',
  'Guardian ad Litem',
  'Other'
] as const;

export type SpeakerType = typeof SPEAKER_TYPES[number];

// Custom Legal Vocabulary (304 terms - Civil & Personal Injury focused)
export const LEGAL_VOCABULARY: string[] = [
  // Civil Procedure
  'action',
  'plaintiff',
  'defendant',
  'complaint',
  'answer',
  'counterclaim',
  'cross-claim',
  'jurisdiction',
  'venue',
  'pleadings',
  'cause of action',
  'service of process',
  'statute of limitations',
  'diversity jurisdiction',
  'demurrer',
  'motion to dismiss',
  'default judgment',
  'interrogatories',
  'deposition',
  'request for production',
  'subpoena',
  'attorney-client privilege',
  'work product doctrine',
  'protective order',
  'summary judgment',
  'motion in limine',
  'settlement conference',
  'stipulation',
  'subpoena duces tecum',
  'voir dire',
  'opening statement',
  'direct examination',
  'cross-examination',
  'closing argument',
  'jury instructions',
  'verdict',
  'directed verdict',
  'mistrial',
  'judgment',
  'execution of judgment',
  'writ of execution',
  'motion for new trial',
  'garnishment',
  'contempt of court',
  'declaratory judgment',
  'notice of appeal',
  'appellate brief',
  'remand',
  'petition for certiorari',
  'class action',
  'quiet title',
  'ex parte',
  'temporary restraining order',
  'preliminary injunction',
  'arbitration',
  'mediation',
  
  // Evidence Law
  'evidence',
  'admissibility',
  'relevance',
  'materiality',
  'competence',
  'prejudice',
  'judicial notice',
  'direct evidence',
  'circumstantial evidence',
  'demonstrative evidence',
  'documentary evidence',
  'real evidence',
  'testimonial evidence',
  'hearsay',
  'best evidence rule',
  'parol evidence rule',
  'lay witness',
  'expert witness',
  'impeachment',
  'leading question',
  'hostile witness',
  'spousal privilege',
  'doctor-patient privilege',
  'present sense impression',
  'excited utterance',
  'dying declaration',
  'business records',
  'public records',
  'statement against interest',
  'probative value',
  'character evidence',
  'habit',
  'subsequent remedial measures',
  'compromise offers',
  'chain of custody',
  'self-authenticating',
  'photographic evidence',
  'Daubert standard',
  'Frye test',
  'forensic evidence',
  
  // Contract Law
  'contract',
  'offer',
  'acceptance',
  'consideration',
  'mutual assent',
  'capacity',
  'legality',
  'void contract',
  'voidable contract',
  'express contract',
  'implied contract',
  'bilateral contract',
  'executed contract',
  'executory contract',
  'adhesion contract',
  'quasi-contract',
  'counteroffer',
  'promissory estoppel',
  'statute of frauds',
  'substantial performance',
  'material breach',
  'anticipatory repudiation',
  'impossibility of performance',
  'frustration of purpose',
  'accord and satisfaction',
  'condition precedent',
  'compensatory damages',
  'consequential damages',
  'liquidated damages',
  'specific performance',
  'rescission',
  'reformation',
  'reliance damages',
  'mitigation',
  'duress',
  'undue influence',
  'fraud in the inducement',
  'mistake of fact',
  'unconscionability',
  'assignment',
  'delegation',
  'intended beneficiary',
  'novation',
  'privity of contract',
  'force majeure',
  
  // Personal Injury
  'negligence',
  'duty of care',
  'breach of duty',
  'proximate cause',
  'causation',
  'foreseeability',
  'standard of care',
  'reasonable person',
  'assumption of risk',
  'comparative negligence',
  'contributory negligence',
  'joint and several liability',
  'strict liability',
  'product liability',
  'premises liability',
  'vicarious liability',
  'respondeat superior',
  'loss of consortium',
  'pain and suffering',
  'emotional distress',
  'wrongful death',
  'survival action',
  'general damages',
  'special damages',
  'punitive damages',
  'pre-existing condition',
  'aggravation of injury',
  'medical expenses',
  'future medical expenses',
  'lost wages',
  'loss of earning capacity',
  'permanent disability',
  'disfigurement',
  'impairment rating',
  'maximum medical improvement',
  'independent medical examination',
  'life care plan',
  'vocational rehabilitation',
  
  // Medical Terms
  'diagnosis',
  'prognosis',
  'treatment',
  'surgery',
  'procedure',
  'medication',
  'prescription',
  'contraindication',
  'complication',
  'informed consent',
  'medical malpractice',
  'deviation from standard of care',
  'medical records',
  'hospital records',
  'radiology',
  'MRI',
  'CT scan',
  'X-ray',
  'physical therapy',
  'occupational therapy',
  'rehabilitation',
  'orthopedic',
  'neurological',
  'cervical',
  'thoracic',
  'lumbar',
  'herniation',
  'disc bulge',
  'radiculopathy',
  'stenosis',
  'fracture',
  'contusion',
  'laceration',
  'abrasion',
  'hematoma',
  'concussion',
  'traumatic brain injury',
  'TBI',
  'soft tissue injury',
  'range of motion',
  'ROM',
  'objective findings',
  'subjective complaints',
  'chronic pain',
  'acute',
  'onset',
  'etiology',
  'differential diagnosis',
  'referral',
  'consultation',
  'specialist',
  
  // Courtroom Protocol
  'objection',
  'sustained',
  'overruled',
  'sidebar',
  'bench conference',
  'motion',
  'ruling',
  'exhibit',
  'admitted into evidence',
  'marked for identification',
  'foundation',
  'authentication',
  'withdrawn',
  'stricken',
  'admonition',
  'curative instruction',
  'recess',
  'adjournment',
  'on the record',
  'off the record',
  'certification',
  'swear',
  'affirm',
  'oath',
  'perjury',
  'contempt',
  'sequestration',
  
  // Latin Legal Phrases
  'pro se',
  'prima facie',
  'res judicata',
  'collateral estoppel',
  'in limine',
  'de novo',
  'pro bono',
  'amicus curiae',
  'res ipsa loquitur',
  'per se',
  'de facto',
  'bona fide',
  'inter alia',
  'ab initio',
  'ipso facto',
  'modus operandi',
  'quid pro quo',
  'status quo',
  'ultra vires',
  'caveat emptor',
  
  // Deposition-Specific
  'deponent',
  'examining attorney',
  'defending attorney',
  'court reporter',
  'videographer',
  'transcript',
  'errata sheet',
  'read and sign',
  'correction',
  'form objection',
  'speaking objection',
  'instruction not to answer',
  'privilege',
  'beyond the scope',
  'asked and answered',
  'compound question',
  'vague and ambiguous',
  'calls for speculation',
  'lacks foundation',
  'assumes facts not in evidence',
  'argumentative',
  'harassing',
  'oppressive',
  'mark as exhibit',
  'previously marked',
  'admitted',
  'lodged'
];

// Key phrases that indicate attorney speech
export const ATTORNEY_PHRASES = [
  'state your name',
  'please state',
  'for the record',
  'raise your right hand',
  'do you swear',
  'let me ask you',
  'directing your attention',
  'would you agree',
  'is it fair to say',
  'isn\'t it true',
  'objection',
  'let the record reflect',
  'mark as exhibit',
];

// Key phrases that indicate court reporter speech
export const REPORTER_PHRASES = [
  'reporter',
  'csr',
  'certified shorthand reporter',
  'stenographer',
  'court reporter',
  'taking the oath',
  'raising your right hand',
  'state your name for the record',
  'spelling your name',
  'swear or affirm',
];

// Speaker analysis thresholds
export const MIN_WORDS_FOR_ANALYSIS = 10;
export const ATTORNEY_CONFIDENCE_BOOST = 0.15;
export const REPORTER_CONFIDENCE_BOOST = 0.2;
