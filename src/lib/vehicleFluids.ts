import { UserVehicle, FluidCategoryKey } from '../types';
import { getFluidRequirementsForVariant, getVariantById } from '../data/seedData';

export interface CategoryOption {
  key: FluidCategoryKey | 'parts' | 'other';
  label: string;
  isApplicable: boolean;
  notApplicableReason?: string;
  recommendedVolume?: number;
  standard?: string;
  warningNote?: string;
  iconName: string;
}

export interface VehicleCategoriesResult {
  available: CategoryOption[];
  notApplicable: CategoryOption[];
}

export function getVehicleCategoryOptions(vehicle: UserVehicle | null): VehicleCategoriesResult {
  const BASE_FLUID_CONFIG: {
    key: FluidCategoryKey;
    label: string;
    icon: string;
  }[] = [
    { key: 'engine_oil', label: 'น้ำมันเครื่อง & ไส้กรอง', icon: 'water-outline' },
    { key: 'transmission_fluid', label: 'น้ำมันเกียร์', icon: 'sync-outline' },
    { key: 'brake_fluid', label: 'น้ำมันเบรก', icon: 'speedometer-outline' },
    { key: 'coolant', label: 'น้ำยาหล่อเย็น', icon: 'snow-outline' },
    { key: 'windshield_washer', label: 'น้ำฉีดกระจก', icon: 'sparkles-outline' },
    { key: 'power_steering_fluid', label: 'น้ำมันพวงมาลัยเพาเวอร์', icon: 'radio-button-on-outline' },
    { key: 'differential_oil', label: 'น้ำมันเฟืองท้าย', icon: 'disc-outline' },
    { key: 'transfer_case_oil', label: 'น้ำมันทรานส์เฟอร์เคส (4WD)', icon: 'git-merge-outline' },
  ];

  if (!vehicle) {
    const defaultAvailable: CategoryOption[] = BASE_FLUID_CONFIG.map((c) => ({
      key: c.key,
      label: c.label,
      isApplicable: true,
      iconName: c.icon,
    }));
    defaultAvailable.push(
      { key: 'parts', label: 'กรองต่างๆ (Air / Cabin / Fuel Filter)', isApplicable: true, iconName: 'filter-outline' },
      { key: 'other', label: 'งานบริการอื่น ๆ / ตรวจเช็กทั่วไป', isApplicable: true, iconName: 'construct-outline' }
    );
    return { available: defaultAvailable, notApplicable: [] };
  }

  const reqs = getFluidRequirementsForVariant(vehicle.variantId);
  const variant = getVariantById(vehicle.variantId);

  const available: CategoryOption[] = [];
  const notApplicable: CategoryOption[] = [];

  for (const item of BASE_FLUID_CONFIG) {
    const spec = reqs?.specs[item.key];
    let isApplicable = true;
    let notApplicableReason = spec?.notApplicableReason;

    // --- ตรวจสอบระดับที่ 1: Database Spec Check ---
    if (spec?.isNotApplicable) {
      isApplicable = false;
      notApplicableReason = spec.notApplicableReason || 'ไม่จำเป็นสำหรับรถรุ่นนี้';
    }

    // --- ตรวจสอบระดับที่ 2: Engineering Rules Check ---
    // กฎที่ 1: น้ำมันพวงมาลัยเพาเวอร์ (power_steering_fluid)
    // หากรถใช้พวงมาลัยไฟฟ้า EPS ถือว่าไม่มีน้ำมันพวงมาลัยเพาเวอร์สำหรับเติม
    if (item.key === 'power_steering_fluid') {
      const isEps = variant?.steeringType === 'eps';
      if (isEps) {
        isApplicable = false;
        notApplicableReason = 'รถรุ่นนี้ใช้ระบบพวงมาลัยพาวเวอร์ไฟฟ้า (EPS) ไม่มีน้ำมันพวงมาลัยเพาเวอร์สำหรับเติม';
      }
    }

    // กฎที่ 2: น้ำมันทรานส์เฟอร์เคส (transfer_case_oil)
    // มีเฉพาะรถระบบขับเคลื่อน 4 ล้อ (4WD หรือ AWD) เท่านั้น
    if (item.key === 'transfer_case_oil') {
      const driveType = variant?.driveType || vehicle.driveType;
      const is4WD = driveType === '4wd' || driveType === 'awd';
      if (!is4WD) {
        isApplicable = false;
        notApplicableReason = 'ไม่ใช่รถขับเคลื่อน 4 ล้อ (4WD/AWD) ไม่มีชุด Transfer Case';
      }
    }

    // กฎที่ 3: น้ำมันเฟืองท้าย (differential_oil)
    // รถขับเคลื่อนล้อหน้า (FWD) ทั่วไป ห้องเฟืองท้ายรวมอยู่ในชุดเกียร์ (Transaxle) ไม่ต้องเปลี่ยนแยก
    if (item.key === 'differential_oil') {
      const driveType = variant?.driveType || vehicle.driveType;
      const isFWD = driveType === 'fwd';
      if (isFWD) {
        isApplicable = false;
        notApplicableReason = 'รถขับเคลื่อนล้อหน้า (FWD) ห้องเฟืองท้ายรวมอยู่ในชุดเกียร์ ไม่ต้องเปลี่ยนแยก';
      }
    }

    // ปรับแต่งชื่อน้ำมันเกียร์ให้ตรงตามรุ่นรถจริง
    let displayLabel = item.label;
    if (item.key === 'transmission_fluid') {
      const txName = vehicle.transmissionName || (variant?.transmission ? `${variant.transmission.type.toUpperCase()}` : '');
      if (txName) {
        displayLabel = `น้ำมันเกียร์ (${txName})`;
      } else {
        displayLabel = 'น้ำมันเกียร์ (CVT / AT / MT)';
      }
    }

    const categoryOption: CategoryOption = {
      key: item.key,
      label: displayLabel,
      isApplicable,
      notApplicableReason: notApplicableReason || undefined,
      recommendedVolume: spec?.volumeWithFilterLitres || spec?.volumeLitres,
      standard: spec?.standard,
      warningNote: spec?.warningNote,
      iconName: item.icon,
    };

    if (isApplicable) {
      available.push(categoryOption);
    } else {
      notApplicable.push(categoryOption);
    }
  }

  // เพิ่มอะไหล่และงานบริการอื่นๆ
  available.push(
    { key: 'parts', label: 'กรองต่างๆ (Air / Cabin / Fuel Filter)', isApplicable: true, iconName: 'filter-outline' },
    { key: 'other', label: 'งานบริการอื่น ๆ / ตรวจเช็กทั่วไป', isApplicable: true, iconName: 'construct-outline' }
  );

  return { available, notApplicable };
}
