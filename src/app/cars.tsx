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
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getUserVehicles,
  saveUserVehicle,
  deleteUserVehicle,
  getActiveVehicleId,
  setActiveVehicleId,
  getMaintenanceLogs,
} from '../lib/storage';
import { UserVehicle, Brand, CarModel, Generation, VehicleVariant, MaintenanceLog } from '../types';
import { BRANDS, CAR_MODELS, GENERATIONS, VEHICLE_VARIANTS } from '../data/seedData';

export default function CarsScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [activeCarId, setActiveCarId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isSwitchingCar, setIsSwitchingCar] = useState(false);

  // Wizard state
  const [step, setStep] = useState<number>(1);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedModel, setSelectedModel] = useState<CarModel | null>(null);
  const [selectedGen, setSelectedGen] = useState<Generation | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<VehicleVariant | null>(null);
  const [nickname, setNickname] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [color, setColor] = useState('');
  const [notes, setNotes] = useState('');

  const loadVehicles = useCallback(async () => {
    const list = await getUserVehicles();
    setVehicles(list);
    const active = await getActiveVehicleId();
    setActiveCarId(active);
    const allLogs = await getMaintenanceLogs();
    setLogs(allLogs);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVehicles();
    }, [loadVehicles])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVehicles();
    setRefreshing(false);
  };

  const handleSelectActive = async (id: string) => {
    if (id === activeCarId) return;
    setIsSwitchingCar(true);
    await setActiveVehicleId(id);
    setActiveCarId(id);
    await loadVehicles();
    // Smooth delay for clear visual feedback and safe data synchronization (~650ms)
    await new Promise((resolve) => setTimeout(resolve, 650));
    setIsSwitchingCar(false);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('ยืนยันการลบ', `คุณต้องการลบรถ "${name}" ออกจากระบบหรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบข้อมูล',
        style: 'destructive',
        onPress: async () => {
          await deleteUserVehicle(id);
          await loadVehicles();
        },
      },
    ]);
  };

  const resetWizard = () => {
    setStep(1);
    setSelectedBrand(null);
    setSelectedModel(null);
    setSelectedGen(null);
    setSelectedYear(null);
    setSelectedVariant(null);
    setNickname('');
    setLicensePlate('');
    setColor('');
    setNotes('');
  };

  const handleSaveCar = async () => {
    if (!selectedBrand || !selectedModel || !selectedGen || !selectedYear || !selectedVariant) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณาเลือกรุ่นรถและสเปกให้ครบถ้วน');
      return;
    }

    const newCar: UserVehicle = {
      id: `car-${Date.now()}`,
      nickname: nickname.trim() || `${selectedBrand.name} ${selectedModel.name}`,
      licensePlate: licensePlate.trim(),
      brandName: selectedBrand.name,
      modelName: selectedModel.name,
      generationName: selectedGen.name,
      year: selectedYear,
      variantName: selectedVariant.name,
      engineCode: selectedVariant.engineSpec.code,
      transmissionName: selectedVariant.transmission.type.toUpperCase(),
      driveType: selectedVariant.driveType,
      currentMileage: 0,
      color: color.trim() || undefined,
      notes: notes.trim() || undefined,
      variantId: selectedVariant.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveUserVehicle(newCar);
    await loadVehicles();
    setIsModalOpen(false);
    resetWizard();
    Alert.alert('สำเร็จ', 'เพิ่มข้อมูลรถเรียบร้อยแล้ว');
  };

  // Filtered lists for wizard
  const availableModels = selectedBrand
    ? CAR_MODELS.filter((m) => m.brandId === selectedBrand.id)
    : [];

  const availableGens = selectedModel
    ? GENERATIONS.filter((g) => g.modelId === selectedModel.id)
    : [];

  const availableYears = selectedGen
    ? Array.from(
        { length: selectedGen.endYear - selectedGen.startYear + 1 },
        (_, i) => selectedGen.startYear + i
      ).reverse()
    : [];

  const availableVariants = selectedGen && selectedYear
    ? VEHICLE_VARIANTS.filter((v) => v.generationId === selectedGen.id && v.years.includes(selectedYear))
    : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#cbd5e1" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>รถของฉัน (My Garage)</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>จัดการข้อมูลรถยนต์และสลับรถ</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            resetWizard();
            setIsModalOpen(true);
          }}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>เพิ่มรถ</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
      >
        <View style={styles.carList}>
          {vehicles.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="car-sport-outline" size={54} color="#475569" />
              <Text style={styles.emptyTitle}>ยังไม่มีข้อมูลรถในระบบ</Text>
              <Text style={styles.emptySub}>เพิ่มรถคันแรกของคุณเพื่อดูสเปกของเหลวและบันทึกประวัติ</Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => {
                  resetWizard();
                  setIsModalOpen(true);
                }}
              >
                <Text style={styles.primaryBtnText}>เพิ่มรถคันแรก</Text>
              </TouchableOpacity>
            </View>
          ) : (
            vehicles.map((car) => {
              const isActive = car.id === activeCarId;
              const carLogs = logs
                .filter((l) => l.vehicleId === car.id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              const latestLog = carLogs[0];

              return (
                <View key={car.id} style={[styles.carCard, isActive && styles.carCardActive]}>
                  {isActive && (
                    <View style={styles.activeRibbon}>
                      <Ionicons name="checkmark-circle" size={14} color="#fff" />
                      <Text style={styles.activeRibbonText}>รถที่กำลังเลือกใช้งาน</Text>
                    </View>
                  )}

                  <View style={styles.cardTop}>
                    <View style={styles.brandIconCircle}>
                      <Ionicons name="car-outline" size={24} color="#38bdf8" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.carName}>{car.nickname}</Text>
                      <Text style={styles.carSpecText}>
                        {car.brandName} {car.modelName} ({car.year}) • {car.variantName}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(car.id, car.nickname)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.carDetailsBox}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>ทะเบียน:</Text>
                      <Text style={styles.detailValue}>{car.licensePlate || 'ไม่ระบุ'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>รายการที่ทำล่าสุด:</Text>
                      <Text style={styles.detailValueHighlight} numberOfLines={1}>
                        {latestLog ? `${latestLog.serviceName} (${latestLog.date})` : 'ยังไม่มีประวัติการดูแล'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>รหัสเครื่องยนต์:</Text>
                      <Text style={styles.detailValue}>{car.engineCode}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>ระบบเกียร์:</Text>
                      <Text style={styles.detailValue}>{car.transmissionName}</Text>
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    {!isActive ? (
                      <TouchableOpacity
                        style={styles.selectBtn}
                        onPress={() => handleSelectActive(car.id)}
                      >
                        <Ionicons name="radio-button-off" size={16} color="#38bdf8" />
                        <Text style={styles.selectBtnText}>เลือกรถคันนี้</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.selectedIndicator}>
                        <Ionicons name="checkmark-done" size={16} color="#10b981" />
                        <Text style={styles.selectedIndicatorText}>กำลังใช้งาน</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.viewFluidsBtn}
                      onPress={async () => {
                        await handleSelectActive(car.id);
                        router.push('/fluids');
                      }}
                    >
                      <Ionicons name="water-outline" size={16} color="#fff" />
                      <Text style={styles.viewFluidsBtnText}>ดูสเปกของเหลว</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Car Modal Wizard */}
      <Modal visible={isModalOpen} animationType="slide" transparent onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>เพิ่มรถใหม่ (ขั้นตอน {step}/6)</Text>
                <Text style={styles.modalSub}>
                  {step === 1 && '1. เลือกแบรนด์รถยนต์'}
                  {step === 2 && `2. เลือกรุ่นรถ (${selectedBrand?.name})`}
                  {step === 3 && `3. เลือกโฉม / เจเนอเรชัน`}
                  {step === 4 && `4. เลือกปีจดทะเบียน`}
                  {step === 5 && `5. เลือกรุ่นย่อย & สเปกเครื่องยนต์`}
                  {step === 6 && '6. ข้อมูลทะเบียนและชื่อเรียกรถ'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Step 1: Brand */}
              {step === 1 && (
                <View style={styles.stepGrid}>
                  {BRANDS.map((b) => (
                    <TouchableOpacity
                      key={b.id}
                      style={[styles.wizardOption, selectedBrand?.id === b.id && styles.wizardOptionSelected]}
                      onPress={() => {
                        setSelectedBrand(b);
                        setSelectedModel(null);
                        setStep(2);
                      }}
                    >
                      <Ionicons name="car-sport" size={28} color="#38bdf8" />
                      <Text style={styles.wizardOptionTitle}>{b.name}</Text>
                      <Text style={styles.wizardOptionSub}>{b.country}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Step 2: Model */}
              {step === 2 && (
                <View style={styles.stepGrid}>
                  {availableModels.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.wizardOption, selectedModel?.id === m.id && styles.wizardOptionSelected]}
                      onPress={() => {
                        setSelectedModel(m);
                        setSelectedGen(null);
                        setStep(3);
                      }}
                    >
                      <Text style={styles.wizardOptionTitle}>{m.name}</Text>
                      <Text style={styles.wizardOptionSub}>{selectedBrand?.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Step 3: Generation */}
              {step === 3 && (
                <View style={styles.stepList}>
                  {availableGens.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.wizardListItem, selectedGen?.id === g.id && styles.wizardOptionSelected]}
                      onPress={() => {
                        setSelectedGen(g);
                        setSelectedYear(null);
                        setStep(4);
                      }}
                    >
                      <Text style={styles.wizardOptionTitle}>{g.name}</Text>
                      <Text style={styles.wizardOptionSub}>
                        ปีที่ผลิต: {g.startYear} - {g.endYear}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Step 4: Year */}
              {step === 4 && (
                <View style={styles.yearGrid}>
                  {availableYears.map((yr) => (
                    <TouchableOpacity
                      key={yr}
                      style={[styles.yearItem, selectedYear === yr && styles.wizardOptionSelected]}
                      onPress={() => {
                        setSelectedYear(yr);
                        setSelectedVariant(null);
                        setStep(5);
                      }}
                    >
                      <Text style={styles.yearText}>{yr}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Step 5: Variant */}
              {step === 5 && (
                <View style={styles.stepList}>
                  {availableVariants.map((v) => (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.wizardListItem, selectedVariant?.id === v.id && styles.wizardOptionSelected]}
                      onPress={() => {
                        setSelectedVariant(v);
                        setStep(6);
                      }}
                    >
                      <Text style={styles.wizardOptionTitle}>{v.name}</Text>
                      <Text style={styles.wizardOptionSub}>
                        เครื่องยนต์: {v.engineSpec.code} ({v.engineSpec.displacement}L) • เกียร์: {v.transmission.type.toUpperCase()}
                      </Text>
                      <Text style={styles.wizardSpecBadge}>
                        ขับเคลื่อน: {v.driveType.toUpperCase()} | พวงมาลัย: {v.steeringType.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Step 6: User Info */}
              {step === 6 && (
                <View style={styles.formContainer}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>ชื่อเรียกรถ (Nickname)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={nickname}
                      onChangeText={setNickname}
                      placeholder="เช่น รถคันโปรด, Vios ขาว"
                      placeholderTextColor="#64748b"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>เลขทะเบียนรถ</Text>
                    <TextInput
                      style={styles.textInput}
                      value={licensePlate}
                      onChangeText={setLicensePlate}
                      placeholder="เช่น 1กข 4589 กทม."
                      placeholderTextColor="#64748b"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>สีรถ (ไม่บังคับ)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={color}
                      onChangeText={setColor}
                      placeholder="เช่น บรอนซ์เงิน, ดำ"
                      placeholderTextColor="#64748b"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>บันทึกเพิ่มเติม (ไม่บังคับ)</Text>
                    <TextInput
                      style={[styles.textInput, { height: 60 }]}
                      value={notes}
                      onChangeText={setNotes}
                      multiline
                      placeholder="ประวัติเดิม หรือข้อมูลพิเศษ"
                      placeholderTextColor="#64748b"
                    />
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              {step > 1 && (
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
                  <Ionicons name="arrow-back" size={18} color="#94a3b8" />
                  <Text style={styles.backBtnText}>ย้อนกลับ</Text>
                </TouchableOpacity>
              )}

              {step === 6 ? (
                <TouchableOpacity style={styles.submitBtn} onPress={handleSaveCar}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>บันทึกข้อมูลรถ</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Switching Car Loading Modal Popup */}
      <Modal visible={isSwitchingCar} transparent animationType="fade">
        <View style={styles.loadingModalOverlay}>
          <View style={styles.loadingModalCard}>
            <View style={styles.loadingSpinnerBadge}>
              <ActivityIndicator size="large" color="#38bdf8" />
            </View>
            <Text style={styles.loadingModalTitle}>กำลังเปลี่ยนข้อมูลรถยนต์</Text>
            <Text style={styles.loadingModalSubtitle}>โปรดรอสักครู่ ระบบกำลังรีเฟรชข้อมูล...</Text>
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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
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
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  carList: {
    marginTop: 14,
    gap: 14,
  },
  carCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
    overflow: 'hidden',
  },
  carCardActive: {
    borderColor: '#0284c7',
    borderWidth: 2,
  },
  activeRibbon: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
    gap: 4,
  },
  activeRibbonText: {
    color: '#fff',
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  brandIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  carSpecText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  carDetailsBox: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  detailValue: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  detailValueBold: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  detailValueHighlight: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#38bdf8',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  selectBtnText: {
    color: '#38bdf8',
    fontSize: 12.5,
    fontWeight: '600',
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedIndicatorText: {
    color: '#10b981',
    fontSize: 12.5,
    fontWeight: '600',
  },
  viewFluidsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  viewFluidsBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginTop: 30,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
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
    fontSize: 12,
    color: '#38bdf8',
    marginTop: 2,
  },
  modalContent: {
    marginVertical: 14,
  },
  stepGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  wizardOption: {
    width: '48%',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  wizardOptionSelected: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  wizardOptionTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 6,
    textAlign: 'center',
  },
  wizardOptionSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  stepList: {
    gap: 10,
  },
  wizardListItem: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  wizardSpecBadge: {
    fontSize: 10.5,
    color: '#38bdf8',
    marginTop: 4,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  yearItem: {
    width: '30%',
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  yearText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  formContainer: {
    gap: 12,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  backBtnText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    gap: 6,
    marginLeft: 'auto',
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  loadingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingModalCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  loadingSpinnerBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  loadingModalTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  loadingModalSubtitle: {
    color: '#94a3b8',
    fontSize: 12.5,
    textAlign: 'center',
  },
});
