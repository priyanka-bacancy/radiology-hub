export interface HL7Params {
  messageId: string
  patientId: string
  patientName: string
  dob?: string
  gender?: string
  accessionNumber?: string
  modality: string
  findings: string
  impression: string
  recommendation?: string
  radiologistName: string
  signedAt: string
  studyDate?: string
}

export function buildORUR01(p: HL7Params): string {
  const fmt = (d: string) => d ? new Date(d).toISOString().replace(/[-:T.Z]/g, '').slice(0, 14) : ''
  const dt = fmt(p.signedAt)
  const dob = p.dob ? p.dob.replace(/-/g, '') : ''
  const escape = (s: string) => s.replace(/\|/g, '\\F\\').replace(/\n/g, '\\X000d\\')

  return [
    `MSH|^~\\&|RADIOLOGYHUB|HOSPITAL|RIS|HIS|${dt}||ORU^R01^ORU_R01|${p.messageId}|P|2.5|||NE|AL|USA|UNICODE UTF-8`,
    `PID|1||${p.patientId}^^^HOSP^MR||${escape(p.patientName)}||${dob}|${p.gender ?? 'U'}`,
    `OBR|1|${p.accessionNumber ?? ''}||${p.modality}^${p.modality} Examination|||${fmt(p.studyDate ?? p.signedAt)}||||||||${p.radiologistName}|||${dt}|||F`,
    `OBX|1|TX|59776-5^Procedure Findings^LN||${escape(p.findings)}||||||F|||${dt}`,
    `OBX|2|TX|19005-8^Radiology Report Impression^LN||${escape(p.impression)}||||||F|||${dt}`,
    p.recommendation ? `OBX|3|TX|18783-1^Recommendation^LN||${escape(p.recommendation)}||||||F|||${dt}` : null,
    `ZDS|${p.radiologistName}|${dt}|FINAL`,
  ].filter(Boolean).join('\r')
}
