export type Lang = 'uz' | 'en' | 'ru'
export type Theme = 'light' | 'midnight'
export type Role = 'admin' | 'director' | 'deputy' | 'head' | 'recruiter'
export type Source = 'internal' | 'external'
export type ContractType = 'staff' | 'gpd'
export type OrderStatus = 'open' | 'filled' | 'cancelled'
export type Urgency = 'urgent' | 'medium' | 'reserve'
export type ProbationResult = 'passed' | 'failed'
export type Stage =
  | 'found'
  | 'screening'
  | 'interview'
  | 'internship'
  | 'documents'
  | 'hired'
  | 'probation'
  | 'rejected'

export const ROLES: Role[] = ['admin', 'director', 'deputy', 'head', 'recruiter']
export const URGENCIES: Urgency[] = ['urgent', 'medium', 'reserve']
export const STAGES: Stage[] = [
  'found',
  'screening',
  'interview',
  'internship',
  'documents',
  'hired',
  'probation',
]
export const REJECTABLE_STAGES: Stage[] = ['screening', 'interview', 'internship', 'documents']
export const CANDIDATE_STAGES: Stage[] = [...STAGES, 'rejected']
export type PipelineStage = (typeof STAGES)[number]
export type StageDates = Partial<Record<PipelineStage, string>>

export interface User {
  id: string
  name: string
  email: string
  passwordHash: string
  role: Role
  avatar: string | null
  createdAt: string
}

export interface Order {
  id: string
  position: string
  department: string
  source: Source
  type: ContractType
  orderDate: string
  deadline: string
  comment: string
  status: OrderStatus
  qty: number
  urgency: Urgency
  responsibleId: string
  keyPosition: boolean
  closedAt: string | null
  createdBy: string
}

export interface Candidate {
  id: string
  fullName: string
  position: string
  source: Source
  previousPosition: string
  type: ContractType
  date: string
  comment: string
  stage: Stage
  hiredDate: string | null
  createdBy: string
  probationResult: ProbationResult | null
  probationDecidedAt: string | null
  rejectedFrom: Stage | null
  rejectedAt: string | null
  stageDates: StageDates
  keyPosition: boolean
}

export interface DeletedOrder extends Order {
  deletedAt: string
}

export interface DeletedCandidate extends Candidate {
  deletedAt: string
}

export interface Toast {
  id: string
  message: string
  kind: 'ok' | 'err'
}
