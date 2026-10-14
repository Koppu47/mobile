import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getUserVehicles,
  getActiveVehicleId,
  getMaintenanceLogs,
  getRemindersForVehicle,
  onActiveVehicleChange,
  onVehiclesChange,
} from '../lib/storage';
import { UserVehicle, ReminderItem, MaintenanceLog } from '../types';
import { DIY_GUIDES } from '../data/diyGuidesData';
import { useLanguage } from '../lib/LanguageContext';
import { MASCOT_DIALOGUES, MascotDialogue } from '../data/mascotDialogues';

const MASCOT_IMAGES = {
  main01: require('../../assets/main01.png'),
  happy01: require('../../assets/happy01.png'),
  curious: require('../../assets/curious.png'),
};

export default function HomeScreen() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [activeCar, setActiveCar] = useState<UserVehicle | null>(null);
  const [latestLog, setLatestLog] = useState<MaintenanceLog | null>(null);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDialogue, setCurrentDialogue] = useState<MascotDialogue>(
    () => MASCOT_DIALOGUES.find((d) => d.isInitial) || MASCOT_DIALOGUES[0]
  );

  const handleMascotTap = () => {
    const available = MASCOT_DIALOGUES.filter(
      (d) => !d.isInitial && d.id !== currentDialogue.id
    );
    if (available.length > 0) {
      const randomIndex = Math.floor(Math.random() * available.length);
      setCurrentDialogue(available[randomIndex]);
    }
  };

  const loadData = useCallback(async () => {
    const list = await getUserVehicles();
    setVehicles(list);
    const activeId = await getActiveVehicleId();
    const current = list.find((v) => v.id === activeId) || list[0] || null;
    setActiveCar(current);

    if (current) {
      const logs = await getMaintenanceLogs(current.id);
      logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setLatestLog(logs[0] || null);
      const rems = getRemindersForVehicle(current, logs);
      setReminders(rems);
    } else {
      setLatestLog(null);
      setReminders([]);
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

  const recordedReminders = reminders.filter((r) => r.hasRecord);
  const urgentReminders = recordedReminders.filter(
    (r) => r.status === 'overdue' || r.status === 'due_soon'
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top App Bar Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.logoBadge}>
            <Ionicons name="car" size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.appSubTitle}>CarServices</Text>
            <Text style={styles.appTitle} numberOfLines={1}>
              {lang === 'th' ? 'คู่มือของเหลวรถยนต์' : 'Car Fluids Guide'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />
        }
      >
        {/* Active Vehicle Card */}
        {activeCar ? (
          <>
            {/* Mascot Character Banner (ตัวละครเกาะบนกรอบรถที่เลือกใช้งาน - แตะเพื่อสุ่มคำพูดและเปลี่ยนอารมณ์) */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleMascotTap}
              style={styles.mascotBanner}
              accessibilityRole="button"
              accessibilityLabel="แตะตัวละครเพื่อสุ่มคำพูดหรือเคล็ดลับดูแลรถ"
            >
              <View style={styles.mascotCharWrap}>
                <Image
                  source={MASCOT_IMAGES[currentDialogue.mood]}
                  style={styles.mascotImage}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.speechBubbleWrap}>
                <View style={styles.speechBubble}>
                  <View style={styles.speechBubbleArrowBorder} />
                  <View style={styles.speechBubbleArrow} />
                  <Text style={styles.speechBubbleText}>
                    {lang === 'en' && currentDialogue.enText
                      ? currentDialogue.enText
                      : currentDialogue.text}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.carCard}>
            <View style={styles.carBadgeRow}>
              <Text style={styles.activeTag}>
                {lang === 'th' ? '✓ รถที่เลือกใช้งาน' : '✓ Active Vehicle'}
              </Text>
              <Text style={styles.carYear}>{activeCar.year}</Text>
            </View>
            <Text style={styles.carNickname}>
              {activeCar.nickname || `${activeCar.brandName} ${activeCar.modelName}`}
            </Text>
            <Text style={styles.carSub}>
              {activeCar.brandName} {activeCar.modelName} • {activeCar.variantName}
            </Text>

            <View style={styles.specsRow}>
              <View style={[styles.specItem, { flex: 1.3 }]}>
                <Text style={styles.specLabel}>
                  {lang === 'th' ? 'รายการที่ทำล่าสุด' : 'Latest Service'}
                </Text>
                <Text style={styles.specValHighlight} numberOfLines={1}>
                  {latestLog ? latestLog.serviceName : (lang === 'th' ? 'ยังไม่มีประวัติการดูแล' : 'No service history')}
                </Text>
                {latestLog && (
                  <Text style={styles.specDateText}>
                    {lang === 'th' ? `วันที่: ${latestLog.date}` : `Date: ${latestLog.date}`}
                  </Text>
                )}
              </View>
              <View style={[styles.specItem, { flex: 0.9, paddingLeft: 8 }]}>
                <Text style={styles.specLabel}>
                  {lang === 'th' ? 'เครื่องยนต์ / เกียร์' : 'Engine / Transmission'}
                </Text>
                <Text style={styles.specVal} numberOfLines={1}>
                  {activeCar.engineCode}
                </Text>
                <Text style={styles.specDateText} numberOfLines={1}>
                  {lang === 'th' ? `เกียร์ ${activeCar.transmissionName}` : activeCar.transmissionName}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.selectCarBtn}
              onPress={() => router.push('/cars' as any)}
            >
              <Ionicons name="car-sport" size={17} color="#ffffff" />
              <Text style={styles.selectCarBtnText}>
                {lang === 'th' ? 'เลือกรถ' : 'Select Vehicle'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
          <TouchableOpacity
            style={styles.noCarCard}
            onPress={() => router.push('/cars' as any)}
          >
            <Ionicons name="add-circle" size={32} color="#38bdf8" />
            <Text style={styles.noCarTitle}>
              {lang === 'th' ? 'ยังไม่มีข้อมูลรถยนต์' : 'No Vehicle Data'}
            </Text>
            <Text style={styles.noCarSub}>
              {lang === 'th' ? 'แตะเพื่อเลือกรุ่นรถของคุณ' : 'Tap to select your vehicle'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Urgent Reminders Alert */}
        {urgentReminders.length > 0 && (
          <View style={styles.alertCard}>
            <Ionicons name="warning" size={20} color="#f59e0b" />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>
                {lang === 'th'
                  ? `มี ${urgentReminders.length} รายการที่ใกล้หรือเกินกำหนด!`
                  : `${urgentReminders.length} items due soon or overdue!`}
              </Text>
              <Text style={styles.alertDesc}>
                {urgentReminders[0].title}{' '}
                {lang === 'th'
                  ? `(ครบกำหนดที่ ${urgentReminders[0].dueMileage?.toLocaleString()} กม.)`
                  : `(Due at ${urgentReminders[0].dueMileage?.toLocaleString()} km)`}
              </Text>
            </View>
          </View>
        )}

        {/* 3 Action Shortcuts (Centered) */}
        <View style={styles.gridNav}>
          <TouchableOpacity
            style={styles.gridBtn}
            onPress={() => router.push('/fluids' as any)}
          >
            <View style={[styles.gridIcon, { backgroundColor: 'rgba(56,189,248,0.15)' }]}>
              <Ionicons name="water" size={22} color="#38bdf8" />
            </View>
            <Text style={styles.gridLabel} numberOfLines={1}>
              {lang === 'th' ? 'สเปคของเหลว' : 'Fluid Specs'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridBtn}
            onPress={() => router.push('/guides' as any)}
          >
            <View style={[styles.gridIcon, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
              <Ionicons name="book" size={22} color="#10b981" />
            </View>
            <Text style={styles.gridLabel} numberOfLines={1}>
              {lang === 'th' ? 'คู่มือ DIY' : 'DIY Guides'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridBtn}
            onPress={() => router.push('/cars' as any)}
          >
            <View style={[styles.gridIcon, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
              <Ionicons name="car-sport" size={22} color="#f59e0b" />
            </View>
            <Text style={styles.gridLabel} numberOfLines={1}>
              {lang === 'th' ? 'รถของฉัน' : 'My Cars'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Reminders List Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {lang === 'th' ? 'กำหนดบำรุงรักษาของเหลว' : 'Maintenance Schedule'}
          </Text>
          <Text style={styles.sectionCount}>
            {recordedReminders.length} {lang === 'th' ? 'รายการ' : 'items'}
          </Text>
        </View>

        {recordedReminders.length > 0 ? (
          recordedReminders.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.reminderCard}
              activeOpacity={0.7}
              onPress={() => {
                router.push({
                  pathname: '/logs',
                  params: {
                    reminderCategory: item.category,
                    reminderTitle: item.title,
                    lastDoneDate: item.lastDoneDate || '',
                    lastDoneMileage: item.lastDoneMileage != null ? String(item.lastDoneMileage) : '',
                    dueMileage: item.dueMileage != null ? String(item.dueMileage) : '',
                    dueDate: item.dueDate || '',
                    standard: item.standard || '',
                    volumeLitres: item.volumeLitres != null ? String(item.volumeLitres) : '',
                    intervalKm: item.intervalKm != null ? String(item.intervalKm) : '',
                    intervalMonths: item.intervalMonths != null ? String(item.intervalMonths) : '',
                    warningNote: item.notes || '',
                    status: item.status || '',
                  },
                } as any);
              }}
            >
              <View style={styles.reminderInfo}>
                <Text style={styles.reminderTitle}>{item.title}</Text>
                <Text style={styles.reminderSub}>
                  {lang === 'th'
                    ? `ครบกำหนดที่: ${item.dueMileage?.toLocaleString()} กม.`
                    : `Due at: ${item.dueMileage?.toLocaleString()} km`}
                </Text>
              </View>

              <View style={styles.reminderActionRow}>
                {item.status === 'overdue' && (
                  <View style={[styles.badge, styles.badgeRed]}>
                    <Text style={[styles.badgeText, styles.textRed]}>
                      {lang === 'th' ? 'เกินกำหนด' : 'Overdue'}
                    </Text>
                  </View>
                )}
                {item.status === 'due_soon' && (
                  <View style={[styles.badge, styles.badgeYellow]}>
                    <Text style={[styles.badgeText, styles.textYellow]}>
                      {lang === 'th' ? 'ใกล้ถึง' : 'Due Soon'}
                    </Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color="#64748b" />
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyReminderCard}>
            <View style={styles.emptyReminderIconBg}>
              <Ionicons name="water-outline" size={24} color="#64748b" />
            </View>
            <Text style={styles.emptyReminderTitle}>
              {lang === 'th' ? 'ยังไม่มีรายการที่มีการบันทึก' : 'No service records yet'}
            </Text>
            <Text style={styles.emptyReminderSub}>
              {lang === 'th'
                ? 'บันทึกประวัติการเปลี่ยนของเหลวเพื่อเริ่มต้นการติดตามรอบบำรุงรักษา'
                : 'Record fluid maintenance history to start tracking intervals'}
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => router.push('/logs' as any)}
            >
              <Ionicons name="add-circle-outline" size={16} color="#38bdf8" />
              <Text style={styles.emptyActionText}>
                {lang === 'th' ? 'บันทึกรายการดูแล' : 'Add Maintenance Log'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* DIY Guides Preview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {lang === 'th' ? 'คู่มือ DIY แนะนำ' : 'Recommended DIY Guides'}
          </Text>
        </View>

        {DIY_GUIDES.slice(0, 2).map((guide) => (
          <TouchableOpacity
            key={guide.id}
            style={styles.guideCard}
            onPress={() => router.push('/guides' as any)}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={styles.guideBadgeRow}>
                <Text style={styles.guideDiff}>{guide.difficulty}</Text>
                <Text style={styles.guideTime}>
                  ~{guide.estimatedMinutes} {lang === 'th' ? 'นาที' : 'min'}
                </Text>
              </View>
              <Text style={styles.guideTitle}>{guide.title}</Text>
              <Text style={styles.guideDesc} numberOfLines={1}>
                {guide.summary}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748b" />
          </TouchableOpacity>
        ))}
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f172a' },
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appSubTitle: { fontSize: 11, color: '#38bdf8', fontWeight: '600' },
  appTitle: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
  mascotBanner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: -6,
    zIndex: 10,
    elevation: 10,
    paddingLeft: 18,
    paddingRight: 6,
  },
  mascotCharWrap: {
    width: 125,
    height: 155,
    zIndex: 10,
    elevation: 10,
  },
  mascotImage: {
    width: '100%',
    height: '100%',
  },
  speechBubbleWrap: {
    flex: 1,
    paddingLeft: 10,
    paddingRight: 4,
    paddingBottom: 18,
    justifyContent: 'center',
    zIndex: 5,
  },
  speechBubble: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    paddingVertical: 10,
    paddingHorizontal: 13,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
    minHeight: 48,
    justifyContent: 'center',
  },
  speechBubbleArrow: {
    position: 'absolute',
    left: -7,
    top: '50%',
    marginTop: -6,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderTopColor: 'transparent',
    borderBottomWidth: 6,
    borderBottomColor: 'transparent',
    borderRightWidth: 7,
    borderRightColor: '#ffffff',
    zIndex: 2,
  },
  speechBubbleArrowBorder: {
    position: 'absolute',
    left: -9,
    top: '50%',
    marginTop: -7,
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderTopColor: 'transparent',
    borderBottomWidth: 7,
    borderBottomColor: 'transparent',
    borderRightWidth: 9,
    borderRightColor: '#38bdf8',
    zIndex: 1,
  },
  speechBubbleText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'left',
    lineHeight: 17,
  },
  carCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
    zIndex: 1,
  },
  carBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  activeTag: { fontSize: 11, color: '#10b981', fontWeight: 'bold' },
  carYear: { fontSize: 12, color: '#94a3b8' },
  carNickname: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  carSub: { fontSize: 12, color: '#94a3b8', marginBottom: 12 },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0b0f19',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  specItem: { flex: 1 },
  specLabel: { fontSize: 10, color: '#64748b' },
  specVal: { fontSize: 13, color: '#fff', fontWeight: 'bold' },
  specValHighlight: { fontSize: 12.5, color: '#38bdf8', fontWeight: 'bold', marginTop: 1 },
  specDateText: { fontSize: 10.5, color: '#94a3b8', marginTop: 1 },
  selectCarBtn: {
    backgroundColor: '#38bdf8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  selectCarBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 13.5 },
  noCarCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  noCarTitle: { color: '#fff', fontWeight: 'bold', fontSize: 15, marginTop: 8 },
  noCarSub: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.12)',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    marginBottom: 16,
    gap: 10,
  },
  alertContent: { flex: 1 },
  alertTitle: { color: '#fbbf24', fontSize: 12, fontWeight: 'bold' },
  alertDesc: { color: '#fde68a', fontSize: 11, marginTop: 2 },
  gridNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  gridBtn: {
    flex: 1,
    maxWidth: 110,
    backgroundColor: '#111827',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  gridIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 11.5,
    color: '#e2e8f0',
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  sectionCount: { fontSize: 11, color: '#64748b' },
  reminderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 8,
  },
  reminderInfo: { flex: 1 },
  reminderTitle: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  reminderSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  reminderSubUnrecorded: { fontSize: 11, color: '#64748b', marginTop: 2, fontStyle: 'italic' },
  reminderActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  emptyReminderCard: {
    backgroundColor: '#111827',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyReminderIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyReminderTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 4,
  },
  emptyReminderSub: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  emptyActionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  recordActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  recordActionText: { color: '#38bdf8', fontSize: 11, fontWeight: 'bold' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeRed: { backgroundColor: 'rgba(244,63,94,0.15)' },
  badgeYellow: { backgroundColor: 'rgba(245,158,11,0.15)' },
  badgeGreen: { backgroundColor: 'rgba(16,185,129,0.15)' },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  textRed: { color: '#f43f5e' },
  textYellow: { color: '#f59e0b' },
  textGreen: { color: '#10b981' },
  guideCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 8,
  },
  guideBadgeRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  guideDiff: {
    fontSize: 10,
    backgroundColor: '#0c4a6e',
    color: '#38bdf8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  guideTime: { fontSize: 10, color: '#94a3b8' },
  guideTitle: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  guideDesc: { fontSize: 11, color: '#64748b', marginTop: 2 },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    maxHeight: '82%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  modalHeaderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  modalIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', flex: 1 },
  modalCloseBtn: { padding: 4 },
  modalScroll: { padding: 16 },
  modalSectionBox: {
    backgroundColor: '#0b0f19',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  modalSectionLabel: { fontSize: 11.5, fontWeight: 'bold', color: '#38bdf8', marginBottom: 8 },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  modalRowLabel: { fontSize: 12, color: '#94a3b8' },
  modalRowVal: { fontSize: 12, color: '#e2e8f0', fontWeight: '500' },
  modalRowValHighlight: { fontSize: 12.5, color: '#38bdf8', fontWeight: 'bold' },
  modalRowValDue: { fontSize: 12.5, color: '#f59e0b', fontWeight: 'bold' },
  modalNotesLabel: { fontSize: 11, color: '#94a3b8', marginBottom: 2 },
  modalNotesVal: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 16 },
  modalFooterRow: {
    flexDirection: 'row',
    padding: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  modalLogBtn: {
    flex: 1,
    backgroundColor: '#38bdf8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  modalLogBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 12.5 },
  modalCloseFooterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseFooterText: { color: '#94a3b8', fontWeight: '600', fontSize: 12.5 },
});
