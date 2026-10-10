import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getUserVehicles, getActiveVehicleId, onActiveVehicleChange, onVehiclesChange } from '../lib/storage';
import { UserVehicle, FluidCategoryKey, FluidSpecification } from '../types';
import { getFluidRequirementsForVariant } from '../data/seedData';

interface FluidCategoryMeta {
  key: FluidCategoryKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const FLUID_CATEGORIES: FluidCategoryMeta[] = [
  { key: 'engine_oil', label: 'น้ำมันเครื่อง', icon: 'speedometer-outline', color: '#f59e0b' },
  { key: 'transmission_fluid', label: 'น้ำมันเกียร์', icon: 'cog-outline', color: '#ef4444' },
  { key: 'brake_fluid', label: 'น้ำมันเบรก', icon: 'disc-outline', color: '#3b82f6' },
  { key: 'coolant', label: 'น้ำยาหล่อเย็น', icon: 'thermometer-outline', color: '#10b981' },
  { key: 'windshield_washer', label: 'น้ำฉีดกระจก', icon: 'water-outline', color: '#06b6d4' },
  { key: 'power_steering_fluid', label: 'น้ำมันพวงมาลัย', icon: 'car-outline', color: '#8b5cf6' },
  { key: 'differential_oil', label: 'น้ำมันเฟืองท้าย', icon: 'hardware-chip-outline', color: '#ec4899' },
  { key: 'transfer_case_oil', label: 'ทรานส์เฟอร์เคส', icon: 'git-merge-outline', color: '#6366f1' },
];

export default function FluidsScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [activeCar, setActiveCar] = useState<UserVehicle | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedSpec, setSelectedSpec] = useState<{ key: FluidCategoryKey; spec: FluidSpecification } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const list = await getUserVehicles();
    setVehicles(list);
    const activeId = await getActiveVehicleId();
    const current = list.find((v) => v.id === activeId) || list[0] || null;
    setActiveCar(current);
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

  const reqs = activeCar ? getFluidRequirementsForVariant(activeCar.variantId) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>สเปกของเหลวและสารหล่อลื่น</Text>
          <Text style={styles.headerSubtitle}>
            {activeCar ? `${activeCar.brandName} ${activeCar.modelName} (${activeCar.year})` : 'กำลังโหลด...'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.switchCarBtn}
          onPress={() => router.push('/cars')}
        >
          <Ionicons name="car-sport" size={16} color="#38bdf8" />
          <Text style={styles.switchCarText}>เปลี่ยนรถ</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
      >
        {/* Car Info Banner */}
        {activeCar && (
          <View style={styles.carBanner}>
            <View style={styles.carBannerHeader}>
              <View style={styles.carBadge}>
                <Text style={styles.carBadgeText}>{activeCar.brandName}</Text>
              </View>
              <Text style={styles.carPlate}>{activeCar.licensePlate || 'ไม่มีทะเบียน'}</Text>
            </View>
            <Text style={styles.carTitle}>
              {activeCar.nickname || `${activeCar.brandName} ${activeCar.modelName}`}
            </Text>
            <Text style={styles.carDetails}>
              {activeCar.generationName} • {activeCar.variantName}
            </Text>
            <View style={styles.carStats}>
              <Text style={styles.carStatText}>เครื่องยนต์: {activeCar.engineCode}</Text>
              <Text style={styles.carStatText}>เกียร์: {activeCar.transmissionName}</Text>
            </View>
          </View>
        )}

        {/* Safety Disclaimer */}
        <View style={styles.warningBox}>
          <Ionicons name="shield-checkmark" size={18} color="#f59e0b" style={{ marginRight: 6 }} />
          <Text style={styles.warningText}>
            โปรดตรวจสอบคู่มือประจำรถและฉลากก่อนเติมจริงเสมอ ห้ามเปิดฝาหม้อน้ำขณะเครื่องร้อนเด็ดขาด
          </Text>
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[styles.filterChipText, selectedFilter === 'all' && styles.filterChipTextActive]}>
              ทั้งหมด
            </Text>
          </TouchableOpacity>
          {FLUID_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.filterChip, selectedFilter === cat.key && styles.filterChipActive]}
              onPress={() => setSelectedFilter(cat.key)}
            >
              <Text style={[styles.filterChipText, selectedFilter === cat.key && styles.filterChipTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Fluid Cards List */}
        {reqs ? (
          <View style={styles.cardsList}>
            {FLUID_CATEGORIES.filter((cat) => selectedFilter === 'all' || selectedFilter === cat.key).map((cat) => {
              const spec = reqs.specs[cat.key];
              if (!spec) return null;

              if (spec.isNotApplicable) {
                return (
                  <View key={cat.key} style={styles.cardDisabled}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconCircle, { backgroundColor: '#334155' }]}>
                        <Ionicons name={cat.icon} size={20} color="#94a3b8" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.cardTitle}>{cat.label}</Text>
                        <Text style={styles.disabledReason}>
                          {spec.notApplicableReason || 'ไม่จำเป็นสำหรับรุ่นนี้ (เช่น พวงมาลัยไฟฟ้า EPS / รถขับหน้า)'}
                        </Text>
                      </View>
                      <View style={styles.statusBadgeGray}>
                        <Text style={styles.statusTextGray}>ไม่ต้องเติม</Text>
                      </View>
                    </View>
                  </View>
                );
              }

              return (
                <TouchableOpacity
                  key={cat.key}
                  style={styles.card}
                  activeOpacity={0.7}
                  onPress={() => setSelectedSpec({ key: cat.key, spec })}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.iconCircle, { backgroundColor: `${cat.color}20` }]}>
                      <Ionicons name={cat.icon} size={22} color={cat.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.cardTitle}>{cat.label}</Text>
                      <Text style={styles.cardStandard} numberOfLines={1}>
                        {spec.standard}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        spec.verificationStatus === 'verified' ? styles.statusVerified : styles.statusPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          spec.verificationStatus === 'verified' ? styles.statusTextVerified : styles.statusTextPending,
                        ]}
                      >
                        {spec.verificationStatus === 'verified' ? 'ยืนยันแล้ว' : 'รอตรวจสอบ'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.specGrid}>
                    <View style={styles.specGridItem}>
                      <Text style={styles.specLabel}>ความหนืด / เกรด</Text>
                      <Text style={styles.specValue}>{spec.viscosity || 'ตามมาตรฐาน'}</Text>
                    </View>
                    <View style={styles.specGridItem}>
                      <Text style={styles.specLabel}>ปริมาณที่ใช้</Text>
                      <Text style={styles.specValueHighlight}>
                        {spec.volumeLitres} ลิตร
                        {spec.volumeWithFilterLitres ? ` (${spec.volumeWithFilterLitres} ล. รวมกรอง)` : ''}
                      </Text>
                    </View>
                    <View style={styles.specGridItem}>
                      <Text style={styles.specLabel}>ระยะเปลี่ยนถ่าย</Text>
                      <Text style={styles.specValue}>
                        {spec.intervalKm > 0 ? `${spec.intervalKm.toLocaleString()} กม.` : 'ตรวจเช็กเป็นประจำ'}
                      </Text>
                    </View>
                    <View style={styles.specGridItem}>
                      <Text style={styles.specLabel}>ระยะเวลา</Text>
                      <Text style={styles.specValue}>
                        {spec.intervalMonths > 0 ? `${spec.intervalMonths} เดือน` : 'ทุกครั้งที่เช็ก'}
                      </Text>
                    </View>
                  </View>

                  {spec.warningNote ? (
                    <View style={styles.noteBox}>
                      <Ionicons name="information-circle-outline" size={15} color="#cbd5e1" style={{ marginRight: 5 }} />
                      <Text style={styles.noteText} numberOfLines={2}>
                        {spec.warningNote}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.cardFooter}>
                    <Text style={styles.refText} numberOfLines={1}>
                      อ้างอิง: {spec.referenceSource?.title || 'คู่มือผู้ใช้ประจำรถ'}
                    </Text>
                    <View style={styles.detailLink}>
                      <Text style={styles.detailLinkText}>ดูรายละเอียด</Text>
                      <Ionicons name="chevron-forward" size={14} color="#38bdf8" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={48} color="#475569" />
            <Text style={styles.emptyTitle}>ไม่พบข้อมูลของเหลวสำหรับรถคันนี้</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/cars')}>
              <Text style={styles.primaryBtnText}>เลือกรถคันอื่น</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={!!selectedSpec}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSpec(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedSpec && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {FLUID_CATEGORIES.find((c) => c.key === selectedSpec.key)?.label || selectedSpec.key}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedSpec(null)}>
                    <Ionicons name="close-circle" size={26} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>มาตรฐานแนะนำ:</Text>
                    <Text style={styles.modalValueBold}>{selectedSpec.spec.standard}</Text>
                  </View>

                  {selectedSpec.spec.viscosity && (
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>เบอร์ความหนืด:</Text>
                      <Text style={styles.modalValue}>{selectedSpec.spec.viscosity}</Text>
                    </View>
                  )}

                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>ปริมาณเติม:</Text>
                    <Text style={styles.modalValueHighlight}>
                      {selectedSpec.spec.volumeLitres} ลิตร
                      {selectedSpec.spec.volumeWithFilterLitres ? ` (พร้อมเปลี่ยนกรอง: ${selectedSpec.spec.volumeWithFilterLitres} ลิตร)` : ''}
                    </Text>
                  </View>

                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>รอบเปลี่ยนตามระยะทาง:</Text>
                    <Text style={styles.modalValue}>{selectedSpec.spec.intervalKm.toLocaleString()} กม.</Text>
                  </View>

                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>รอบเปลี่ยนตามเวลา:</Text>
                    <Text style={styles.modalValue}>{selectedSpec.spec.intervalMonths} เดือน</Text>
                  </View>

                  {selectedSpec.spec.warningNote ? (
                    <View style={styles.modalAlert}>
                      <Ionicons name="alert-circle" size={18} color="#f59e0b" style={{ marginRight: 6 }} />
                      <Text style={styles.modalAlertText}>{selectedSpec.spec.warningNote}</Text>
                    </View>
                  ) : null}

                  <View style={styles.refContainer}>
                    <Text style={styles.refHeading}>เอกสารและแหล่งอ้างอิง</Text>
                    <Text style={styles.refDetail}>{selectedSpec.spec.referenceSource?.title}</Text>
                    {selectedSpec.spec.referenceSource?.pageNumber && (
                      <Text style={styles.refPage}>หน้าที่: {selectedSpec.spec.referenceSource.pageNumber}</Text>
                    )}
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.guideBtn}
                    onPress={() => {
                      setSelectedSpec(null);
                      router.push('/guides');
                    }}
                  >
                    <Ionicons name="book-outline" size={18} color="#fff" />
                    <Text style={styles.guideBtnText}>เปิดคู่มือ DIY</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.logBtn}
                    onPress={() => {
                      setSelectedSpec(null);
                      router.push('/logs');
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#38bdf8" />
                    <Text style={styles.logBtnText}>บันทึกประวัติ</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    paddingBottom: 12,
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
  switchCarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  switchCarText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  carBanner: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  carBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  carBadge: {
    backgroundColor: '#0369a1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  carBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  carPlate: {
    color: '#94a3b8',
    fontSize: 12,
  },
  carTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  carDetails: {
    fontSize: 13,
    color: '#cbd5e1',
    marginTop: 2,
  },
  carStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
  },
  carStatText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#451a03',
    borderColor: '#78350f',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  warningText: {
    flex: 1,
    color: '#fde68a',
    fontSize: 11.5,
    lineHeight: 16,
  },
  filterBar: {
    marginVertical: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  filterChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  cardsList: {
    gap: 12,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardDisabled: {
    backgroundColor: '#131e32',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    opacity: 0.75,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  cardStandard: {
    fontSize: 12.5,
    color: '#38bdf8',
    marginTop: 2,
    fontWeight: '600',
  },
  disabledReason: {
    fontSize: 11.5,
    color: '#94a3b8',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusVerified: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  statusBadgeGray: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextVerified: {
    color: '#34d399',
  },
  statusTextPending: {
    color: '#fbbf24',
  },
  statusTextGray: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  specGridItem: {
    width: '48%',
  },
  specLabel: {
    fontSize: 10.5,
    color: '#94a3b8',
  },
  specValue: {
    fontSize: 12.5,
    color: '#e2e8f0',
    fontWeight: '600',
    marginTop: 2,
  },
  specValueHighlight: {
    fontSize: 13,
    color: '#38bdf8',
    fontWeight: 'bold',
    marginTop: 2,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  noteText: {
    fontSize: 11,
    color: '#cbd5e1',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  refText: {
    fontSize: 10.5,
    color: '#64748b',
    flex: 1,
  },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailLinkText: {
    color: '#38bdf8',
    fontSize: 11.5,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginTop: 20,
  },
  emptyTitle: {
    color: '#cbd5e1',
    fontSize: 14,
    marginTop: 10,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  modalBody: {
    marginVertical: 16,
  },
  modalRow: {
    marginBottom: 10,
  },
  modalLabel: {
    fontSize: 11.5,
    color: '#94a3b8',
  },
  modalValueBold: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#38bdf8',
    marginTop: 2,
  },
  modalValue: {
    fontSize: 13.5,
    color: '#f8fafc',
    marginTop: 2,
  },
  modalValueHighlight: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34d399',
    marginTop: 2,
  },
  modalAlert: {
    flexDirection: 'row',
    backgroundColor: '#451a03',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  modalAlertText: {
    color: '#fde68a',
    fontSize: 12,
    flex: 1,
  },
  refContainer: {
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
    marginTop: 14,
  },
  refHeading: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  refDetail: {
    color: '#e2e8f0',
    fontSize: 12,
  },
  refPage: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  guideBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  guideBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  logBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  logBtnText: {
    color: '#38bdf8',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
