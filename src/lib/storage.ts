import { SafeStorage } from './safeStorage';
import { UserVehicle, MaintenanceLog, ReminderItem, ReminderStatus, BasicCheckLog, FluidCategoryKey, UserProfile } from '../types';
import { getFluidRequirementsForVariant } from '../data/seedData';
import { supabase, isSupabaseConfigured } from './supabase';

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
    productName: 'Toyota Genuine Motor Oil SAE 0W-20 SP',
    volumeLitres: 3.6,
    costThb: 1450,
    notes: 'เปลี่ยนพร้อมแหวนรองน็อตถ่ายและกรองน้ำมันเครื่องลูกแท้ศูนย์',
    createdAt: new Date('2026-06-15').toISOString(),
  },
  {
    id: 'log-2',
    vehicleId: 'car-vios-demo',
    category: 'windshield_washer',
    serviceName: 'เติมน้ำยาฉีดกระจกขจัดคราบแมลง',
    date: '2026-08-01',
    mileage: 55000,
    productName: '3M Windshield Washer Fluid',
    volumeLitres: 2.0,
    costThb: 120,
    notes: 'เติมเต็มถังพักน้ำฉีดกระจก',
    createdAt: new Date('2026-08-01').toISOString(),
  },
  {
    id: 'log-3',
    vehicleId: 'car-hilux-demo',
    category: 'engine_oil',
    serviceName: 'เปลี่ยนน้ำมันเครื่องเกรดสังเคราะห์แท้ Low SAPS',
    date: '2026-05-20',
    mileage: 35000,
    productName: 'Castrol Magnatec Diesel 5W-30 ACEA C2',
    volumeLitres: 7.5,
    costThb: 2600,
    notes: 'เปลี่ยนไส้กรองและตรวจเช็กระบบ DPF',
    createdAt: new Date('2026-05-20').toISOString(),
  },
  {
    id: 'log-4',
    vehicleId: 'car-hilux-demo',
    category: 'differential_oil',
    serviceName: 'เปลี่ยนถ่ายน้ำมันเฟืองท้ายหน้า-หลัง',
    date: '2026-07-10',
    mileage: 40000,
    productName: 'Toyota Differential Gear Oil LT 75W-85 GL-5',
    volumeLitres: 4.8,
    costThb: 1850,
    notes: 'ถ่ายครบทั้งลูกหน้าและลูกหลังตามระยะ 40,000 กม.',
    createdAt: new Date('2026-07-10').toISOString(),
  },
];

async function getActiveAuthUser(): Promise<UserProfile | null> {
  try {
    const raw = await SafeStorage.getItem('carservices_active_auth_profile');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.id ? parsed : null;
  } catch {
    return null;
  }
}

async function getStorageKeys() {
  const user = await getActiveAuthUser();
  const isGuest = !user || !user.id || user.id === 'guest';
  const suffix = isGuest ? '_guest' : `_user_${user.id}`;

  return {
    isGuest,
    userId: isGuest ? undefined : user.id,
    VEHICLES: `diy_car_fluids_vehicles${suffix}`,
    ACTIVE_CAR: `diy_car_fluids_active_car_id${suffix}`,
    LOGS: `diy_car_fluids_logs${suffix}`,
    CHECKS: `diy_car_fluids_checks${suffix}`,
    DELETED_CHECKS: `diy_car_fluids_deleted_checks${suffix}`,
  };
}

