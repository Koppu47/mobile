import { SafeStorage } from './safeStorage';
import { UserVehicle, MaintenanceLog, ReminderItem, ReminderStatus, BasicCheckLog, FluidCategoryKey } from '../types';
import { getFluidRequirementsForVariant } from '../data/seedData';

const KEYS = {
  VEHICLES: 'diy_car_fluids_vehicles',
  ACTIVE_CAR: 'diy_car_fluids_active_car_id',
  LOGS: 'diy_car_fluids_logs',
  CHECKS: 'diy_car_fluids_checks',
  DELETED_CHECKS: 'diy_car_fluids_deleted_checks',
};

const DEFAULT_VEHICLES: UserVehicle[] = [
  {
    id: 'car-vios-demo',
    nickname: 'Vios คันเก่ง',
    licensePlate: '1กข 4589 กทม.',
    brandName: 'Toyota',
    modelName: 'Vios',
    generationName: 'Gen 3 (NCP150 / NSP151)',
    year: 2018,
    variantName: '1.5 G / E / Entry (Dual VVT-i)',
    engineCode: '2NR-FBE (1.5L Dual VVT-i)',
    transmissionName: 'CVT-i 7 สปีด',
    driveType: 'fwd',
    currentMileage: 58400,
    color: 'สีเงิน Silver Metallic',
    notes: 'ใช้งานเดินทางประจำวันในเมือง',
    variantId: 'var-vios-nsp151-cvt',
    createdAt: new Date('2024-01-10').toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'car-hilux-demo',
    nickname: 'Revo สายลุย 4WD',
    licensePlate: '7กฆ 1234 กทม.',
    brandName: 'Toyota',
    modelName: 'Hilux',
    generationName: 'Hilux Revo / Rocco (GUN125 / 126)',
    year: 2021,
    variantName: '2.4 Rocco / High 4WD Auto',
    engineCode: '2GD-FTV (2.4L VN Turbo)',
    transmissionName: '6-Speed Super ECT 4WD',
    driveType: '4wd',
    currentMileage: 42150,
    color: 'สีขาวมุก White Pearl',
    notes: 'ใช้วิ่งทางไกลและออกทริปต่างจังหวัด',
    variantId: 'var-hilux-revo-24-4wd',
    createdAt: new Date('2024-02-15').toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_LOGS: MaintenanceLog[] = [
  {
    id: 'log-1',
    vehicleId: 'car-vios-demo',
    category: 'engine_oil',
    serviceName: 'เปลี่ยนถ่ายน้ำมันเครื่อง + ไส้กรองแท้',
    date: '2026-06-15',
    mileage: 50000,
    productName: 'Toyota Genuine 0W-20 SP',
    volumeLitres: 3.6,
    costThb: 1450,
    notes: 'เปลี่ยนกรองแท้ศูนย์',
    createdAt: new Date('2026-06-15').toISOString(),
  },
];

const DEFAULT_CHECKS: BasicCheckLog[] = [
  {
    id: 'chk-demo-1',
    vehicleId: 'car-vios-demo',
    date: '2026-09-20',
    mileage: 58000,
    overallStatus: 'normal',
    results: [
      { itemId: 'chk-oil', title: 'ระดับและสภาพน้ำมันเครื่อง', category: 'ของเหลวห้องเครื่อง', rating: 'normal' },
      { itemId: 'chk-coolant', title: 'ระดับน้ำยาหล่อเย็นในถังพัก', category: 'ของเหลวห้องเครื่อง', rating: 'normal' },
      { itemId: 'chk-brake', title: 'ระดับน้ำมันเบรก', category: 'ของเหลวห้องเครื่อง', rating: 'normal' },
      { itemId: 'chk-washer', title: 'ระดับน้ำฉีดกระจก', category: 'ของเหลวห้องเครื่อง', rating: 'normal' },
      { itemId: 'chk-battery', title: 'ขั้วแบตเตอรี่และคราบขี้เกลือ', category: 'ระบบไฟฟ้าและทัศนวิสัย', rating: 'normal' },
      { itemId: 'chk-lights', title: 'ไฟส่องสว่างและไฟสัญญาณรอบคัน', category: 'ระบบไฟฟ้าและทัศนวิสัย', rating: 'normal' },
      { itemId: 'chk-wipers', title: 'สภาพยางใบปัดน้ำฝน', category: 'ระบบไฟฟ้าและทัศนวิสัย', rating: 'caution' },
      { itemId: 'chk-pressure', title: 'แรงดันลมยาง 4 ล้อ', category: 'ช่วงล่างและยาง', rating: 'normal' },
      { itemId: 'chk-tread', title: 'ความลึกดอกยางและสภาพยาง', category: 'ช่วงล่างและยาง', rating: 'normal' },
    ],
    notes: 'ตรวจเช็กประจำสัปดาห์ปกติ ยางใบปัดน้ำฝนเริ่มแข็งเล็กน้อย',
    createdAt: new Date('2026-09-20').toISOString(),
  },
];

// ==========================================
// 1. User Vehicles (Local-First)
// ==========================================

export async function getUserVehicles(): Promise<UserVehicle[]> {
  try {
    const raw = await SafeStorage.getItem(KEYS.VEHICLES);
    if (!raw) {
      await SafeStorage.setItem(KEYS.VEHICLES, JSON.stringify(DEFAULT_VEHICLES));
      return DEFAULT_VEHICLES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_VEHICLES;
  }
}

type VehicleChangeListener = (newActiveId: string) => void;
type VehiclesListChangeListener = () => void;

const activeVehicleListeners = new Set<VehicleChangeListener>();
const vehiclesListListeners = new Set<VehiclesListChangeListener>();

export function onActiveVehicleChange(listener: VehicleChangeListener): () => void {
  activeVehicleListeners.add(listener);
  return () => {
    activeVehicleListeners.delete(listener);
  };
}

export function onVehiclesChange(listener: VehiclesListChangeListener): () => void {
  vehiclesListListeners.add(listener);
  return () => {
    vehiclesListListeners.delete(listener);
  };
}

export async function saveUserVehicle(vehicle: UserVehicle): Promise<void> {
  const current = await getUserVehicles();
  const index = current.findIndex((v) => v.id === vehicle.id);
  let updated: UserVehicle[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...vehicle, updatedAt: new Date().toISOString() };
  } else {
    updated = [vehicle, ...current];
  }
  await SafeStorage.setItem(KEYS.VEHICLES, JSON.stringify(updated));
  await setActiveVehicleId(vehicle.id);
  vehiclesListListeners.forEach((l) => {
    try {
      l();
    } catch {}
  });
}

export async function deleteUserVehicle(id: string): Promise<void> {
  const current = await getUserVehicles();
  const updated = current.filter((v) => v.id !== id);
  await SafeStorage.setItem(KEYS.VEHICLES, JSON.stringify(updated));
  const activeId = await getActiveVehicleId();
  if (activeId === id && updated.length > 0) {
    await setActiveVehicleId(updated[0].id);
  }
  vehiclesListListeners.forEach((l) => {
    try {
      l();
    } catch {}
  });
}

export async function getActiveVehicleId(): Promise<string> {
  const saved = await SafeStorage.getItem(KEYS.ACTIVE_CAR);
  if (saved) return saved;
  const list = await getUserVehicles();
  if (list.length > 0) {
    await SafeStorage.setItem(KEYS.ACTIVE_CAR, list[0].id);
    return list[0].id;
  }
  return '';
}

export async function setActiveVehicleId(id: string): Promise<void> {
  await SafeStorage.setItem(KEYS.ACTIVE_CAR, id);
  activeVehicleListeners.forEach((listener) => {
    try {
      listener(id);
    } catch (e) {
      console.warn('activeVehicleListener error:', e);
    }
  });
}

// ==========================================
// 2. Maintenance Logs (Local-First)
// ==========================================

export async function getMaintenanceLogs(vehicleId?: string): Promise<MaintenanceLog[]> {
  try {
    const raw = await SafeStorage.getItem(KEYS.LOGS);
    const list: MaintenanceLog[] = raw ? JSON.parse(raw) : DEFAULT_LOGS;
    if (vehicleId) return list.filter((l) => l.vehicleId === vehicleId);
    return list;
  } catch {
    return DEFAULT_LOGS;
  }
}

export async function addMaintenanceLog(log: MaintenanceLog): Promise<void> {
  const current = await getMaintenanceLogs();
  const updated = [log, ...current];
  await SafeStorage.setItem(KEYS.LOGS, JSON.stringify(updated));
}

export async function updateMaintenanceLog(log: MaintenanceLog): Promise<void> {
  const current = await getMaintenanceLogs();
  const updated = current.map((l) => (l.id === log.id ? log : l));
  await SafeStorage.setItem(KEYS.LOGS, JSON.stringify(updated));
}

export async function deleteMaintenanceLog(id: string): Promise<void> {
  const current = await getMaintenanceLogs();
  const updated = current.filter((l) => l.id !== id);
  await SafeStorage.setItem(KEYS.LOGS, JSON.stringify(updated));
}

// ==========================================
// 3. Basic Vehicle Checks (Local-First)
// ==========================================

export async function getBasicCheckLogs(vehicleId?: string): Promise<BasicCheckLog[]> {
  let deletedIds: string[] = [];
  try {
    const rawDeleted = await SafeStorage.getItem(KEYS.DELETED_CHECKS);
    if (rawDeleted) deletedIds = JSON.parse(rawDeleted);
  } catch {}

  const sortLogs = (list: BasicCheckLog[]) => {
    return list.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.date).getTime();
      const timeB = new Date(b.createdAt || b.date).getTime();
      return timeB - timeA;
    });
  };

  try {
    const raw = await SafeStorage.getItem(KEYS.CHECKS);
    if (raw !== null) {
      const list: BasicCheckLog[] = JSON.parse(raw);
      const filtered = list.filter((c) => !deletedIds.includes(c.id));
      const target = vehicleId ? filtered.filter((c) => c.vehicleId === vehicleId) : filtered;
      return sortLogs(target);
    }
    const defFiltered = DEFAULT_CHECKS.filter((c) => !deletedIds.includes(c.id));
    const target = vehicleId ? defFiltered.filter((c) => c.vehicleId === vehicleId) : defFiltered;
    return sortLogs(target);
  } catch {
    const defFiltered = DEFAULT_CHECKS.filter((c) => !deletedIds.includes(c.id));
    return sortLogs(defFiltered);
  }
}

