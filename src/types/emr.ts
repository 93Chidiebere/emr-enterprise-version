export type Department =
  | "RECEPTION"
  | "TRIAGE"
  | "CONSULTATION"
  | "LABORATORY"
  | "RADIOLOGY"
  | "TREATMENT"
  | "WARD"
  | "DISCHARGED";

export type RoleId =
  | "receptionist"
  | "triage_nurse"
  | "doctor"
  | "mls"
  | "radiographer"
  | "treatment_nurse"
  | "director";

export interface RoleConfig {
  id: RoleId;
  title: string;
  department: Department;
  cadre: string;
  description: string;
  badge: string;
}

export interface UserAccount {
  id: string;
  fullName: string;
  email?: string;
  assignedRole: RoleId;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  password?: string;
  createdAt: string;
}



export interface VitalsRecord {
  id: string;
  timestamp: string;
  takenBy: string;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  pulseRate: number; // bpm
  temperature: number; // Celsius
  respiratoryRate: number; // breaths/min
  spO2: number; // %
  weightKg: number;
  heightCm: number;
  bmi: number;
  urgency: "routine" | "urgent" | "emergency";
  chiefComplaint: string;
  triageNotes?: string;
}

export interface Icd10Code {
  code: string; // e.g. "B50.9"
  description: string; // WHO ICD-10 wording
}

export interface DoctorNote {
  id: string;
  timestamp: string;
  doctorName: string;
  historyOfPresentIllness: string;
  physicalExamFindings: string;
  provisionalDiagnosis: string;
  provisionalIcd10?: Icd10Code;
  definitiveDiagnosis?: string;
  definitiveIcd10?: Icd10Code;
  clinicalPlan: string;
}

export interface LabOrder {
  id: string;
  timestampOrdered: string;
  doctorName: string;
  testName: string;
  priority: "routine" | "urgent" | "stat";
  clinicalIndication: string;
  status: "pending" | "in_progress" | "completed";
  timestampCompleted?: string;
  scientistName?: string;
  resultFindings?: string;
  quantitativeValue?: string;
  referenceRange?: string;
  scientistComments?: string;
}

export interface RadiologyOrder {
  id: string;
  timestampOrdered: string;
  doctorName: string;
  studyType: string;
  indication: string;
  status: "pending" | "completed";
  timestampCompleted?: string;
  radiographerName?: string;
  findingsReport?: string;
  impression?: string;
}

export interface MedicationAdministration {
  id: string;
  timestampOrdered: string;
  doctorName: string;
  drugName: string;
  dosage: string;
  route: "IV" | "IM" | "SC" | "Oral" | "Topical" | "Inhalation";
  frequency: string;
  instructions: string;
  status: "pending" | "administered" | "refused" | "discontinued";
  timestampAdministered?: string;
  nurseName?: string;
  injectionSite?: string;
  nurseNotes?: string;
}

export interface RoutingEvent {
  id: string;
  timestamp: string;
  fromDepartment: Department;
  toDepartment: Department;
  authorizedBy: string;
  reason: string;
}

export interface Patient {
  id: string;
  hospitalNumber: string;
  fullName: string;
  age: number;
  gender: "Female" | "Male" | "Other";
  dateOfBirth: string;
  phoneNumber: string;
  address: string;
  nextOfKin: {
    name: string;
    relation: string;
    phone: string;
  };
  paymentType: "Out-of-Pocket / Cash" | "NHIS / Health Insurance" | "Corporate HMO";
  registeredAt: string;
  registeredBy: string;
  currentDepartment: Department;
  lastUpdated: string;
  vitalsHistory: VitalsRecord[];
  doctorNotes: DoctorNote[];
  labOrders: LabOrder[];
  radiologyOrders: RadiologyOrder[];
  medications: MedicationAdministration[];
  routingHistory: RoutingEvent[];
  status: "Active" | "Discharged";
}

export const DEPARTMENTS_METADATA: Record<
  Department,
  { name: string; code: string; shortName: string; description: string }
