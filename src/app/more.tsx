import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function MoreScreen() {
  const router = useRouter();

  const services = [
    {
      id: 'fluids',
      title: 'สเปกของเหลวตรงรุ่น',
      desc: 'ตรวจเช็กมาตรฐาน น้ำมันเครื่อง น้ำมันเกียร์ หล่อเย็น 8 ระบบ',
      icon: 'water',
      iconBg: 'rgba(56, 189, 248, 0.15)',
      iconColor: '#38bdf8',
      route: '/fluids',
    },
    {
      id: 'logs',
      title: 'บันทึกงาน DIY & ประวัติ',
      desc: 'บันทึกการเปลี่ยนของเหลว ค่าใช้จ่าย และเช็ก 9 จุดสำคัญ',
      icon: 'clipboard',
      iconBg: 'rgba(168, 85, 247, 0.15)',
      iconColor: '#c084fc',
      route: '/logs',
    },
    {
      id: 'guides',
      title: 'คู่มือการดูแล DIY',
      desc: 'ขั้นตอนทำเองอย่างปลอดภัย ระดับความยาก และคำเตือน',
      icon: 'book',
      iconBg: 'rgba(16, 185, 129, 0.15)',
      iconColor: '#10b981',
      route: '/guides',
    },
    {
      id: 'cars',
      title: 'จัดการรถของฉัน',
      desc: 'เพิ่มรถ สลับรถที่ใช้งาน และตรวจสอบสเปกรถแต่ละคัน',
      icon: 'car-sport',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      iconColor: '#f59e0b',
      route: '/cars',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>CARSERVICES MENU</Text>
          <Text style={styles.headerTitle}>อื่นๆ & บริการทั้งหมด</Text>
        </View>

        {/* Feature: System Status Highlight Button (ตามที่สั่ง) */}
        <View style={styles.systemStatusSection}>
          <View style={styles.statusSectionHeader}>
            <View style={styles.pulseDot} />
            <Text style={styles.statusSectionTitle}>ระบบและความพร้อมการทำงาน</Text>
          </View>

          <TouchableOpacity
            style={styles.systemStatusCard}
            onPress={() => router.push('/explore' as any)}
            activeOpacity={0.85}
          >
            <View style={styles.statusCardLeft}>
              <View style={styles.statusIconCircle}>
                <Ionicons name="hardware-chip-outline" size={26} color="#38bdf8" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.statusBadgeRow}>
                  <Text style={styles.statusCardTitle}>สถานะระบบ & ฐานข้อมูล</Text>
                  <View style={styles.onlineBadge}>
                    <Text style={styles.onlineBadgeText}>ONLINE</Text>
                  </View>
                </View>
                <Text style={styles.statusCardDesc}>
                  ตรวจสอบการเชื่อมต่อ Supabase, ตารางข้อมูล และแคชในเครื่อง
                </Text>
              </View>
            </View>

            <View style={styles.statusBtnRow}>
              <Text style={styles.statusBtnText}>แตะเพื่อดูรายงานสถานะระบบ</Text>
              <Ionicons name="chevron-forward" size={18} color="#38bdf8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Services List */}
        <Text style={styles.sectionTitle}>บริการและเมนูทั้งหมด</Text>
        <View style={styles.serviceList}>
          {services.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.serviceCard}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.serviceIconWrap, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon as any} size={22} color={item.iconColor} />
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceTitle}>{item.title}</Text>
                <Text style={styles.serviceDesc} numberOfLines={2}>
                  {item.desc}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#64748b" />
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info Footer */}
        <View style={styles.footerBox}>
          <Text style={styles.footerAppName}>CarServices Mobile</Text>
          <Text style={styles.footerVersion}>Version 1.0.0 • SQLite & Supabase Sync</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    marginTop: 6,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  systemStatusSection: {
    marginBottom: 24,
  },
  statusSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  statusSectionTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#94a3b8',
  },
  systemStatusCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#0284c7',
    padding: 16,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  statusCardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 12,
  },
  statusIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  onlineBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  onlineBadgeText: {
    color: '#10b981',
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  statusCardDesc: {
    fontSize: 11.5,
    color: '#94a3b8',
    marginTop: 4,
    lineHeight: 16,
  },
  statusBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  statusBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  serviceList: {
    gap: 10,
    marginBottom: 24,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 14,
  },
  serviceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 13.5,
    fontWeight: 'bold',
    color: '#fff',
  },
  serviceDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 15,
  },
  footerBox: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  footerAppName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
  },
  footerVersion: {
    fontSize: 10.5,
    color: '#475569',
    marginTop: 2,
  },
  accountCard: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountAvatarGuest: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  accountEmail: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  roleAdminBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  roleText: {
    color: '#38bdf8',
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  logoutBtnText: {
    color: '#f43f5e',
    fontSize: 11,
    fontWeight: '600',
  },
  loginBtnSmall: {
    backgroundColor: '#38bdf8',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  loginBtnSmallText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
  },
});