export function isRealSupabaseUser(userId?: string): boolean {
  if (!userId || userId === 'guest' || userId.startsWith('demo-')) {
    return false;
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
}

function mapDbToVehicle(row: any): UserVehicle {
  return {
    id: row.id,
    user_id: row.user_id,
    nickname: row.nickname || '',
    licensePlate: row.license_plate,
    brandName: row.brand_name,
    modelName: row.model_name,
    generationName: row.generation_name,
    year: Number(row.year),
    variantName: row.variant_name,
    engineCode: row.engine_code,
    transmissionName: row.transmission_name,
    driveType: row.drive_type,
    currentMileage: Number(row.current_mileage || 0),
    color: row.color,
    notes: row.notes,
    variantId: row.variant_id,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function mapVehicleToDb(vehicle: UserVehicle, userId?: string) {
  return {
    id: vehicle.id,
    user_id: userId || vehicle.user_id || null,
    nickname: vehicle.nickname || '',
    license_plate: vehicle.licensePlate,
    brand_name: vehicle.brandName,
    model_name: vehicle.modelName,
    generation_name: vehicle.generationName,
    year: vehicle.year,
    variant_name: vehicle.variantName,
    engine_code: vehicle.engineCode,
    transmission_name: vehicle.transmissionName,
    drive_type: vehicle.driveType,
    current_mileage: vehicle.currentMileage,
    color: vehicle.color || '',
    notes: vehicle.notes || '',
    variant_id: vehicle.variantId,
    updated_at: new Date().toISOString(),
  };
}

export function sanitizeSafeUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^https:\/\/[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]+$/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function mapDbToLog(row: any): MaintenanceLog {
  return {
    id: row.id,
    user_id: row.user_id,
    vehicleId: row.vehicle_id,
    category: row.category,
    serviceName: row.service_name,
    date: row.date,
    mileage: Number(row.mileage),
    productName: row.product_name,
    volumeLitres: row.volume_litres ? Number(row.volume_litres) : undefined,
    costThb: Number(row.cost_thb || 0),
    notes: row.notes,
    receiptUrl: sanitizeSafeUrl(row.photo_url) || undefined,
    createdAt: row.created_at,
  };
}

function mapLogToDb(log: MaintenanceLog, userId?: string) {
  return {
    id: log.id,
    user_id: userId || log.user_id || null,
    vehicle_id: log.vehicleId,
    category: log.category,
    service_name: log.serviceName,
    date: log.date,
    mileage: log.mileage,
    product_name: log.productName || '',
    volume_litres: log.volumeLitres ?? null,
    cost_thb: log.costThb ?? 0,
    notes: log.notes ?? '',
    photo_url: sanitizeSafeUrl(log.receiptUrl),
  };
}

// Background Supabase Sync
let isSyncingVehiclesMobile = false;
async function syncVehiclesFromSupabase(userId?: string) {
  if (!isRealSupabaseUser(userId) || !isSupabaseConfigured() || isSyncingVehiclesMobile) return;
  isSyncingVehiclesMobile = true;
  try {
    const { data, error } = await supabase
      .from('user_vehicles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const mapped = data.map(mapDbToVehicle);
      const keys = await getStorageKeys();
      if (keys.userId === userId) {
        await SafeStorage.setItem(keys.VEHICLES, JSON.stringify(mapped));
        vehiclesListListeners.forEach((fn) => fn());
      }
    }
  } catch (err) {
    console.error('Mobile vehicle sync error:', err);
  } finally {
    isSyncingVehiclesMobile = false;
  }
}

let isSyncingLogsMobile = false;
async function syncLogsFromSupabase(userId?: string) {
  if (!isRealSupabaseUser(userId) || !isSupabaseConfigured() || isSyncingLogsMobile) return;
  isSyncingLogsMobile = true;
  try {
    const { data, error } = await supabase
      .from('maintenance_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (!error && data) {
      const mapped = data.map(mapDbToLog);
      const keys = await getStorageKeys();
      if (keys.userId === userId) {
        await SafeStorage.setItem(keys.LOGS, JSON.stringify(mapped));
      }
    }
  } catch (err) {
    console.error('Mobile log sync error:', err);
  } finally {
    isSyncingLogsMobile = false;
  }
}

// ==========================================
// 1. User Vehicles (Local & Cloud Sync)
// ==========================================

export async function getUserVehicles(): Promise<UserVehicle[]> {
  try {
    const keys = await getStorageKeys();
    const raw = await SafeStorage.getItem(keys.VEHICLES);

    if (!raw) {
      if (keys.isGuest) {
        await SafeStorage.setItem(keys.VEHICLES, JSON.stringify(DEFAULT_VEHICLES));
        return DEFAULT_VEHICLES;
      } else {
        await SafeStorage.setItem(keys.VEHICLES, JSON.stringify([]));
        if (isRealSupabaseUser(keys.userId)) {
          syncVehiclesFromSupabase(keys.userId);
        }
        return [];
      }
    }

    const list: UserVehicle[] = JSON.parse(raw);
    if (!keys.isGuest && isRealSupabaseUser(keys.userId)) {
      syncVehiclesFromSupabase(keys.userId);
    }
    return list;
  } catch {
    return [];
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
  const keys = await getStorageKeys();
  const current = await getUserVehicles();
  const index = current.findIndex((v) => v.id === vehicle.id);
  const vehicleWithUser: UserVehicle = {
    ...vehicle,
    user_id: keys.userId || vehicle.user_id,
    updatedAt: new Date().toISOString(),
  };

  let updated: UserVehicle[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = vehicleWithUser;
  } else {
    updated = [vehicleWithUser, ...current];
  }
  await SafeStorage.setItem(keys.VEHICLES, JSON.stringify(updated));
  await setActiveVehicleId(vehicle.id);
  vehiclesListListeners.forEach((fn) => fn());

  if (!keys.isGuest && isRealSupabaseUser(keys.userId) && isSupabaseConfigured()) {
    const payload = mapVehicleToDb(vehicleWithUser, keys.userId);
    supabase.from('user_vehicles').upsert(payload).then(({ error }) => {
      if (error) console.error('Error saving vehicle to Supabase mobile:', error);
    });
  }
}

export async function updateUserVehicle(vehicle: UserVehicle): Promise<void> {
  const keys = await getStorageKeys();
  const current = await getUserVehicles();
  const index = current.findIndex((v) => v.id === vehicle.id);
  if (index < 0) return;

  const vehicleWithUser: UserVehicle = {
    ...vehicle,
    user_id: keys.userId || vehicle.user_id,
    updatedAt: new Date().toISOString(),
  };

  const updated = [...current];
  updated[index] = vehicleWithUser;
  await SafeStorage.setItem(keys.VEHICLES, JSON.stringify(updated));
  vehiclesListListeners.forEach((fn) => fn());

  if (!keys.isGuest && isRealSupabaseUser(keys.userId) && isSupabaseConfigured()) {
    const payload = mapVehicleToDb(vehicleWithUser, keys.userId);
    supabase.from('user_vehicles').upsert(payload).then(({ error }) => {
      if (error) console.error('Error updating vehicle to Supabase mobile:', error);
    });
  }
}

export async function deleteUserVehicle(id: string): Promise<void> {
  const keys = await getStorageKeys();
  const current = await getUserVehicles();
  const list = current.filter((v) => v.id !== id);
  await SafeStorage.setItem(keys.VEHICLES, JSON.stringify(list));
  vehiclesListListeners.forEach((fn) => fn());

  // Cascade delete maintenance logs & clean orphans
  const existingIds = new Set(list.map((v) => v.id));
  const currentLogs = await getMaintenanceLogs();
  const logs = currentLogs.filter((l) => l.vehicleId !== id && existingIds.has(l.vehicleId));
  await SafeStorage.setItem(keys.LOGS, JSON.stringify(logs));

  // Cascade delete basic check logs & clean orphans
  const currentChecks = await getCheckLogs();
  const checks = currentChecks.filter((c) => c.vehicleId !== id && existingIds.has(c.vehicleId));
  await SafeStorage.setItem(keys.CHECKS, JSON.stringify(checks));

  const activeId = await getActiveVehicleId();
  if (activeId === id) {
    if (list.length > 0) {
      await setActiveVehicleId(list[0].id);
    } else {
      await SafeStorage.removeItem(keys.ACTIVE_CAR);
      activeVehicleListeners.forEach((fn) => fn(''));
    }
  }

  if (!keys.isGuest && isRealSupabaseUser(keys.userId) && isSupabaseConfigured()) {
    supabase
      .from('user_vehicles')
      .delete()
      .eq('id', id)
      .eq('user_id', keys.userId)
      .then(({ error }) => {
        if (error) console.error('Error deleting vehicle from Supabase mobile:', error);
      });
  }
}

export async function getActiveVehicleId(): Promise<string> {
  const keys = await getStorageKeys();
  const saved = await SafeStorage.getItem(keys.ACTIVE_CAR);
  if (saved) return saved;

  const list = await getUserVehicles();
  if (list.length > 0) {
    await SafeStorage.setItem(keys.ACTIVE_CAR, list[0].id);
    return list[0].id;
  }
  return '';
}

export async function setActiveVehicleId(id: string): Promise<void> {
  const keys = await getStorageKeys();
  await SafeStorage.setItem(keys.ACTIVE_CAR, id);
  activeVehicleListeners.forEach((fn) => fn(id));
}

// ==========================================
// 2. Maintenance Logs
// ==========================================

export async function getMaintenanceLogs(vehicleId?: string): Promise<MaintenanceLog[]> {
  try {
    const keys = await getStorageKeys();
    const raw = await SafeStorage.getItem(keys.LOGS);
    if (!raw) {
      if (keys.isGuest) {
        await SafeStorage.setItem(keys.LOGS, JSON.stringify(DEFAULT_LOGS));
        return vehicleId ? DEFAULT_LOGS.filter((l) => l.vehicleId === vehicleId) : DEFAULT_LOGS;
      } else {
        await SafeStorage.setItem(keys.LOGS, JSON.stringify([]));
        if (isRealSupabaseUser(keys.userId)) {
          syncLogsFromSupabase(keys.userId);
        }
        return [];
      }
    }
    const list: MaintenanceLog[] = JSON.parse(raw);
    if (!keys.isGuest && isRealSupabaseUser(keys.userId)) {
      syncLogsFromSupabase(keys.userId);
    }

    // Filter out orphaned logs if any exist (defense-in-depth)
    const vehicles = await getUserVehicles();
    const vehicleIdSet = new Set(vehicles.map((v) => v.id));
    const validLogs = list.filter((l) => vehicleIdSet.has(l.vehicleId));
    if (validLogs.length !== list.length) {
      await SafeStorage.setItem(keys.LOGS, JSON.stringify(validLogs));
    }

    if (vehicleId) {
      return validLogs.filter((l) => l.vehicleId === vehicleId);
    }
    return validLogs;
  } catch {
    return [];
  }
}

export async function addMaintenanceLog(log: MaintenanceLog): Promise<void> {
  const keys = await getStorageKeys();
  const current = await getMaintenanceLogs();
  const logWithUser: MaintenanceLog = {
    ...log,
    user_id: keys.userId || log.user_id,
  };
  const updated = [logWithUser, ...current];
  await SafeStorage.setItem(keys.LOGS, JSON.stringify(updated));

  const vehicles = await getUserVehicles();
  const v = vehicles.find((x) => x.id === log.vehicleId);
  if (v && log.mileage > v.currentMileage) {
    await saveUserVehicle({ ...v, currentMileage: log.mileage });
  }

  if (!keys.isGuest && isRealSupabaseUser(keys.userId) && isSupabaseConfigured()) {
    const payload = mapLogToDb(logWithUser, keys.userId);
    supabase.from('maintenance_logs').upsert(payload).then(({ error }) => {
      if (error) console.error('Error saving log to Supabase mobile:', error);
    });
  }
}

export async function updateMaintenanceLog(log: MaintenanceLog): Promise<void> {
  const keys = await getStorageKeys();
  const current = await getMaintenanceLogs();
  const updated = current.map((l) => (l.id === log.id ? { ...log, user_id: keys.userId || log.user_id } : l));
  await SafeStorage.setItem(keys.LOGS, JSON.stringify(updated));

  const vehicles = await getUserVehicles();
  const v = vehicles.find((x) => x.id === log.vehicleId);
  if (v && log.mileage > v.currentMileage) {
    await saveUserVehicle({ ...v, currentMileage: log.mileage });
  }

  if (!keys.isGuest && isRealSupabaseUser(keys.userId) && isSupabaseConfigured()) {
    const payload = mapLogToDb(log, keys.userId);
    supabase.from('maintenance_logs').upsert(payload).then(({ error }) => {
      if (error) console.error('Error updating log to Supabase mobile:', error);
    });
  }
}

export async function deleteMaintenanceLog(id: string): Promise<void> {
  const keys = await getStorageKeys();
  const current = await getMaintenanceLogs();
  const updated = current.filter((l) => l.id !== id);
  await SafeStorage.setItem(keys.LOGS, JSON.stringify(updated));

  if (!keys.isGuest && isRealSupabaseUser(keys.userId) && isSupabaseConfigured()) {
    supabase
      .from('maintenance_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', keys.userId)
      .then(({ error }) => {
        if (error) console.error('Error deleting log from Supabase mobile:', error);
      });
  }
}

// ==========================================
// 3. Reminders Calculation
// ==========================================

export function getRemindersForVehicle(vehicle: UserVehicle, customLogs: MaintenanceLog[] = []): ReminderItem[] {
  const reqs = getFluidRequirementsForVariant(vehicle.variantId);
  if (!reqs) return [];

  const reminders: ReminderItem[] = [];
  const categories = Object.keys(reqs.specs) as Array<keyof typeof reqs.specs>;

  const titles: Record<string, string> = {
    engine_oil: 'น้ำมันเครื่องและไส้กรอง',
    transmission_fluid: 'น้ำมันเกียร์',
    brake_fluid: 'น้ำมันเบรก',
    coolant: 'น้ำยาหล่อเย็นเครื่องยนต์',
    power_steering_fluid: 'น้ำมันพวงมาลัยเพาเวอร์',
    windshield_washer: 'น้ำยาฉีดกระจก',
    differential_oil: 'น้ำมันเฟืองท้าย',
    transfer_case_oil: 'น้ำมันทรานส์เฟอร์เคส (4WD)',
  };

  for (const cat of categories) {
    const spec = reqs.specs[cat];
    if (spec.isNotApplicable) continue;

    const catLogs = customLogs
      .filter((l) => l.category === cat)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const latest = catLogs[0];

    if (!latest) {
      reminders.push({
        id: `rem-${vehicle.id}-${cat}`,
        vehicleId: vehicle.id,
        category: cat,
        title: titles[cat] || String(cat),
        hasRecord: false,
        dueMileage: 0,
        dueDate: '',
        status: 'not_recorded',
        currentMileage: vehicle.currentMileage,
        intervalKm: spec.intervalKm,
        intervalMonths: spec.intervalMonths,
        standard: spec.standard,
        volumeLitres: spec.volumeLitres,
        notes: spec.warningNote,
      });
    } else {
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

  return reminders.sort((a, b) => {
    if (a.hasRecord && !b.hasRecord) return -1;
    if (!a.hasRecord && b.hasRecord) return 1;
    return 0;
  });
}

// ==========================================
// 4. Basic Check Logs
// ==========================================

export async function getCheckLogs(vehicleId?: string): Promise<BasicCheckLog[]> {
  try {
    const keys = await getStorageKeys();
    const raw = await SafeStorage.getItem(keys.CHECKS);
    if (!raw) return [];
    const list: BasicCheckLog[] = JSON.parse(raw);

    // Filter out orphaned check logs if any exist (defense-in-depth)
    const vehicles = await getUserVehicles();
    const vehicleIdSet = new Set(vehicles.map((v) => v.id));
    const validChecks = list.filter((c) => vehicleIdSet.has(c.vehicleId));
    if (validChecks.length !== list.length) {
      await SafeStorage.setItem(keys.CHECKS, JSON.stringify(validChecks));
    }

    if (vehicleId) {
      return validChecks.filter((c) => c.vehicleId === vehicleId);
    }
    return validChecks;
  } catch {
    return [];
  }
}

export async function addCheckLog(log: BasicCheckLog): Promise<void> {
  const keys = await getStorageKeys();
  const current = await getCheckLogs();
  const updated = [log, ...current];
  await SafeStorage.setItem(keys.CHECKS, JSON.stringify(updated));

  const vehicles = await getUserVehicles();
  const v = vehicles.find((x) => x.id === log.vehicleId);
  if (v && log.mileage > v.currentMileage) {
    await saveUserVehicle({ ...v, currentMileage: log.mileage });
  }

  if (!keys.isGuest && isRealSupabaseUser(keys.userId) && isSupabaseConfigured()) {
    const payload = {
      id: log.id,
      user_id: keys.userId,
      vehicle_id: log.vehicleId,
      date: log.date,
      mileage: log.mileage,
      overall_status: log.overallStatus,
      results: log.results,
      notes: log.notes || '',
    };
    supabase.from('basic_check_logs').upsert(payload).then(({ error }) => {
      if (error) console.error('Error saving check log to Supabase mobile:', error);
    });
  }
}

export async function deleteBasicCheckLog(id: string): Promise<void> {
  const keys = await getStorageKeys();
  const current = await getCheckLogs();
  const updated = current.filter((c) => c.id !== id);
  await SafeStorage.setItem(keys.CHECKS, JSON.stringify(updated));

  if (!keys.isGuest && isRealSupabaseUser(keys.userId) && isSupabaseConfigured()) {
    supabase.from('basic_check_logs').delete().eq('id', id).eq('user_id', keys.userId).then(({ error }) => {
      if (error) console.error('Error deleting check log in Supabase mobile:', error);
    });
  }
}

export const getBasicCheckLogs = getCheckLogs;
export const saveBasicCheckLog = addCheckLog;
