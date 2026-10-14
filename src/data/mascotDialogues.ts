export type MascotMood = 'main01' | 'happy01' | 'curious';

export interface MascotDialogue {
  id: string;
  mood: MascotMood;
  text: string;
  enText?: string;
  isInitial?: boolean;
}

export const MASCOT_DIALOGUES: MascotDialogue[] = [
  // -----------------------------------------------------------------
  // 1. main01.png: รอยยิ้มเรียบร้อย (ค่าเริ่มต้นและคำพูดกลุ่มแรก)
  // -----------------------------------------------------------------
  {
    id: 'main-welcome',
    mood: 'main01',
    text: 'ยินดีต้อนรับค่ะ วันนี้จะทำอะไรดีนะ!',
    enText: 'Welcome! What would you like to do today?',
    isInitial: true,
  },
  {
    id: 'main-honda',
    mood: 'main01',
    text: 'กระบะ Honda ในไทยล่าสุดมีรุ่น Tourmaster ตั้งแต่ปี 1996 นู่นเลยนะ',
    enText: 'Did you know? Honda’s latest pickup truck in Thailand was the Tourmaster back in 1996!',
  },
  {
    id: 'main-park',
    mood: 'main01',
    text: 'จอดรถยนต์ทิ้งไว้นานๆ ไม่ดีนะ ทั้งยาง, แบตเตอรี่, น้ำมันเครื่อง จะเสื่อมโดยที่ยังไม่ได้ใช้เลย!',
    enText: 'Leaving your car parked too long isn’t good—tires, battery, and engine oil will degrade without being used!',
  },
  {
    id: 'main-plan',
    mood: 'main01',
    text: 'การทำรถต้องใจเย็นและต้องมีการวางแผนไว้',
    enText: 'DIY car maintenance requires patience and good planning.',
  },
  {
    id: 'main-tool',
    mood: 'main01',
    text: 'ถ้าอุปกรณ์ดี งานเราก็จะเสร็จเร็ว',
    enText: 'With the right tools, our work gets done much faster.',
  },

  // -----------------------------------------------------------------
  // 2. happy01.png: ยิ้มร่าเริง อ้าปากสดใส
  // -----------------------------------------------------------------
  {
    id: 'happy-mitsuba',
    mood: 'happy01',
    text: 'รู้ไหมว่า ยางปัดน้ำฝนแท้ศูนย์ของรถญี่ปุ่นส่วนมากเป็นของ “Mitsuba”',
    enText: 'Did you know? Most OEM Japanese car wipers are manufactured by "Mitsuba"!',
  },
  {
    id: 'happy-tire-air',
    mood: 'happy01',
    text: 'ลมยางมักรั่วออกตามระยะเวลา... อย่าลืมตรวจสอบนะ',
    enText: 'Tire pressure naturally drops over time... don’t forget to check regularly!',
  },
  {
    id: 'happy-jack',
    mood: 'happy01',
    text: 'การขึ้นแม่แรงที่ปลอดภัยต้องมีแม่แรงตะเข้, สามขาสองต้น, พร้อมรองด้วยยางอะไหล่',
    enText: 'Safe lifting requires a floor jack, two jack stands, and a spare tire underneath as backup.',
  },
  {
    id: 'happy-wiper-sound',
    mood: 'happy01',
    text: 'ปัดน้ำฝนเสียงดัง บางทีอาจเกิดจากคราบสกปรกติดกระจก... บางทีถ้าขัดเคลือบกระจกก็จะหาย',
    enText: 'Noisy wiper blades might just be dirty glass... polishing the windshield often solves it!',
  },
  {
    id: 'happy-brake-fluid',
    mood: 'happy01',
    text: 'หากน้ำมันเบรกไปโดนชิ้นพลาสติก อาจทำให้เกิดสีลอกได้',
    enText: 'Watch out: brake fluid spills on painted plastic parts will strip the paint!',
  },

  // -----------------------------------------------------------------
  // 3. curious.png: สงสัย / ใคร่รู้ / ชวนคิด
  // -----------------------------------------------------------------
  {
    id: 'curious-additive',
    mood: 'curious',
    text: 'เชื่อในหัวเชื้อเบนซินมั้ย บางทีควรลองใช้นะ ไม่เสียหายอะไร',
    enText: 'Do you believe in fuel additives? It might be worth trying occasionally, won’t hurt!',
  },
  {
    id: 'curious-handbrake',
    mood: 'curious',
    text: 'จอดรถนานๆ ควรดึงเบรกมือมั้ย... ระหว่างเกียร์พังเพราะรับน้ำหนักรถหรือเบรกติดจนจานสึก... เลือกอะไรดีล่ะ',
    enText: 'Parking for a long time: handbrake or not? Risking transmission strain vs. stuck brake pads... what would you choose?',
  },
  {
    id: 'curious-fuel-type',
    mood: 'curious',
    text: '91, 95, E20, E85 เลือกตามงบประมาณได้เลย ขอแค่รุ่นรถของคุณรองรับ!',
    enText: '91, 95, E20, E85—choose whatever fits your budget, as long as your car supports it!',
  },
  {
    id: 'curious-warmup',
    mood: 'curious',
    text: 'ไม่จำเป็นต้องวอร์มเครื่องตอนเช้านาน... นอกจากจะเปลืองน้ำมันโดยใช่เหตุแล้ว ยังทำให้เกิดคราบเขม่าสะสมง่ายขึ้นอีกด้วย',
    enText: 'No need to idle-warm your engine for too long in the morning—it wastes fuel and causes carbon build-up!',
  },
];
