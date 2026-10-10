// CarServices - Central TypeScript Type Definitions for Mobile

export interface Brand {
  id: string;
  name: string;
  country: string;
  logoUrl?: string;
}

export interface CarModel {
  id: string;
  brandId: string;
  name: string;
}

export interface Generation {
  id: string;
  modelId: string;
  name: string;
  startYear: number;
  endYear: number;
}

export interface EngineSpec {
  id: string;
  code: string;
  displacement: number;
  fuelType: 'gasoline' | 'diesel' | 'hybrid' | 'ev';
  powerHp?: number;
}

export interface Transmission {
  id: string;
  type: 'manual' | 'automatic' | 'cvt' | 'dct' | 'e-cvt' | 'at';
  speeds: number;
  code?: string;
}

export type SteeringType = 'eps' | 'hydraulic';
export type DriveType = 'fwd' | 'rwd' | '4wd' | 'awd';

export interface VehicleVariant {
  id: string;
  generationId: string;
  name: string;
  years: number[];
  engineSpec: EngineSpec;
  transmission: Transmission;
  driveType: DriveType;
  steeringType: SteeringType;
}

export type FluidCategoryKey =
  | 'engine_oil'
  | 'brake_fluid'
  | 'power_steering_fluid'
  | 'coolant'
  | 'windshield_washer'
  | 'transmission_fluid'
  | 'differential_oil'
  | 'transfer_case_oil';

export type VerificationStatus = 'verified' | 'pending' | 'needs_review' | 'draft';

export interface ReferenceSource {
  id: string;
  title: string;
  sourceType?: 'oem_manual' | 'official_bulletin' | 'verified_spec' | 'other';
  documentType?: string;
  url?: string;
  pageNumber?: string;
  publishedYear?: number;
}

export interface FluidSpecification {
  id: string;
  category: FluidCategoryKey;
  standard: string;
  viscosity?: string;
  volumeLitres: number;
  volumeWithFilterLitres?: number;
  intervalKm: number;
  intervalMonths: number;
  warningNote?: string;
  verificationStatus: VerificationStatus;
  referenceSource: ReferenceSource;
  isNotApplicable?: boolean;
  notApplicableReason?: string;
}

export interface VariantFluidRequirement {
  id: string;
  variantId: string;
  specs: Record<FluidCategoryKey, FluidSpecification>;
}

export interface UserVehicle {
  id: string;
  user_id?: string;
  nickname: string;
  licensePlate: string;
  brandName: string;
  modelName: string;
  generationName: string;
  year: number;
  variantName: string;
  engineCode: string;
  transmissionName: string;
  driveType: DriveType;
  currentMileage: number;
  color?: string;
  notes?: string;
  variantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceLog {
  id: string;
  user_id?: string;
  vehicleId: string;
  category: FluidCategoryKey | string;
  serviceName: string;
  date: string;
  mileage: number;
  productName?: string;
  volumeLitres?: number;
  volumeUsed?: number;
  costThb: number;
  cost?: number;
  notes?: string;
  receiptUrl?: string;
  createdAt?: string;
}

export type ReminderStatus = 'overdue' | 'due_soon' | 'normal' | 'completed' | 'not_recorded';

export interface ReminderItem {
  id: string;
  user_id?: string;
  vehicleId: string;
  category: FluidCategoryKey | string;
  title: string;
  dueMileage: number;
  dueDate: string;
  currentMileage?: number;
  remainingKm?: number;
  remainingDays?: number;
  status: ReminderStatus;
  warningNote?: string;
  isCompleted?: boolean;
  completedAt?: string;
  notes?: string;
  lastDoneDate?: string;
  lastDoneMileage?: number;
  hasRecord?: boolean;
  standard?: string;
  volumeLitres?: number;
  intervalKm?: number;
  intervalMonths?: number;
}

export type CheckResultRating = 'normal' | 'caution' | 'action_needed' | 'unable_to_check' | 'good' | 'warning' | 'critical' | 'untested';

export interface CheckItemResult {
  itemId: string;
  title: string;
  category: string;
  rating: CheckResultRating;
  notes?: string;
}

export interface BasicCheckLog {
  id: string;
  user_id?: string;
  vehicleId: string;
  date: string;
  mileage: number;
  overallStatus: 'normal' | 'caution' | 'action_needed';
  results: CheckItemResult[];
  notes?: string;
  inspectorName?: string;
  createdAt?: string;
}

export interface DIYGuideStep {
  stepNumber: number;
  title: string;
  description: string;
  safetyTip?: string;
  proTip?: string;
}

export interface DIYGuide {
  id: string;
  slug: string;
  title: string;
  category: FluidCategoryKey | string;
  difficulty: 'ง่ายมาก' | 'ง่าย' | 'ปานกลาง' | 'ยาก';
  estimatedMinutes: number;
  summary: string;
  toolsNeeded: string[];
  safetyWarnings: string[];
  whenToStopAndConsult: string[];
  steps: DIYGuideStep[];
}

export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  role: 'admin' | 'user';
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}