> = {
  RECEPTION: {
    name: "Front Desk & Medical Records",
    code: "REC",
    shortName: "Front Desk",
    description: "Patient registration, chart creation, and initial queue routing.",
  },
  TRIAGE: {
    name: "Nurse Triage & Clinical Vitals",
    code: "TRG",
    shortName: "Triage",
    description: "Physiological parameter capture, vital sign assessment, and acuity tagging.",
  },
  CONSULTATION: {
    name: "Physician Consultation",
    code: "DOC",
    shortName: "Consultation",
    description: "Clinical evaluation, differential diagnosis, laboratory, imaging, and medication ordering.",
  },
  LABORATORY: {
    name: "Medical Laboratory Services (MLS)",
    code: "MLS",
    shortName: "Laboratory",
    description: "Specimen analysis, diagnostic pathology panels, and clinical report validation.",
  },
  RADIOLOGY: {
    name: "Radiology & Diagnostic Imaging",
    code: "RAD",
    shortName: "Radiology",
    description: "Radiographic imaging, ultrasound diagnostics, and imaging reports.",
  },
  TREATMENT: {
    name: "Pharmacy & Medication Dispensing",
    code: "PHM",
    shortName: "Pharmacy",
    description: "Dispensing of prescribed medicines, injection and IV infusion administration, and medication counselling.",
  },
  WARD: {
    name: "Inpatient Ward & Bedside Care",
    code: "WRD",
    shortName: "Inpatient Ward",
    description: "Inpatient continuous monitoring, round charting, and recovery care.",
  },
  DISCHARGED: {
    name: "Outpatient Discharge & Archival",
    code: "DIS",
    shortName: "Discharged",
    description: "Completed clinical episodes, outpatient discharge summaries, and medical records archival.",
  },
};

export const HOSPITAL_ROLES: RoleConfig[] = [
  {
    id: "receptionist",
    title: "Reception Officer",
    department: "RECEPTION",
    cadre: "Health Records & Information",
    description: "Enrolls new patients, issues Trinity University Hospital EHR record numbers, and directs visitors to relevant stations.",
    badge: "REC",
  },
  {
    id: "triage_nurse",
    title: "Triage Staff Nurse",
    department: "TRIAGE",
    cadre: "Nursing & Midwifery",
    description: "Measures blood pressure, temperature, pulse, SpO2, BMI, and assigns clinical priority flags.",
    badge: "TRG",
  },
  {
    id: "doctor",
    title: "Attending Physician / MO",
    department: "CONSULTATION",
    cadre: "Clinical Medicine",
    description: "Conducts history taking, physical exams, orders laboratory and imaging investigations, codes diagnoses with ICD-10, and prescribes therapy.",
    badge: "DOC",
  },
  {
    id: "mls",
    title: "Medical Laboratory Scientist (MLS)",
    department: "LABORATORY",
    cadre: "Medical Laboratory Science",
    description: "Receives diagnostic test requests, analyzes specimens, and publishes validated diagnostic test findings.",
    badge: "MLS",
  },
  {
    id: "radiographer",
    title: "Diagnostic Radiographer",
    department: "RADIOLOGY",
    cadre: "Radiography & Imaging",
    description: "Carries out X-rays and scans, compiles radiological observations and imaging impressions.",
    badge: "RAD",
  },
  {
    id: "treatment_nurse",
    title: "Pharmacist / Pharmacy Staff",
    department: "TREATMENT",
    cadre: "Pharmacy & Nursing",
    description: "Dispenses prescribed medicines, administers IV/IM injections, logs medication administration, and discharges patients.",
    badge: "PHM",
  },
  {
    id: "director",
    title: "Clinical Director / Master View",
    department: "CONSULTATION",
    cadre: "Hospital Administration",
    description: "Hospital-wide clinical supervisor with full access to inspect all department queues and audit trails.",
    badge: "DIR",
  },
];


/** Personal details the Front Desk may correct after registration. */
export interface PatientDetailsInput {
  fullName: string;
  age: number;
  gender: "Female" | "Male" | "Other";
  dateOfBirth: string;
  phoneNumber: string;
  address: string;
  paymentType: string;
  nextOfKin: { name: string; relation: string; phone: string };
}
