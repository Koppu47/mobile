import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getUserVehicles, getMaintenanceLogs } from '../lib/storage';
import { useLanguage } from '../lib/LanguageContext';

export default function StatusScreen() {
  const { lang } = useLanguage();
  const [dbStatus, setDbStatus] = useState<string>('กำลังตรวจสอบ...');
  const [tableStatus, setTableStatus] = useState<Record<string, boolean>>({});
  const [vehicleCount, setVehicleCount] = useState<number>(0);
  const [logCount, setLogCount] = useState<number>(0);

  const checkConnection = useCallback(async () => {
    setDbStatus('กำลังทดสอบการเชื่อมต่อ...');
    if (!isSupabaseConfigured()) {
      setDbStatus('ยังไม่ได้ตั้งค่าคีย์ Supabase');
      return;
    }

    try {
      // Test Master Catalog tables
      const { data: bData, error: bErr } = await supabase.from('brands').select('id');
      const { data: mData, error: mErr } = await supabase.from('car_models').select('id');
      const { data: vData, error: vErr } = await supabase.from('vehicle_variants').select('id');

      setTableStatus({
        brands: !bErr,
        car_models: !mErr,
        vehicle_variants: !vErr,
      });

      if (!bErr) {
        setDbStatus('เชื่อมต่อ Master Catalog สำเร็จ ✓');
      } else {
        setDbStatus('เชื่อมต่อเซิร์ฟเวอร์ได้แล้ว (รอรันคำสั่ง SQL สร้างตาราง)');
      }
    } catch (e: any) {
      setDbStatus('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }

    const cars = await getUserVehicles();
    const logs = await getMaintenanceLogs();
    setVehicleCount(cars.length);
    setLogCount(logs.length);
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkConnection();
    }, [checkConnection])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{lang === 'th' ? 'สถานะระบบ & Supabase' : 'System & Supabase Status'}</Text>
            <Text style={styles.subtitle}>{lang === 'th' ? 'ตรวจสอบความพร้อมของฐานข้อมูลและคลาวด์' : 'Check database and cloud service health'}</Text>
          </View>
        </View>

        {/* Supabase Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cloud" size={20} color="#38bdf8" />
            <Text style={styles.cardTitle}>การเชื่อมต่อ Supabase</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Project URL:</Text>
            <Text style={styles.val} numberOfLines={1}>
              https://acjcnusbzfjulcigmlwd.supabase.co
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>สถานะ:</Text>
            <Text style={[styles.val, { color: '#38bdf8', fontWeight: 'bold' }]}>
              {dbStatus}
            </Text>
          </View>

          <TouchableOpacity style={styles.retryBtn} onPress={checkConnection}>
            <Ionicons name="refresh" size={14} color="#0f172a" />
            <Text style={styles.retryText}>ทดสอบการเชื่อมต่อใหม่</Text>
          </TouchableOpacity>
        </View>

        {/* Database Tables Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="server" size={20} color="#10b981" />
            <Text style={styles.cardTitle}>ตาราง Master Catalog (Read-Only)</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableText}>• brands (แบรนด์รถ)</Text>
            <Text
              style={[
                styles.badge,
                tableStatus.brands ? styles.badgeGreen : styles.badgeYellow,
              ]}
            >
              {tableStatus.brands ? 'พร้อมใช้งาน' : 'รอรัน SQL'}
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableText}>• car_models (รุ่นรถ)</Text>
            <Text
              style={[
                styles.badge,
                tableStatus.car_models ? styles.badgeGreen : styles.badgeYellow,
              ]}
            >
              {tableStatus.car_models ? 'พร้อมใช้งาน' : 'รอรัน SQL'}
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableText}>• vehicle_variants (รุ่นย่อย & สเปก)</Text>
            <Text
              style={[
                styles.badge,
                tableStatus.vehicle_variants ? styles.badgeGreen : styles.badgeYellow,
              ]}
            >
              {tableStatus.vehicle_variants ? 'พร้อมใช้งาน' : 'รอรัน SQL'}
            </Text>
          </View>
        </View>

        {/* Local Storage Cache Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="phone-portrait" size={20} color="#a855f7" />
            <Text style={styles.cardTitle}>ข้อมูลออฟไลน์ในเครื่อง (AsyncStorage)</Text>
          </View>
          <Text style={styles.cacheText}>
            • จำนวนรถที่บันทึก: {vehicleCount} คัน
          </Text>
          <Text style={styles.cacheText}>
            • จำนวนประวัติการดูแล: {logCount} รายการ
          </Text>
          <Text style={styles.cacheHint}>
            ระบบรองรับ Offline First ข้อมูลจะทำงานในเครื่องได้ทันทีแม้ยังไม่มีอินเทอร์เน็ต
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#090d16' },
  container: { padding: 16, gap: 14 },
  header: { marginBottom: 4 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 13, fontWeight: 'bold', color: '#fff' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  label: { fontSize: 11, color: '#64748b' },
  val: { fontSize: 11, color: '#cbd5e1', flex: 1, textAlign: 'right' },
  retryBtn: {
    backgroundColor: '#38bdf8',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 6,
  },
  retryText: { color: '#0f172a', fontWeight: 'bold', fontSize: 11 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tableText: { fontSize: 11, color: '#cbd5e1' },
  badge: { fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeGreen: { backgroundColor: '#064e3b', color: '#6ee7b7' },
  badgeYellow: { backgroundColor: '#78350f', color: '#fde68a' },
  cacheText: { fontSize: 11, color: '#cbd5e1' },
  cacheHint: { fontSize: 10.5, color: '#64748b', marginTop: 4, lineHeight: 15 },
});