export async function saveBasicCheckLog(log: BasicCheckLog): Promise<void> {
  try {
    const rawDeleted = await SafeStorage.getItem(KEYS.DELETED_CHECKS);
    if (rawDeleted) {
      const deletedIds: string[] = JSON.parse(rawDeleted);
      const cleaned = deletedIds.filter((dId) => dId !== log.id);
      await SafeStorage.setItem(KEYS.DELETED_CHECKS, JSON.stringify(cleaned));
    }
  } catch {}

  const current = await getBasicCheckLogs();
  const index = current.findIndex((c) => c.id === log.id);
  let updated: BasicCheckLog[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = log;
  } else {
    updated = [log, ...current];
  }
  updated.sort((a, b) => {
    const timeA = new Date(a.createdAt || a.date).getTime();
    const timeB = new Date(b.createdAt || b.date).getTime();
    return timeB - timeA;
  });
  await SafeStorage.setItem(KEYS.CHECKS, JSON.stringify(updated));
}

export async function deleteBasicCheckLog(id: string): Promise<void> {
  let deletedIds: string[] = [];
  try {
    const rawDeleted = await SafeStorage.getItem(KEYS.DELETED_CHECKS);
    if (rawDeleted) deletedIds = JSON.parse(rawDeleted);
  } catch {}
  if (!deletedIds.includes(id)) {
    deletedIds.push(id);
    await SafeStorage.setItem(KEYS.DELETED_CHECKS, JSON.stringify(deletedIds));
  }

  const current = await getBasicCheckLogs();
  const updated = current.filter((c) => c.id !== id);
  await SafeStorage.setItem(KEYS.CHECKS, JSON.stringify(updated));
}

