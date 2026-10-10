import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
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
import { BASIC_CHECK_ITEMS, CheckTemplateItem } from '../data/checkTemplates';

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

  // 9-Point Check Modal State
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkRatings, setCheckRatings] = useState<Record<string, CheckResultRating>>({});
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);

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
    if (chkList.length > 0 && !expandedCheckId) {
      setExpandedCheckId(chkList[0].id);
    }
  }, [expandedCheckId]);

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

  // ----------------------------------------------------
  // MAINTENANCE LOG HANDLERS
  // ----------------------------------------------------
  const handleOpenAddLogModal = () => {
    setCategory('engine_oil');
    setSelectedPartPreset('air_filter');
    setIsCategoryDropdownOpen(false);
    setServiceName('เปลี่ยนถ่ายน้ำมันเครื่อง + ไส้กรองแท้');
    setDate(new Date().toISOString().split('T')[0]);
    setMileage(activeCar ? activeCar.currentMileage.toString() : '50000');
    setProductName('');
    setVolumeLitres('3.6');
    setCostThb('');
    setNotes('');
    setIsLogModalOpen(true);
  };

  const handleCategorySelect = (catKey: FluidCategoryKey | 'parts' | 'other') => {
    setCategory(catKey);
    setIsCategoryDropdownOpen(false);
    if (catKey === 'parts') {
      setVolumeLitres('');
      const preset = PART_PRESETS.find((p) => p.id === selectedPartPreset) || PART_PRESETS[0];
      setServiceName(preset.service);
      if (!productName || productName === 'ของแท้ศูนย์ / OEM') {
        setProductName(preset.product);
      }
    } else {
      const opt = CATEGORIES.find((c) => c.key === catKey);
      if (opt) setServiceName(`เปลี่ยนถ่าย ${opt.label}`);
      if (catKey === 'engine_oil') setVolumeLitres('3.6');
      else if (catKey === 'transmission_fluid') setVolumeLitres('4.0');
      else if (catKey === 'brake_fluid') setVolumeLitres('1.0');
      else if (catKey === 'coolant') setVolumeLitres('5.0');
      else if (catKey === 'windshield_washer') setVolumeLitres('2.0');
      else setVolumeLitres('');
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
  const handleOpenStartCheckModal = () => {
    setCheckDate(new Date().toISOString().split('T')[0]);
    // Pre-populate with default 'normal' for all 9 items
    const initial: Record<string, CheckResultRating> = {};
    BASIC_CHECK_ITEMS.forEach((it) => {
      initial[it.id] = 'normal';
    });
    setCheckRatings(initial);
    setIsCheckModalOpen(true);
  };

  const handleSetItemRating = (itemId: string, rating: CheckResultRating) => {
    setCheckRatings((prev) => ({
      ...prev,
      [itemId]: rating,
    }));
  };

  const handleSaveCheckLog = async () => {
    if (!activeCar) {
      Alert.alert('แจ้งเตือน', 'กรุณาเพิ่มรถในระบบก่อนบันทึกรายการ');
      return;
    }
    if (!checkDate.trim()) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณาระบุวันที่ตรวจเช็ก');
      return;
    }

    // Build results array
    const results: CheckItemResult[] = BASIC_CHECK_ITEMS.map((item) => ({
      itemId: item.id,
      title: item.title,
      category: item.category,
      rating: checkRatings[item.id] || 'normal',
    }));

    // Determine overall status
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
      date: checkDate.trim(),
      mileage: activeCar.currentMileage,
      overallStatus,
      results,
      createdAt: new Date().toISOString(),
    };

    await saveBasicCheckLog(logObj);
    await loadData();
    setIsCheckModalOpen(false);
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
            // Optimistically remove from screen immediately
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

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>ประวัติ & เช็กสภาพรถ</Text>
          <Text style={styles.headerSubtitle}>
            {activeCar ? `${activeCar.brandName} ${activeCar.modelName} • ${activeCar.licensePlate}` : 'บันทึกงาน'}
          </Text>
        </View>

        {activeTab === 'logs' ? (
          <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddLogModal}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>เพิ่มบันทึก</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.startCheckHeaderBtn} onPress={handleOpenStartCheckModal}>
            <Ionicons name="play" size={14} color="#fff" />
            <Text style={styles.startCheckHeaderBtnText}>เริ่มบันทึก</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Segmented Control Bar */}
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
            ประวัติ & รายจ่าย ({logs.length})
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
            เช็กสภาพ 9 จุด ({checkLogs.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
      >
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
              <Text style={styles.sectionTitle}>รายการบันทึกทั้งหมด ({logs.length})</Text>
              <Text style={styles.sectionHint}>แตะไอคอนเพื่อแก้ไขหรือลบ</Text>
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
        {/* TAB 2: 9-POINT BASIC CHECK LOGS & START BUTTON       */}
        {/* ==================================================== */}
        {activeTab === 'checks' && (
          <View style={styles.checkTabContainer}>
            {/* Prominent "Start Check" Banner / Button (Requirement 1) */}
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

            {/* Section Header: Saved Checks (Requirement 3) */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                ประวัติการตรวจเช็กที่บันทึกไว้ ({checkLogs.length})
              </Text>
              <Text style={styles.sectionHint}>แตะเพื่อดูรายละเอียด 9 จุด</Text>
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
                  <View
                    key={log.id}
                    style={[
                      styles.savedCheckCard,
                      isLatest && styles.savedCheckCardLatest,
                    ]}
                  >
                    {/* Latest Badge */}
                    {isLatest && (
                      <View style={styles.latestCheckBadge}>
                        <Ionicons name="sparkles" size={12} color="#fff" />
                        <Text style={styles.latestCheckBadgeText}>บันทึกล่าสุด</Text>
                      </View>
                    )}

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
                );
              })
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ==================================================== */}
      {/* POP-UP MODAL: 9-POINT BASIC CHECK (Requirement 2)     */}
      {/* ==================================================== */}
      <Modal
        visible={isCheckModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsCheckModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.checkModalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>เริ่มบันทึกการเช็กสภาพ 9 จุด</Text>
                <Text style={styles.modalSub}>
                  ประเมินสภาพรถแต่ละจุดแล้วกดบันทึกผล
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsCheckModalOpen(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.checkModalScroll} showsVerticalScrollIndicator={false}>
              {/* Only Date Input as requested (เพิ่มส่วนให้ใส่วันที่อย่างเดียวพอ) */}
              <View style={styles.dateInputSection}>
                <Text style={styles.dateInputLabel}>📅 วันที่ตรวจเช็ก (YYYY-MM-DD) *</Text>
                <TextInput
                  style={styles.dateTextInput}
                  value={checkDate}
                  onChangeText={setCheckDate}
                  placeholder="2026-09-30"
                  placeholderTextColor="#64748b"
                />
              </View>

              {/* 9 Existing Check Items */}
              <Text style={styles.checkItemsHeader}>รายการตรวจเช็ก 9 จุดสำคัญ</Text>

              <View style={styles.checkItemsModalList}>
                {BASIC_CHECK_ITEMS.map((item: CheckTemplateItem, index: number) => {
                  const currentRating = checkRatings[item.id] || 'normal';

                  return (
                    <View key={item.id} style={styles.modalItemCard}>
                      <View style={styles.modalItemTop}>
                        <View style={styles.checkNumBadge}>
                          <Text style={styles.checkNumText}>{index + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.modalItemTitle}>{item.title}</Text>
                          <Text style={styles.modalItemCat}>{item.category}</Text>
                        </View>
                      </View>

                      <Text style={styles.modalItemHowTo}>🔍 วิธีตรวจ: {item.howToCheck}</Text>

                      {/* 3 Status Choice Buttons */}
                      <View style={styles.ratingBar}>
                        <TouchableOpacity
                          style={[
                            styles.ratingBtn,
                            currentRating === 'normal' && styles.ratingBtnNormalActive,
                          ]}
                          onPress={() => handleSetItemRating(item.id, 'normal')}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={currentRating === 'normal' ? '#10b981' : '#64748b'}
                          />
                          <Text
                            style={[
                              styles.ratingBtnText,
                              currentRating === 'normal' && { color: '#34d399', fontWeight: 'bold' },
                            ]}
                          >
                            ปกติ
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.ratingBtn,
                            currentRating === 'caution' && styles.ratingBtnCautionActive,
                          ]}
                          onPress={() => handleSetItemRating(item.id, 'caution')}
                        >
                          <Ionicons
                            name="alert-circle"
                            size={16}
                            color={currentRating === 'caution' ? '#f59e0b' : '#64748b'}
                          />
                          <Text
                            style={[
                              styles.ratingBtnText,
                              currentRating === 'caution' && { color: '#fbbf24', fontWeight: 'bold' },
                            ]}
                          >
                            ควรระวัง
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.ratingBtn,
                            currentRating === 'action_needed' && styles.ratingBtnActionActive,
                          ]}
                          onPress={() => handleSetItemRating(item.id, 'action_needed')}
                        >
                          <Ionicons
                            name="close-circle"
                            size={16}
                            color={currentRating === 'action_needed' ? '#ef4444' : '#64748b'}
                          />
                          <Text
                            style={[
                              styles.ratingBtnText,
                              currentRating === 'action_needed' && { color: '#f87171', fontWeight: 'bold' },
                            ]}
                          >
                            ต้องแก้ไข
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            {/* Save Button */}
            <TouchableOpacity style={styles.saveCheckSubmitBtn} onPress={handleSaveCheckLog}>
              <Ionicons name="checkmark-done" size={20} color="#fff" />
              <Text style={styles.saveCheckSubmitBtnText}>บันทึกผลการตรวจเช็ก</Text>
            </TouchableOpacity>
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
                    {CATEGORIES.find((c) => c.key === category)?.label || 'เลือกหมวดหมู่งาน'}
                  </Text>
                  <Ionicons
                    name={isCategoryDropdownOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#94a3b8"
                  />
                </TouchableOpacity>

                {isCategoryDropdownOpen && (
                  <View style={styles.dropdownMenu}>
                    {CATEGORIES.map((c) => (
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
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
    marginHorizontal: 16,
    marginTop: 12,
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
  latestCheckBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderBottomLeftRadius: 10,
    gap: 4,
  },
  latestCheckBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  savedCheckTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 4,
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
});
