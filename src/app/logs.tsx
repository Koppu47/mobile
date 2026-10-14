import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getUserVehicles,
  getActiveVehicleId,
  getMaintenanceLogs,
  addMaintenanceLog,
  deleteMaintenanceLog,
  getBasicCheckLogs,
  saveBasicCheckLog,
  deleteBasicCheckLog,
  onActiveVehicleChange,
  onVehiclesChange,
} from '../lib/storage';
import { UserVehicle, MaintenanceLog, FluidCategoryKey, BasicCheckLog, CheckItemResult, CheckResultRating } from '../types';
import { getFluidRequirementsForVariant } from '../data/seedData';
import { BASIC_CHECK_ITEMS, CheckTemplateItem } from '../data/checkTemplates';
import { useLanguage } from '../lib/LanguageContext';
import { getVehicleCategoryOptions } from '../lib/vehicleFluids';
const RAN_IMAGES = {
  normal: require('../../assets/ran_normal.png'),
  smile: require('../../assets/ran_smile.png'),
  sus: require('../../assets/ran_sus.png'),
  concern: require('../../assets/ran_concern.png'),
};
const CATEGORIES: { key: FluidCategoryKey | 'parts' | 'other'; label: string }[] = [
  { key: 'engine_oil', label: 'น้ำมันเครื่อง' },
  { key: 'transmission_fluid', label: 'น้ำมันเกียร์' },
  { key: 'brake_fluid', label: 'น้ำมันเบรก' },
  { key: 'coolant', label: 'น้ำยาหล่อเย็น' },
  { key: 'windshield_washer', label: 'น้ำฉีดกระจก' },
  { key: 'power_steering_fluid', label: 'น้ำมันพวงมาลัย' },
  { key: 'differential_oil', label: 'น้ำมันเฟืองท้าย' },
  { key: 'transfer_case_oil', label: 'น้ำมันทรานส์เฟอร์' },
  { key: 'parts', label: 'กรองต่างๆ' },
  { key: 'other', label: 'งานบริการอื่น ๆ' },
];
const PART_PRESETS = [
  { id: 'air_filter', label: 'กรองอากาศ (Air Filter)', service: 'เปลี่ยนกรองอากาศเครื่องยนต์ (Air Filter)', product: 'ไส้กรองอากาศแท้ศูนย์' },
  { id: 'cabin_filter', label: 'กรองแอร์ (Cabin Filter)', service: 'เปลี่ยนกรองแอร์ห้องโดยสาร (Cabin Filter)', product: 'ไส้กรองแอร์ PM2.5 / แท้ศูนย์' },
  { id: 'fuel_filter', label: 'กรองน้ำมันเชื้อเพลิง', service: 'เปลี่ยนกรองน้ำมันเชื้อเพลิง (Fuel Filter)', product: 'ไส้กรองดีเซล/เบนซินแท้ศูนย์' },
];
export default function LogsScreen() {
  const { lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<'logs' | 'checks'>('logs');
  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [activeCar, setActiveCar] = useState<UserVehicle | null>(null);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [checkLogs, setCheckLogs] = useState<BasicCheckLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  // Maintenance Log Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [category, setCategory] = useState<FluidCategoryKey | 'parts' | 'other'>('engine_oil');
  const [selectedPartPreset, setSelectedPartPreset] = useState<string>('air_filter');
  const [serviceName, setServiceName] = useState('');
  const [mileage, setMileage] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [productName, setProductName] = useState('');
  const [volumeLitres, setVolumeLitres] = useState('');
  const [costThb, setCostThb] = useState('');
  const [notes, setNotes] = useState('');
  const router = useRouter();
  const params = useLocalSearchParams<{
    reminderCategory?: string;
    reminderTitle?: string;
    lastDoneDate?: string;
    lastDoneMileage?: string;
    dueMileage?: string;
    dueDate?: string;
    standard?: string;
    volumeLitres?: string;
    intervalKm?: string;
    intervalMonths?: string;
    warningNote?: string;
    status?: string;
  }>();
  // Fluid / Log Detail Modal State
  const [selectedDetail, setSelectedDetail] = useState<{
    title: string;
    category?: string;
    date?: string;
    mileage?: number;
    productName?: string;
    volumeLitres?: number | string;
    costThb?: number;
    notes?: string;
    dueMileage?: number;
    dueDate?: string;
    standard?: string;
    specVolume?: number | string;
    intervalKm?: number;
    intervalMonths?: number;
    warningNote?: string;
    isFromReminder?: boolean;
  } | null>(null);
  // 9-Point Check Fullscreen Screen State
  const [isCheckMode, setIsCheckMode] = useState(false);
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkRatings, setCheckRatings] = useState<Record<string, CheckResultRating>>({});
  const [checkCurrentStep, setCheckCurrentStep] = useState(0);
  const [characterEmotion, setCharacterEmotion] = useState<'normal' | 'smile' | 'sus' | 'concern'>('normal');
  const [isOptionLocked, setIsOptionLocked] = useState(false);
  const animTranslateY = useRef(new Animated.Value(0)).current;
  const animTranslateX = useRef(new Animated.Value(0)).current;
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);
  const hasInitializedExpandedRef = useRef(false);
  const lastActiveCarIdRef = useRef<string | null>(null);
  const loadData = useCallback(async () => {
    const carList = await getUserVehicles();
    setVehicles(carList);
    const activeId = await getActiveVehicleId();
    const current = carList.find((v) => v.id === activeId) || carList[0] || null;
    setActiveCar(current);
    const logList = await getMaintenanceLogs(current ? current.id : undefined);
    setLogs(logList);
    const chkList = await getBasicCheckLogs(current ? current.id : undefined);
    // Sort latest first
    chkList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setCheckLogs(chkList);
    const isCarChanged = current?.id !== lastActiveCarIdRef.current;
    if (chkList.length > 0 && (!hasInitializedExpandedRef.current || isCarChanged)) {
      setExpandedCheckId(chkList[0].id);
      hasInitializedExpandedRef.current = true;
      lastActiveCarIdRef.current = current?.id || null;
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );
  useEffect(() => {
    const unsubVehicle = onActiveVehicleChange(() => {
      loadData();
    });
    const unsubList = onVehiclesChange(() => {
      loadData();
    });
    return () => {
      unsubVehicle();
      unsubList();
    };
  }, [loadData]);
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };
  useEffect(() => {
    if (params.reminderCategory) {
      setActiveTab('logs');
      setSelectedDetail({
        title: params.reminderTitle || 'รายละเอียดของเหลว',
        category: params.reminderCategory,
        date: params.lastDoneDate || undefined,
        mileage: params.lastDoneMileage ? Number(params.lastDoneMileage) : undefined,
        dueMileage: params.dueMileage ? Number(params.dueMileage) : undefined,
        dueDate: params.dueDate || undefined,
        standard: params.standard || undefined,
        specVolume: params.volumeLitres || undefined,
        intervalKm: params.intervalKm ? Number(params.intervalKm) : undefined,
        intervalMonths: params.intervalMonths ? Number(params.intervalMonths) : undefined,
        warningNote: params.warningNote || undefined,
        isFromReminder: true,
      });
    }
  }, [params.reminderCategory, params.reminderTitle, params.dueMileage]);
  const handleCloseDetailModal = () => {
    setSelectedDetail(null);
    try {
      router.setParams({
        reminderCategory: undefined,
        reminderTitle: undefined,
        lastDoneDate: undefined,
        lastDoneMileage: undefined,
        dueMileage: undefined,
        dueDate: undefined,
        standard: undefined,
        volumeLitres: undefined,
        intervalKm: undefined,
        intervalMonths: undefined,
        warningNote: undefined,
        status: undefined,
      } as any);
    } catch (e) {
      // ignore
    }
  };
  const handleOpenLogInfo = (item: MaintenanceLog) => {
    let spec: any = null;
    let nextDueMileage: number | undefined = undefined;
    if (activeCar) {
      const reqs = getFluidRequirementsForVariant(activeCar.variantId);
      if (reqs && reqs.specs[item.category as FluidCategoryKey]) {
        spec = reqs.specs[item.category as FluidCategoryKey];
        if (spec?.intervalKm && item.mileage) {
          nextDueMileage = item.mileage + spec.intervalKm;
        }
      }
    }
    setSelectedDetail({
      title: item.serviceName,
      category: item.category,
      date: item.date,
      mileage: item.mileage,
      productName: item.productName,
      volumeLitres: item.volumeLitres,
      costThb: item.costThb,
      notes: item.notes,
      dueMileage: nextDueMileage,
      standard: spec?.standard,
      specVolume: spec?.volumeLitres,
      intervalKm: spec?.intervalKm,
      intervalMonths: spec?.intervalMonths,
      warningNote: spec?.warningNote,
      isFromReminder: false,
    });
  };
  const { available: availableCategories, notApplicable: notApplicableList } = React.useMemo(() => {
    return getVehicleCategoryOptions(activeCar);
  }, [activeCar]);
  // ----------------------------------------------------
  // MAINTENANCE LOG HANDLERS
  // ----------------------------------------------------
  const handleOpenAddLogModal = () => {
    const initialCat = availableCategories[0]?.key || 'engine_oil';
    setCategory(initialCat);
    setSelectedPartPreset('air_filter');
    setIsCategoryDropdownOpen(false);
    setDate(new Date().toISOString().split('T')[0]);
    setMileage(activeCar ? activeCar.currentMileage.toString() : '50000');
    setCostThb('');
    setNotes('');
    const initialOpt = availableCategories.find((c) => c.key === initialCat);
    if (initialCat === 'parts') {
      const preset = PART_PRESETS[0];
      setServiceName(preset.service);
      setProductName(preset.product);
      setVolumeLitres('');
    } else if (initialCat === 'other') {
      setServiceName('งานบริการตรวจเช็กทั่วไป');
      setProductName('');
      setVolumeLitres('');
    } else {
      setServiceName(`เปลี่ยนถ่าย ${initialOpt?.label || 'ของเหลว'}`);
      setProductName(initialOpt?.standard ? `มาตรฐาน: ${initialOpt.standard}` : 'ของแท้ศูนย์ / OEM');
      setVolumeLitres(initialOpt?.recommendedVolume ? String(initialOpt.recommendedVolume) : '');
    }
    setIsLogModalOpen(true);
  };
  const handleCategorySelect = (catKey: FluidCategoryKey | 'parts' | 'other') => {
    setCategory(catKey);
    setIsCategoryDropdownOpen(false);
    if (catKey === 'parts') {
      setVolumeLitres('');
      const preset = PART_PRESETS.find((p) => p.id === selectedPartPreset) || PART_PRESETS[0];
      setServiceName(preset.service);
      if (!productName || productName === 'ของแท้ศูนย์ / OEM' || productName.startsWith('มาตรฐาน:')) {
        setProductName(preset.product);
      }
    } else if (catKey === 'other') {
      setVolumeLitres('');
      setServiceName('งานบริการตรวจเช็กทั่วไป');
    } else {
      const opt = availableCategories.find((c) => c.key === catKey);
      if (opt) setServiceName(`เปลี่ยนถ่าย ${opt.label}`);
      // Auto-fill ปริมาณลิตรตามสเปกรถจริง
      if (opt?.recommendedVolume) {
        setVolumeLitres(String(opt.recommendedVolume));
      } else {
        setVolumeLitres('');
      }
      // Auto-fill มาตรฐานตามสเปกรถจริง
      if (opt?.standard) {
        setProductName(`มาตรฐาน: ${opt.standard}`);
      }
    }
  };
  const handlePartPresetSelect = (presetId: string) => {
    setSelectedPartPreset(presetId);
    const preset = PART_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setServiceName(preset.service);
      setProductName(preset.product);
    }
  };
  const handleSaveLog = async () => {
    if (!activeCar) {
      Alert.alert('แจ้งเตือน', 'กรุณาเพิ่มรถในระบบก่อนบันทึกรายการ');
      return;
    }
    if (!serviceName.trim()) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณาระบุชื่องานหรือรายการที่ทำ');
      return;
    }
    const mileageNum = parseInt(mileage.replace(/,/g, ''), 10) || activeCar.currentMileage;
    const costNum = parseFloat(costThb.replace(/,/g, '')) || 0;
    const volNum = volumeLitres ? parseFloat(volumeLitres) : undefined;
    const newLog: MaintenanceLog = {
      id: `log-${Date.now()}`,
      vehicleId: activeCar.id,
      category,
      serviceName: serviceName.trim(),
      date: date.trim() || new Date().toISOString().split('T')[0],
      mileage: mileageNum,
      productName: productName.trim() || 'ของแท้ศูนย์ / OEM',
      volumeLitres: volNum,
      costThb: costNum,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    await addMaintenanceLog(newLog);
    Alert.alert('สำเร็จ', 'บันทึกประวัติการบำรุงรักษาเรียบร้อยแล้ว');
    await loadData();
    setIsLogModalOpen(false);
  };
  const handleDeleteLog = (item: MaintenanceLog) => {
    Alert.alert(
      'ยืนยันการลบ',
      `คุณต้องการลบรายการ "${item.serviceName}" (${item.date}) ออกจากประวัติใช่หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบรายการ',
          style: 'destructive',
          onPress: async () => {
            await deleteMaintenanceLog(item.id);
            await loadData();
            Alert.alert('สำเร็จ', 'ลบรายการเรียบร้อยแล้ว');
          },
        },
      ]
    );
  };
  // ----------------------------------------------------
  // 9-POINT BASIC CHECK HANDLERS
  // ----------------------------------------------------
  // 9-POINT BASIC CHECK HANDLERS (VISUAL GAME NOVEL STYLE)
  // ----------------------------------------------------
  const handleOpenStartCheckModal = () => {
    setCheckDate(new Date().toISOString().split('T')[0]);
    setCheckRatings({});
    setCheckCurrentStep(0);
    setCharacterEmotion('normal');
    animTranslateY.setValue(0);
    animTranslateX.setValue(0);
    setIsOptionLocked(false);
    setIsCheckMode(true);
    setIsCheckModalOpen(false);
  };
  const handleSelectCheckOption = async (rating: CheckResultRating) => {
    if (isOptionLocked) return;
    setIsOptionLocked(true);
    const currentItem = BASIC_CHECK_ITEMS[checkCurrentStep];
    const updated = {
      ...checkRatings,
      [currentItem.id]: rating,
    };
    setCheckRatings(updated);
    // เล่น Animation & เปลี่ยนภาพอารมณ์ตามปุ่มที่เลือก
    if (rating === 'normal') {
      // 1. เลือก ปกติ (ผ่าน) -> ran_smile.png + แอนิเมชั่นกระโดด (เด้งเบาๆ จังหวะเดียว)
      setCharacterEmotion('smile');
      Animated.sequence([
        Animated.timing(animTranslateY, {
          toValue: -22,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(animTranslateY, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(animTranslateY, {
          toValue: -4,
          duration: 70,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(animTranslateY, {
          toValue: 0,
          duration: 70,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (rating === 'caution') {
      // 2. เลือก ควรระวัง -> ran_sus.png + แอนิเมชั่นขยับลงเล็กน้อย
      setCharacterEmotion('sus');
      Animated.sequence([
        Animated.timing(animTranslateY, {
          toValue: 16,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(animTranslateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (rating === 'action_needed') {
      // 3. เลือก ต้องแก้ไข -> ran_concern.png + แอนิเมชั่นตัวละครสั่นซ้ายขวา
      setCharacterEmotion('concern');
      Animated.sequence([
        Animated.timing(animTranslateX, { toValue: -14, duration: 60, useNativeDriver: true }),
        Animated.timing(animTranslateX, { toValue: 14, duration: 60, useNativeDriver: true }),
        Animated.timing(animTranslateX, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(animTranslateX, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(animTranslateX, { toValue: -5, duration: 50, useNativeDriver: true }),
        Animated.timing(animTranslateX, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
    // หน่วงเวลาเล็กน้อยเพื่อให้เห็นแอนิเมชั่นและสีหน้า ก่อนเลื่อนไปข้อถัดไป
    setTimeout(async () => {
      if (checkCurrentStep < BASIC_CHECK_ITEMS.length - 1) {
        setCheckCurrentStep((prev) => prev + 1);
        setCharacterEmotion('normal'); // รีเซ็ตเป็นหน้าปกติเมื่อเปิดข้อใหม่
        animTranslateY.setValue(0);
        animTranslateX.setValue(0);
        setIsOptionLocked(false);
      } else {
        await finishAndSaveCheck(updated);
        setIsOptionLocked(false);
      }
    }, 550);
  };
  const finishAndSaveCheck = async (finalRatings: Record<string, CheckResultRating>) => {
    if (!activeCar) {
      Alert.alert('แจ้งเตือน', 'กรุณาเพิ่มรถในระบบก่อนบันทึกรายการ');
      return;
    }
    // รวบรวมผลลัพธ์ทั้ง 9 รายการ
    const results: CheckItemResult[] = BASIC_CHECK_ITEMS.map((item) => ({
      itemId: item.id,
      title: item.title,
      category: item.category,
      rating: finalRatings[item.id] || 'normal',
    }));
    // คำนวณภาพรวม overallStatus
    let overallStatus: 'normal' | 'caution' | 'action_needed' = 'normal';
    const hasAction = results.some((r) => r.rating === 'action_needed');
    const hasCaution = results.some((r) => r.rating === 'caution');
    if (hasAction) {
      overallStatus = 'action_needed';
    } else if (hasCaution) {
      overallStatus = 'caution';
    }
    const checkLogId = `chk-${Date.now()}`;
    const logObj: BasicCheckLog = {
      id: checkLogId,
      vehicleId: activeCar.id,
      date: checkDate.trim() || new Date().toISOString().split('T')[0],
      mileage: activeCar.currentMileage,
      overallStatus,
      results,
      createdAt: new Date().toISOString(),
    };
    await saveBasicCheckLog(logObj);
    await loadData();
    setIsCheckMode(false);
    setIsCheckModalOpen(false);
    setActiveTab('checks');
    setExpandedCheckId(checkLogId);
    Alert.alert('บันทึกสำเร็จ', 'บันทึกผลการตรวจเช็ก 9 จุดรอบใหม่เรียบร้อยแล้ว');
  };
  const handleDeleteCheckLog = (log: BasicCheckLog) => {
    Alert.alert(
      'ยืนยันการลบ',
      `คุณต้องการลบผลการตรวจเช็กสภาพประจำวันที่ "${log.date}" ใช่หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบรายการ',
          style: 'destructive',
          onPress: async () => {
            setCheckLogs((prev) => prev.filter((item) => item.id !== log.id));
            if (expandedCheckId === log.id) setExpandedCheckId(null);
            await deleteBasicCheckLog(log.id);
            await loadData();
            Alert.alert('สำเร็จ', 'ลบประวัติการตรวจเช็กเรียบร้อยแล้ว');
          },
        },
      ]
    );
  };
  // Expenses Calculations
  const totalCost = logs.reduce((sum, item) => sum + (Number(item.costThb) || 0), 0);
  const averageCost = logs.length > 0 ? Math.round(totalCost / logs.length) : 0;
  const maxCostLog = logs.length > 0 ? logs.reduce((max, cur) => (cur.costThb > max.costThb ? cur : max), logs[0]) : null;
  // -------------------------------------------------------------------------
  // FULLSCREEN 9-POINT BASIC VEHICLE CHECK WINDOW (BLUE THEME + CHARACTER)
  // -------------------------------------------------------------------------
  if (isCheckMode) {
    const currentItem = BASIC_CHECK_ITEMS[checkCurrentStep];
    const totalSteps = BASIC_CHECK_ITEMS.length;
    return (
      <Modal
        visible={isCheckMode}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          Alert.alert('ยกเลิกการตรวจเช็ก', 'ต้องการปิดและกลับสู่หน้าหลักหรือไม่?', [
            { text: 'ทำต่อ', style: 'cancel' },
            { text: 'ออก', style: 'destructive', onPress: () => setIsCheckMode(false) },
          ]);
        }}
      >
        <SafeAreaView style={styles.fullscreenCheckContainer} edges={['top', 'bottom']}>
          {/* Header Bar: Removed back arrow button */}
          <View style={styles.checkHeader}>
            <View style={styles.checkHeaderTitleGroup}>
              <Text style={styles.checkHeaderTitle}>
                เริ่มเช็กสภาพทั่วไป ({checkCurrentStep + 1}/{totalSteps})
              </Text>
              <Text style={styles.checkHeaderSub}>
                {activeCar ? `${activeCar.brandName} ${activeCar.modelName}` : 'ตรวจเช็ก 9 จุด'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.checkHeaderIconBtn}
              onPress={() => {
                Alert.alert('ยกเลิกการตรวจเช็ก', 'ต้องการปิดและกลับสู่หน้าหลักหรือไม่?', [
                  { text: 'ทำต่อ', style: 'cancel' },
                  { text: 'ออก', style: 'destructive', onPress: () => setIsCheckMode(false) },
                ]);
              }}
            >
              <Ionicons name="close" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
          {/* Progress Bar */}
          <View style={styles.checkProgressTrack}>
            <View
              style={[
                styles.checkProgressFill,
                { width: `${Math.round(((checkCurrentStep + 1) / totalSteps) * 100)}%` },
              ]}
            />
          </View>
          <ScrollView
            style={styles.checkBodyScroll}
            contentContainerStyle={styles.checkBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Character Stage: Animated Ran with expressions */}
            <View style={styles.characterStage}>
              <Animated.View
                style={{
                  transform: [
                    { translateX: animTranslateX },
                    { translateY: animTranslateY },
                  ],
                }}
              >
                <Image
                  source={RAN_IMAGES[characterEmotion]}
                  style={styles.characterImage}
                  resizeMode="contain"
                />
              </Animated.View>
            </View>
            {/* Speech Bubble */}
            {currentItem && (
              <View style={styles.speechBubble}>
                <View style={styles.speechBubbleTail} />
                <View style={styles.bubbleTagRow}>
                  <View style={styles.bubbleTag}>
                    <Text style={styles.bubbleTagText}>{currentItem.category}</Text>
                  </View>
                </View>
                <Text style={styles.checkpointTitle}>{currentItem.title}</Text>
                <View style={styles.instructionBox}>
                  <Text style={styles.instructionText}>{currentItem.howToCheck}</Text>
                </View>
              </View>
            )}
            {/* 3 Clear Action Buttons (compact size) */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.optionBtnNormal, isOptionLocked && styles.btnDisabled]}
                activeOpacity={0.8}
                disabled={isOptionLocked}
                onPress={() => handleSelectCheckOption('normal')}
              >
                <Ionicons name="checkmark-circle" size={19} color="#ffffff" />
                <Text style={styles.optionBtnTextNormal}>ปกติ (ผ่าน)</Text>
              </TouchableOpacity>
              <View style={styles.optionRow}>
                <TouchableOpacity
                  style={[styles.optionBtnCaution, isOptionLocked && styles.btnDisabled]}
                  activeOpacity={0.8}
                  disabled={isOptionLocked}
                  onPress={() => handleSelectCheckOption('caution')}
                >
                  <Ionicons name="alert-circle" size={17} color="#ffffff" />
                  <Text style={styles.optionBtnTextCaution}>ควรระวัง</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionBtnAction, isOptionLocked && styles.btnDisabled]}
                  activeOpacity={0.8}
                  disabled={isOptionLocked}
                  onPress={() => handleSelectCheckOption('action_needed')}
                >
                  <Ionicons name="close-circle" size={17} color="#ffffff" />
                  <Text style={styles.optionBtnTextAction}>ต้องแก้ไข</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {lang === 'th' ? 'บันทึกงาน DIY' : 'DIY Logs'}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {activeCar ? `${activeCar.brandName} ${activeCar.modelName} • ${activeCar.licensePlate}` : (lang === 'th' ? 'บันทึกงาน & เช็กสภาพ' : 'DIY Records')}
          </Text>
        </View>
      </View>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
      >
        {/* Segmented Control Bar: ประวัติ & รายจ่าย และ เช็กสภาพ 9 จุด */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'logs' && styles.tabButtonActive]}
            onPress={() => setActiveTab('logs')}
          >
            <Ionicons
              name="receipt-outline"
              size={16}
              color={activeTab === 'logs' ? '#fff' : '#94a3b8'}
            />
            <Text style={[styles.tabButtonText, activeTab === 'logs' && styles.tabButtonTextActive]}>
              ประวัติ & รายจ่าย
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'checks' && styles.tabButtonActive]}
            onPress={() => setActiveTab('checks')}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={activeTab === 'checks' ? '#fff' : '#94a3b8'}
            />
            <Text style={[styles.tabButtonText, activeTab === 'checks' && styles.tabButtonTextActive]}>
              เช็คสภาพ 9 จุด
            </Text>
          </TouchableOpacity>
        </View>
        {/* ==================================================== */}
        {/* TAB 1: MAINTENANCE LOGS & EXPENSE SUMMARY            */}
        {/* ==================================================== */}
        {activeTab === 'logs' && (
          <View style={styles.logsList}>
            {/* Total Expense Summary Dashboard Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View style={styles.summaryIconCircle}>
                  <Ionicons name="wallet-outline" size={24} color="#34d399" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.summaryTitle}>สรุปค่าใช้จ่ายสะสมทั้งหมด</Text>
                  <Text style={styles.summaryTotalValue}>{totalCost.toLocaleString()} ฿</Text>
                </View>
                <TouchableOpacity style={styles.miniAddBtn} onPress={handleOpenAddLogModal}>
                  <Ionicons name="add-circle" size={28} color="#38bdf8" />
                </TouchableOpacity>
              </View>
              <View style={styles.summaryMetricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>จำนวนครั้งที่ทำ</Text>
                  <Text style={styles.metricValue}>{logs.length} ครั้ง</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>เฉลี่ยต่อครั้ง</Text>
                  <Text style={styles.metricValue}>{averageCost.toLocaleString()} ฿</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>สูงสุดครั้งเดียว</Text>
                  <Text style={styles.metricValue}>
                    {maxCostLog ? `${maxCostLog.costThb.toLocaleString()} ฿` : '0 ฿'}
                  </Text>
                </View>
              </View>
            </View>
            {/* Logs List Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>รายการบันทึกทั้งหมด</Text>
              <Text style={styles.sectionHint}>{logs.length} รายการ</Text>
            </View>
            {logs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="clipboard-outline" size={48} color="#475569" />
                <Text style={styles.emptyTitle}>ยังไม่มีประวัติการซ่อมบำรุง</Text>
                <Text style={styles.emptySub}>
                  เริ่มบันทึกการเปลี่ยนถ่ายของเหลวและอะไหล่เพื่อช่วยคำนวณรอบแจ้งเตือนและค่าใช้จ่าย
                </Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleOpenAddLogModal}>
                  <Text style={styles.primaryBtnText}>เพิ่มบันทึกรายการแรก</Text>
                </TouchableOpacity>
              </View>
            ) : (
              logs.map((item) => (
                <View key={item.id} style={styles.logCard}>
                  <View style={styles.logCardHeader}>
                    <View style={styles.badgeRow}>
                      <View style={styles.logBadge}>
                        <Text style={styles.logBadgeText}>
                          {CATEGORIES.find((c) => c.key === item.category)?.label || item.category}
                        </Text>
                      </View>
                      <Text style={styles.logDate}>{item.date}</Text>
                    </View>
                    <View style={styles.actionBtnRow}>
                      <TouchableOpacity
                        style={[styles.actionIconBtn, { marginRight: 6 }]}
                        onPress={() => handleOpenLogInfo(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="information-circle-outline" size={19} color="#38bdf8" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => handleDeleteLog(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={19} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.logServiceName}>{item.serviceName}</Text>
                  <View style={styles.logDetailsGrid}>
                    <View style={styles.logDetailItem}>
                      <Text style={styles.logDetailLabel}>เลขไมล์ที่ทำ:</Text>
                      <Text style={styles.logDetailVal}>{item.mileage.toLocaleString()} กม.</Text>
                    </View>
                    <View style={styles.logDetailItem}>
                      <Text style={styles.logDetailLabel}>ผลิตภัณฑ์:</Text>
                      <Text style={styles.logDetailVal}>{item.productName || 'ของแท้'}</Text>
                    </View>
                    {item.volumeLitres ? (
                      <View style={styles.logDetailItem}>
                        <Text style={styles.logDetailLabel}>ปริมาณ:</Text>
                        <Text style={styles.logDetailVal}>{item.volumeLitres} ลิตร</Text>
                      </View>
                    ) : null}
                    <View style={styles.logDetailItem}>
                      <Text style={styles.logDetailLabel}>ค่าใช้จ่าย:</Text>
                      <Text style={styles.logCostVal}>{Number(item.costThb || 0).toLocaleString()} ฿</Text>
                    </View>
                  </View>
                  {item.notes ? (
                    <View style={styles.noteBox}>
                      <Ionicons name="information-circle-outline" size={14} color="#94a3b8" style={{ marginRight: 4 }} />
                      <Text style={styles.logNoteText}>{item.notes}</Text>
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </View>
        )}
        {/* ==================================================== */}
        {/* TAB 2: 9-POINT BASIC CHECK LOGS                      */}
        {/* ==================================================== */}
        {activeTab === 'checks' && (
          <View style={styles.checkTabContainer}>
            {/* กล่องตรวจเช็กสภาพประจำสัปดาห์ (แสดงแทนที่กล่องสรุปค่าใช้จ่ายแบบสลับไปมา) */}
            <View style={styles.startCheckCard}>
              <View style={styles.startCheckCardLeft}>
                <View style={styles.checkCardIconCircle}>
                  <Ionicons name="clipboard" size={26} color="#38bdf8" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.startCheckCardTitle}>ตรวจเช็กสภาพรถประจำสัปดาห์</Text>
                  <Text style={styles.startCheckCardSub}>
                    เช็ก 9 จุดสำคัญของเหลว ไฟ ยาง เพื่อความปลอดภัย
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.startCheckMainBtn}
                onPress={handleOpenStartCheckModal}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.startCheckMainBtnText}>เริ่มบันทึก</Text>
              </TouchableOpacity>
            </View>
            {/* Section Header: Saved Checks */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ประวัติการบันทึก</Text>
              <Text style={styles.sectionHint}>{checkLogs.length} รายการ</Text>
            </View>
            {/* List of Saved Check Logs (Latest First, with Edit & Delete) */}
            {checkLogs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="shield-outline" size={48} color="#475569" />
                <Text style={styles.emptyTitle}>ยังไม่มีประวัติการเช็กสภาพ 9 จุด</Text>
                <Text style={styles.emptySub}>
                  กดปุ่ม "เริ่มบันทึก" ด้านบนเพื่อทำรายการเช็กรอบแรก
                </Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleOpenStartCheckModal}>
                  <Text style={styles.primaryBtnText}>เริ่มบันทึกรอบแรก</Text>
                </TouchableOpacity>
              </View>
            ) : (
              checkLogs.map((log, index) => {
                const isLatest = index === 0;
                const isExpanded = expandedCheckId === log.id;
                const normalCount = log.results.filter((r) => r.rating === 'normal').length;
                const cautionCount = log.results.filter((r) => r.rating === 'caution').length;
                const actionCount = log.results.filter((r) => r.rating === 'action_needed').length;
                return (
                  <View key={log.id} style={styles.savedCheckItemWrapper}>
                    {/* Latest Badge Outside Box */}
                    {isLatest && (
                      <View style={styles.latestCheckBadgeOutsideRow}>
                        <View style={styles.latestCheckBadgeOutside}>
                          <Ionicons name="sparkles" size={12} color="#ffffff" />
                          <Text style={styles.latestCheckBadgeOutsideText}>บันทึกล่าสุด</Text>
                        </View>
                      </View>
                    )}
                    <View
                      style={[
                        styles.savedCheckCard,
                        isLatest && styles.savedCheckCardLatest,
                      ]}
                    >
                      {/* Card Top: Date, Overall Status & Action Buttons (Edit / Delete) */}
                      <View style={styles.savedCheckTop}>
                        <View>
                          <Text style={styles.savedCheckDate}>วันที่: {log.date}</Text>
                          <View style={styles.overallStatusRow}>
                            {log.overallStatus === 'normal' && (
                              <View style={styles.statusBadgeGreen}>
                                <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                                <Text style={styles.statusBadgeGreenText}>ปกติครบทุกจุด ({normalCount}/9)</Text>
                              </View>
                            )}
                            {log.overallStatus === 'caution' && (
                              <View style={styles.statusBadgeYellow}>
                                <Ionicons name="alert-circle" size={14} color="#f59e0b" />
                                <Text style={styles.statusBadgeYellowText}>
                                  มีจุดควรระวัง ({cautionCount} จุด)
                                </Text>
                              </View>
                            )}
                            {log.overallStatus === 'action_needed' && (
                              <View style={styles.statusBadgeRed}>
                                <Ionicons name="close-circle" size={14} color="#ef4444" />
                                <Text style={styles.statusBadgeRedText}>
                                  ต้องแก้ไขทันที ({actionCount} จุด)
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        {/* Delete Action Button */}
                        <View style={styles.checkCardActions}>
                          <TouchableOpacity
                            style={styles.actionIconBtn}
                            onPress={() => handleDeleteCheckLog(log)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="trash-outline" size={18} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                    </View>
                    {/* Mini Rating Pills Summary */}
                    <View style={styles.ratingSummaryRow}>
                      <View style={styles.pillGreen}>
                        <Text style={styles.pillTextGreen}>{normalCount} ปกติ</Text>
                      </View>
                      {cautionCount > 0 && (
                        <View style={styles.pillYellow}>
                          <Text style={styles.pillTextYellow}>{cautionCount} ควรระวัง</Text>
                        </View>
                      )}
                      {actionCount > 0 && (
                        <View style={styles.pillRed}>
                          <Text style={styles.pillTextRed}>{actionCount} ต้องแก้ไข</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.expandToggleBtn}
                        onPress={() => setExpandedCheckId(isExpanded ? null : log.id)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.expandToggleText}>
                          {isExpanded ? 'ซ่อน 9 จุด' : 'ดูทั้ง 9 จุด'}
                        </Text>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          color="#38bdf8"
                        />
                      </TouchableOpacity>
                    </View>
                    {/* Expanded 9 Items List */}
                    {isExpanded && (
                      <View style={styles.expandedItemsContainer}>
                        {log.results.map((res, i) => (
                          <View key={res.itemId} style={styles.resultItemRow}>
                            <View style={styles.resultItemNum}>
                              <Text style={styles.resultItemNumText}>{i + 1}</Text>
                            </View>
                            <Text style={styles.resultItemTitle} numberOfLines={1}>
                              {res.title}
                            </Text>
                            {res.rating === 'normal' && (
                              <View style={styles.tinyBadgeNormal}>
                                <Ionicons name="checkmark" size={12} color="#10b981" />
                                <Text style={styles.tinyBadgeNormalText}>ปกติ</Text>
                              </View>
                            )}
                            {res.rating === 'caution' && (
                              <View style={styles.tinyBadgeCaution}>
                                <Ionicons name="alert" size={12} color="#f59e0b" />
                                <Text style={styles.tinyBadgeCautionText}>ควรระวัง</Text>
                              </View>
                            )}
                            {res.rating === 'action_needed' && (
                              <View style={styles.tinyBadgeAction}>
                                <Ionicons name="close" size={12} color="#ef4444" />
                                <Text style={styles.tinyBadgeActionText}>ต้องแก้ไข</Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
      {/* ==================================================== */}
      {/* POP-UP MODAL: FLUID / LOG DETAIL INFO                */}
      {/* ==================================================== */}
      <Modal
        visible={!!selectedDetail}
        transparent
        animationType="fade"
        onRequestClose={handleCloseDetailModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalCard}>
            {/* Modal Header */}
            <View style={styles.detailModalHeader}>
              <View style={styles.detailHeaderTitleRow}>
                <View style={styles.detailIconBadge}>
                  <Ionicons name="water" size={18} color="#38bdf8" />
                </View>
                <Text style={styles.detailModalTitle} numberOfLines={2}>
                  {selectedDetail?.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleCloseDetailModal}
                style={styles.detailCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.detailModalScroll} showsVerticalScrollIndicator={false}>
              {/* Box 1: Record Info */}
              <View style={styles.detailSectionBox}>
                <Text style={styles.detailSectionLabel}>
                  {selectedDetail?.isFromReminder ? 'ประวัติการเปลี่ยนล่าสุด' : 'ข้อมูลการบันทึกรายการ'}
                </Text>
                {selectedDetail?.date ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>วันที่ทำ:</Text>
                    <Text style={styles.detailRowVal}>{selectedDetail.date}</Text>
                  </View>
                ) : null}
                {selectedDetail?.mileage != null ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>เลขไมล์ที่บันทึก:</Text>
                    <Text style={styles.detailRowValHighlight}>
                      {selectedDetail.mileage.toLocaleString()} กม.
                    </Text>
                  </View>
                ) : null}
                {selectedDetail?.productName ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>ผลิตภัณฑ์:</Text>
                    <Text style={styles.detailRowVal}>{selectedDetail.productName}</Text>
                  </View>
                ) : null}
                {selectedDetail?.volumeLitres ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>ปริมาณที่ใช้:</Text>
                    <Text style={styles.detailRowVal}>{selectedDetail.volumeLitres} ลิตร</Text>
                  </View>
                ) : null}
                {selectedDetail?.costThb != null && !selectedDetail.isFromReminder ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>ค่าใช้จ่าย:</Text>
                    <Text style={styles.detailRowValCost}>
                      {Number(selectedDetail.costThb).toLocaleString()} ฿
                    </Text>
                  </View>
                ) : null}
                {selectedDetail?.notes ? (
                  <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#1e293b' }}>
                    <Text style={styles.detailNotesLabel}>บันทึกเพิ่มเติม:</Text>
                    <Text style={styles.detailNotesVal}>{selectedDetail.notes}</Text>
                  </View>
                ) : null}
              </View>
              {/* Box 2: Due / Interval */}
              {selectedDetail?.dueMileage != null ? (
                <View style={styles.detailSectionBox}>
                  <Text style={styles.detailSectionLabel}>กำหนดรอบถัดไป</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>ครบกำหนดรอบถัดไป:</Text>
                    <Text style={styles.detailRowValDue}>
                      {selectedDetail.dueMileage.toLocaleString()} กม.
                    </Text>
                  </View>
                  {selectedDetail?.dueDate ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailRowLabel}>วันที่โดยประมาณ:</Text>
                      <Text style={styles.detailRowVal}>{selectedDetail.dueDate}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
              {/* Box 3: Vehicle Spec Recommendation */}
              {(selectedDetail?.standard || selectedDetail?.specVolume || selectedDetail?.intervalKm) ? (
                <View style={styles.detailSectionBox}>
                  <Text style={styles.detailSectionLabel}>สเปกที่แนะนำตามรุ่นรถ</Text>
                  {selectedDetail.standard ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailRowLabel}>มาตรฐาน / สเปก:</Text>
                      <Text style={styles.detailRowVal}>{selectedDetail.standard}</Text>
                    </View>
                  ) : null}
                  {selectedDetail.specVolume ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailRowLabel}>ปริมาณสเปก:</Text>
                      <Text style={styles.detailRowVal}>{selectedDetail.specVolume} ลิตร</Text>
                    </View>
                  ) : null}
                  {selectedDetail.intervalKm ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailRowLabel}>ระยะรอบเปลี่ยน:</Text>
                      <Text style={styles.detailRowVal}>
                        ทุก {selectedDetail.intervalKm.toLocaleString()} กม.
                        {selectedDetail.intervalMonths ? ` หรือ ${selectedDetail.intervalMonths} เดือน` : ''}
                      </Text>
                    </View>
                  ) : null}
                  {selectedDetail.warningNote ? (
                    <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#1e293b' }}>
                      <Text style={styles.detailNotesLabel}>คำแนะนำ / ข้อสังเกต:</Text>
                      <Text style={styles.detailNotesVal}>{selectedDetail.warningNote}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </ScrollView>
            {/* Modal Footer */}
            <View style={styles.detailFooterRow}>
              {selectedDetail?.isFromReminder && (
                <TouchableOpacity
                  style={styles.detailActionBtn}
                  onPress={() => {
                    const cat = (selectedDetail.category as any) || 'engine_oil';
                    const detailTitle = selectedDetail.title;
                    const specVol = selectedDetail.specVolume || selectedDetail.volumeLitres;
                    handleCloseDetailModal();
                    setCategory(cat);
                    setSelectedPartPreset('air_filter');
                    setIsCategoryDropdownOpen(false);
                    setServiceName(detailTitle || 'บันทึกการบำรุงรักษา');
                    setDate(new Date().toISOString().split('T')[0]);
                    setMileage(activeCar ? activeCar.currentMileage.toString() : '50000');
                    setProductName(selectedDetail.productName || '');
                    setVolumeLitres(specVol ? String(specVol) : '');
                    setCostThb('');
                    setNotes('');
                    setIsLogModalOpen(true);
                  }}
                >
                  <Ionicons name="add-circle-outline" size={17} color="#0f172a" />
                  <Text style={styles.detailActionBtnText}>บันทึกงานนี้</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.detailCloseFooterBtn,
                  !selectedDetail?.isFromReminder && { flex: 1 },
                ]}
                onPress={handleCloseDetailModal}
              >
                <Text style={styles.detailCloseFooterText}>ปิด</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* ==================================================== */}
      {/* POP-UP MODAL: ADD / EDIT MAINTENANCE LOG            */}
      {/* ==================================================== */}
      <Modal visible={isLogModalOpen} animationType="slide" transparent onRequestClose={() => setIsLogModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>บันทึกการบำรุงรักษาใหม่</Text>
              <TouchableOpacity onPress={() => setIsLogModalOpen(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent} nestedScrollEnabled>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>หมวดหมู่งาน *</Text>
                <TouchableOpacity
                  style={[
                    styles.dropdownTrigger,
                    isCategoryDropdownOpen && styles.dropdownTriggerActive,
                  ]}
                  onPress={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                >
                  <Text style={styles.dropdownTriggerText}>
                    {availableCategories.find((c) => c.key === category)?.label || 'เลือกหมวดหมู่งาน'}
                  </Text>
                  <Ionicons
                    name={isCategoryDropdownOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
                {isCategoryDropdownOpen && (
                  <View style={styles.dropdownMenu}>
                    {availableCategories.map((c) => (
                      <TouchableOpacity
                        key={c.key}
                        style={[
                          styles.dropdownMenuItem,
                          category === c.key && styles.dropdownMenuItemActive,
                        ]}
                        onPress={() => handleCategorySelect(c.key)}
                      >
                        <Text
                          style={[
                            styles.dropdownMenuItemText,
                            category === c.key && styles.dropdownMenuItemTextActive,
                          ]}
                        >
                          {c.label}
                        </Text>
                        {category === c.key && (
                          <Ionicons name="checkmark" size={16} color="#38bdf8" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              {/* รายการของเหลวที่ไม่มีในรุ่นนี้ */}
              {notApplicableList.length > 0 && (
                <View style={styles.naInfoCard}>
                  <Text style={styles.naInfoTitle}>ไม่มีในรุ่นนี้:</Text>
                  <View style={styles.naChipsRow}>
                    {notApplicableList.map((na) => (
                      <View key={na.key} style={styles.naBadge}>
                        <Text style={styles.naBadgeText}>{na.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {/* Sub-presets for Filter category */}
              {category === 'parts' && (
                <View style={styles.partPresetContainer}>
                  <Text style={styles.partPresetHeader}>🔧 เลือกประเภทไส้กรอง:</Text>
                  <View style={styles.partPresetGrid}>
                    {PART_PRESETS.map((preset) => (
                      <TouchableOpacity
                        key={preset.id}
                        style={[
                          styles.partPresetChip,
                          selectedPartPreset === preset.id && styles.partPresetChipActive,
                        ]}
                        onPress={() => handlePartPresetSelect(preset.id)}
                      >
                        <Text
                          style={[
                            styles.partPresetChipText,
                            selectedPartPreset === preset.id && styles.partPresetChipTextActive,
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>รายการที่ทำ *</Text>
                <TextInput
                  style={styles.textInput}
                  value={serviceName}
                  onChangeText={setServiceName}
                  placeholder="เช่น เปลี่ยนน้ำมันเครื่อง + ไส้กรองแท้"
                  placeholderTextColor="#64748b"
                />
              </View>
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>วันที่ทำ (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={date}
                    onChangeText={setDate}
                    placeholder="2026-09-30"
                    placeholderTextColor="#64748b"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>เลขไมล์ (กม.)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={mileage}
                    onChangeText={setMileage}
                    keyboardType="numeric"
                    placeholder="58000"
                    placeholderTextColor="#64748b"
                  />
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  {category === 'parts' ? 'ชื่ออะไหล่ / แบรนด์ผู้ผลิต' : 'ผลิตภัณฑ์ / แบรนด์ที่ใช้'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={productName}
                  onChangeText={setProductName}
                  placeholder={
                    category === 'parts'
                      ? 'เช่น ไส้กรองแอร์ PM2.5 / แท้ศูนย์'
                      : 'เช่น Toyota Genuine 0W-20 SP'
                  }
                  placeholderTextColor="#64748b"
                />
              </View>
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={styles.inputLabel}>ปริมาณ (ลิตร)</Text>
                    {category === 'parts' && (
                      <Text style={{ fontSize: 10, color: '#64748b' }}>(ไม่ต้องระบุ)</Text>
                    )}
                  </View>
                  <TextInput
                    style={[
                      styles.textInput,
                      category === 'parts' && {
                        backgroundColor: 'rgba(30, 41, 59, 0.4)',
                        borderColor: '#334155',
                        color: '#64748b',
                        opacity: 0.5,
                      },
                    ]}
                    editable={category !== 'parts'}
                    value={category === 'parts' ? '' : volumeLitres}
                    onChangeText={setVolumeLitres}
                    keyboardType="numeric"
                    placeholder={category === 'parts' ? '- ไม่ใช้ของเหลว -' : 'เช่น 3.6'}
                    placeholderTextColor={category === 'parts' ? '#475569' : '#64748b'}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>ค่าใช้จ่าย (บาท) *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={costThb}
                    onChangeText={setCostThb}
                    keyboardType="numeric"
                    placeholder="เช่น 1450"
                    placeholderTextColor="#64748b"
                  />
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>หมายเหตุเพิ่มเติม</Text>
                <TextInput
                  style={[styles.textInput, { height: 60 }]}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  placeholder="เช่น สภาพเดิมเริ่มตัน เปลี่ยนของแท้ศูนย์ตรงรุ่น"
                  placeholderTextColor="#64748b"
                />
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSaveLog}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>บันทึกรายการ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  startCheckHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  startCheckHeaderBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    marginTop: 4,
    marginBottom: 14,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#0284c7',
  },
  tabButtonText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  logsList: {
    gap: 12,
  },
  // Summary Card
  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  summaryTitle: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  summaryTotalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#34d399',
    marginTop: 2,
  },
  miniAddBtn: {
    padding: 4,
  },
  summaryMetricsGrid: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10.5,
    color: '#64748b',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginTop: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  sectionHint: {
    fontSize: 11,
    color: '#64748b',
  },
  // Log Card
  logCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logBadge: {
    backgroundColor: '#0369a1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  logBadgeText: {
    color: '#fff',
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  logDate: {
    color: '#94a3b8',
    fontSize: 11.5,
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconBtn: {
    padding: 5,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logServiceName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 10,
  },
  logDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  logDetailItem: {
    width: '48%',
  },
  logDetailLabel: {
    fontSize: 10.5,
    color: '#64748b',
  },
  logDetailVal: {
    fontSize: 12,
    color: '#e2e8f0',
    marginTop: 2,
  },
  logCostVal: {
    fontSize: 12.5,
    color: '#34d399',
    fontWeight: 'bold',
    marginTop: 2,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  logNoteText: {
    fontSize: 11,
    color: '#cbd5e1',
    flex: 1,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginTop: 10,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
  },
  emptySub: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  // ==========================================
  // TAB 2: 9-POINT BASIC CHECK STYLES
  // ==========================================
  checkTabContainer: {
    gap: 12,
  },
  startCheckCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  startCheckCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkCardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  startCheckCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  startCheckCardSub: {
    fontSize: 11.5,
    color: '#94a3b8',
    marginTop: 2,
  },
  startCheckMainBtn: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  startCheckMainBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  savedCheckItemWrapper: {
    position: 'relative',
  },
  latestCheckBadgeOutsideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: -1,
    zIndex: 2,
  },
  latestCheckBadgeOutside: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    backgroundColor: '#38bdf8',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginLeft: 14,
  },
  latestCheckBadgeOutsideText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  savedCheckCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
    overflow: 'hidden',
  },
  savedCheckCardLatest: {
    borderColor: '#38bdf8',
    borderWidth: 1.5,
  },
  savedCheckTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 0,
  },
  savedCheckDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  overallStatusRow: {
    marginTop: 4,
  },
  statusBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    alignSelf: 'flex-start',
  },
  statusBadgeGreenText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusBadgeYellow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    alignSelf: 'flex-start',
  },
  statusBadgeYellowText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusBadgeRed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    alignSelf: 'flex-start',
  },
  statusBadgeRedText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: 'bold',
  },
  checkCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  pillGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillTextGreen: {
    color: '#34d399',
    fontSize: 10.5,
    fontWeight: '600',
  },
  pillYellow: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillTextYellow: {
    color: '#fbbf24',
    fontSize: 10.5,
    fontWeight: '600',
  },
  pillRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillTextRed: {
    color: '#f87171',
    fontSize: 10.5,
    fontWeight: '600',
  },
  expandToggleBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  expandToggleText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
  },
  expandedItemsContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
    gap: 6,
  },
  resultItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  resultItemNum: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  resultItemNumText: {
    color: '#cbd5e1',
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  resultItemTitle: {
    color: '#cbd5e1',
    fontSize: 11.5,
    flex: 1,
  },
  tinyBadgeNormal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  tinyBadgeNormalText: {
    color: '#10b981',
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  tinyBadgeCaution: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  tinyBadgeCautionText: {
    color: '#f59e0b',
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  tinyBadgeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  tinyBadgeActionText: {
    color: '#ef4444',
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  // ==========================================
  // MODAL STYLES
  // ==========================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  checkModalContainer: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    padding: 20,
  },
  checkModalScroll: {
    marginVertical: 12,
  },
  dateInputSection: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  dateInputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#38bdf8',
    marginBottom: 6,
  },
  dateTextInput: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  checkItemsHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  checkItemsModalList: {
    gap: 10,
  },
  modalItemCard: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  checkNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkNumText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalItemTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  modalItemCat: {
    fontSize: 10.5,
    color: '#94a3b8',
  },
  modalItemHowTo: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 8,
  },
  ratingBar: {
    flexDirection: 'row',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 8,
  },
  ratingBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 7,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  ratingBtnNormalActive: {
    borderColor: '#10b981',
    backgroundColor: '#06201b',
  },
  ratingBtnCautionActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#271705',
  },
  ratingBtnActionActive: {
    borderColor: '#ef4444',
    backgroundColor: '#2b0b0b',
  },
  ratingBtnText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  saveCheckSubmitBtn: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
  },
  saveCheckSubmitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Log Modal
  modalContainer: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  modalSub: {
    fontSize: 11.5,
    color: '#94a3b8',
    marginTop: 2,
  },
  modalContent: {
    marginVertical: 12,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownTriggerActive: {
    borderColor: '#38bdf8',
  },
  dropdownTriggerText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '500',
  },
  dropdownMenu: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  dropdownMenuItemActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  dropdownMenuItemText: {
    color: '#cbd5e1',
    fontSize: 12.5,
  },
  dropdownMenuItemTextActive: {
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  partPresetContainer: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    marginBottom: 10,
    gap: 8,
  },
  partPresetHeader: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  partPresetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  partPresetChip: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  partPresetChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  partPresetChipText: {
    fontSize: 11,
    color: '#cbd5e1',
  },
  partPresetChipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 10,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputLabel: {
    fontSize: 11.5,
    color: '#cbd5e1',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  // ----------------------------------------------------
  // FULLSCREEN 9-POINT BASIC CHECK (BLUE THEME + CHARACTER)
  // ----------------------------------------------------
  fullscreenCheckContainer: {
    flex: 1,
    backgroundColor: '#0a192f',
  },
  checkHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#0f2744',
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  checkHeaderTitleGroup: {
    flex: 1,
  },
  checkHeaderIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkHeaderCenter: {
    alignItems: 'center',
  },
  checkHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  checkHeaderSub: {
    fontSize: 12,
    color: '#93c5fd',
    marginTop: 2,
  },
  checkProgressTrack: {
    height: 4,
    backgroundColor: '#1e3a5f',
    width: '100%',
  },
  checkProgressFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
  },
  checkBodyScroll: {
    flex: 1,
  },
  checkBodyContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    alignItems: 'center',
  },
  characterStage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    zIndex: 1,
  },
  characterImage: {
    width: 250,
    height: 250,
  },
  speechBubble: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
    marginTop: -18,
    marginBottom: 16,
  },
  speechBubbleTail: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ffffff',
    zIndex: 11,
  },
  bubbleTagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bubbleTag: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  bubbleTagText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0284c7',
  },
  bubbleStepText: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '600',
  },
  checkpointTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  instructionText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
    textAlign: 'left',
  },
  buttonContainer: {
    width: '100%',
    gap: 9,
  },
  optionBtnNormal: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10.5,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  optionBtnTextNormal: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: 'bold',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 9,
  },
  optionBtnCaution: {
    flex: 1,
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9.5,
    borderRadius: 12,
    gap: 5,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  optionBtnTextCaution: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  optionBtnAction: {
    flex: 1,
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9.5,
    borderRadius: 12,
    gap: 5,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  optionBtnTextAction: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  btnDisabled: {
    opacity: 0.75,
  },
  // Detail Modal Styles
  detailModalCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    maxHeight: '84%',
    overflow: 'hidden',
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  detailHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  detailIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  detailCloseBtn: {
    padding: 4,
  },
  detailModalScroll: {
    padding: 16,
  },
  detailSectionBox: {
    backgroundColor: '#0b0f19',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  detailSectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#38bdf8',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailRowLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  detailRowVal: {
    fontSize: 12,
    color: '#e2e8f0',
    fontWeight: '500',
    maxWidth: '65%',
    textAlign: 'right',
  },
  detailRowValHighlight: {
    fontSize: 12.5,
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  detailRowValDue: {
    fontSize: 12.5,
    color: '#f59e0b',
    fontWeight: 'bold',
  },
  detailRowValCost: {
    fontSize: 12.5,
    color: '#34d399',
    fontWeight: 'bold',
  },
  detailNotesLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 2,
  },
  detailNotesVal: {
    fontSize: 11.5,
    color: '#cbd5e1',
    lineHeight: 16,
  },
  detailFooterRow: {
    flexDirection: 'row',
    padding: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  detailActionBtn: {
    flex: 1,
    backgroundColor: '#38bdf8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  detailActionBtnText: {
    color: '#0f172a',
    fontWeight: 'bold',
    fontSize: 13,
  },
  detailCloseFooterBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailCloseFooterText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 13,
  },
  naInfoCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  naInfoTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  naChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  naBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  naBadgeText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
  },
});