// ==========================================
// 4. Reminders Calculator
// ==========================================

export function getRemindersForVehicle(
  vehicle: UserVehicle,
  logs: MaintenanceLog[]
): ReminderItem[] {
  const reqs = getFluidRequirementsForVariant(vehicle.variantId);
  if (!reqs) return [];

  const reminders: ReminderItem[] = [];
  const categories = Object.keys(reqs.specs) as FluidCategoryKey[];

  const titles: Record<string, string> = {
    engine_oil: 'เปลี่ยนถ่ายน้ำมันเครื่อง & ไส้กรอง',
    brake_fluid: 'เปลี่ยนถ่ายน้ำมันเบรก',
    power_steering_fluid: 'เปลี่ยนน้ำมันพวงมาลัยเพาเวอร์',
    coolant: 'เปลี่ยนถ่ายน้ำยาหล่อเย็น',
    windshield_washer: 'ตรวจระดับน้ำฉีดกระจก',
    transmission_fluid: 'เปลี่ยนถ่ายน้ำมันเกียร์',
    differential_oil: 'เปลี่ยนถ่ายน้ำมันเฟืองท้าย',
    transfer_case_oil: 'เปลี่ยนถ่ายน้ำมันทรานส์เฟอร์เคส',
  };

  for (const cat of categories) {
    const spec = reqs.specs[cat];
    if (spec.isNotApplicable) continue;

    // Filter logs for this fluid and sort latest first
    const catLogs = logs
      .filter((l) => l.category === cat)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || (b.mileage || 0) - (a.mileage || 0));

    const latest = catLogs[0];

    if (!latest) {
      // 1. เมื่อเป็นข้อมูลใหม่ (ยังไม่มีประวัติการบันทึก)
      reminders.push({
        id: `rem-${vehicle.id}-${cat}`,
        vehicleId: vehicle.id,
        category: cat,
        title: titles[cat] || String(cat),
        hasRecord: false,
        status: 'not_recorded',
        dueMileage: (vehicle.currentMileage || 0) + spec.intervalKm,
        dueDate: new Date().toISOString().split('T')[0],
        currentMileage: vehicle.currentMileage || 0,
        remainingKm: spec.intervalKm,
        remainingDays: spec.intervalMonths * 30,
        intervalKm: spec.intervalKm,
        intervalMonths: spec.intervalMonths,
        standard: spec.standard,
        volumeLitres: spec.volumeLitres,
        notes: spec.warningNote,
      });
    } else {
      // 2. เมื่อบันทึกรายการแล้ว: คำนวณเลขไมล์ครบกำหนดอิงตามเลขไมล์ที่ใส่ไปในบันทึกล่าสุด
      const dueMileage = latest.mileage + spec.intervalKm;
      const lastDate = new Date(latest.date);
      const dueDate = new Date(lastDate);
      dueDate.setMonth(dueDate.getMonth() + spec.intervalMonths);

      const currentMileage = vehicle.currentMileage || 0;
      const remainingKm = dueMileage - currentMileage;
      const now = new Date();
      const remainingDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let status: ReminderStatus = 'normal';
      if (remainingKm <= 0 || remainingDays <= 0) {
        status = 'overdue';
      } else if (remainingKm <= 1000 || remainingDays <= 30) {
        status = 'due_soon';
      }

      reminders.push({
        id: `rem-${vehicle.id}-${cat}`,
        vehicleId: vehicle.id,
        category: cat,
        title: titles[cat] || String(cat),
        hasRecord: true,
        dueMileage,
        dueDate: dueDate.toISOString().split('T')[0],
        status,
        currentMileage,
        remainingKm,
        remainingDays,
        lastDoneMileage: latest.mileage,
        lastDoneDate: latest.date,
        intervalKm: spec.intervalKm,
        intervalMonths: spec.intervalMonths,
        standard: spec.standard,
        volumeLitres: spec.volumeLitres,
        notes: spec.warningNote,
      });
    }
  }

  // Sort: รายการที่มีบันทึกแล้วขึ้นก่อน, ตามด้วยรายการที่ยังไม่ได้บันทึก
  return reminders.sort((a, b) => {
    if (a.hasRecord && !b.hasRecord) return -1;
    if (!a.hasRecord && b.hasRecord) return 1;
    return 0;
  });
}
