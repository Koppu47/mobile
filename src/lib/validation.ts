/**
 * Mobile input validation utilities to prevent out-of-range numbers and invalid payloads.
 */

export interface LogValidationInput {
  serviceName: string;
  mileage: number;
  date?: string;
  costThb?: number;
  volumeLitres?: number;
  productName?: string;
  notes?: string;
}

export function validateLogInput(data: LogValidationInput): { isValid: boolean; error?: string } {
  if (!data.serviceName || typeof data.serviceName !== 'string' || !data.serviceName.trim()) {
    return { isValid: false, error: 'กรุณาระบุชื่องานบริการหรือการดูแล' };
  }
  if (data.serviceName.trim().length > 200) {
    return { isValid: false, error: 'ชื่องานบริการยาวเกินกำหนด (สูงสุด 200 ตัวอักษร)' };
  }

  const mileage = Number(data.mileage);
  if (isNaN(mileage) || mileage < 0 || mileage > 2000000) {
    return { isValid: false, error: 'เลขไมล์ต้องอยู่ระหว่าง 0 ถึง 2,000,000 กม.' };
  }

  if (data.costThb !== undefined && data.costThb !== null) {
    const cost = Number(data.costThb);
    if (isNaN(cost) || cost < 0 || cost > 5000000) {
      return { isValid: false, error: 'ค่าใช้จ่ายต้องเป็นตัวเลขที่ถูกต้อง (ไม่ติดลบ)' };
    }
  }

  if (data.volumeLitres !== undefined && data.volumeLitres !== null) {
    const vol = Number(data.volumeLitres);
    if (isNaN(vol) || vol < 0 || vol > 200) {
      return { isValid: false, error: 'ปริมาณของเหลวต้องอยู่ระหว่าง 0 ถึง 200 ลิตร' };
    }
  }

  if (data.productName && data.productName.length > 200) {
    return { isValid: false, error: 'ชื่อผลิตภัณฑ์ยาวเกินกำหนด' };
  }

  if (data.notes && data.notes.length > 3000) {
    return { isValid: false, error: 'หมายเหตุยาวเกินกำหนด' };
  }

  return { isValid: true };
}
