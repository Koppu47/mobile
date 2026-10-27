import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, cleanDisplayName } from '../lib/AuthContext';
import { AuthSuccessModal } from '../components/ui/AuthSuccessModal';
import { LogoutConfirmModal } from '../components/ui/LogoutConfirmModal';

export default function LoginScreen() {
  const router = useRouter();
  const {
    user,
    role,
    isGuest,
    loginWithPassword,
    registerWithPassword,
    loginAsGuest,
    logout,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [authModal, setAuthModal] = useState<{
    visible: boolean;
    type: 'login' | 'register';
    targetRoute?: string;
  }>({
    visible: false,
    type: 'login',
    targetRoute: '/',
  });
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    setLoading(true);

    if (mode === 'login') {
      const res = await loginWithPassword(email, password);
      setLoading(false);
      if (res.success) {
        setAuthModal({
          visible: true,
          type: 'login',
          targetRoute: '/',
        });
      } else {
        Alert.alert('เข้าสู่ระบบไม่สำเร็จ', res.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }
    } else {
      if (!displayName.trim()) {
        setLoading(false);
        Alert.alert('แจ้งเตือน', 'กรุณาระบุชื่อที่ต้องการแสดง');
        return;
      }
      const res = await registerWithPassword(email, password, displayName);
      setLoading(false);
      if (res.success) {
        setAuthModal({
          visible: true,
          type: 'register',
          targetRoute: '/',
        });
      } else {
        Alert.alert('สมัครสมาชิกไม่สำเร็จ', res.error || 'โปรดลองใหม่อีกครั้ง');
      }
    }
  };



  const handleGuest = async () => {
    await loginAsGuest();
    Alert.alert('โหมดผู้เยี่ยมชม', 'เข้าใช้งานแบบ Guest (ใช้ข้อมูลในเครื่อง)', [
      { text: 'ตกลง', onPress: () => router.replace('/') },
    ]);
  };

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setLogoutModalVisible(false);
    }
  };

  // If already logged in (and not currently displaying success popup), show current profile details
  if (user && !isGuest && !authModal.visible) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/more')}
          >
            <Ionicons name="arrow-back" size={22} color="#e2e8f0" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ข้อมูลบัญชีผู้ใช้</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.profileCard}>
            <View style={[
              styles.avatarContainer,
              role === 'admin' ? styles.avatarAdmin : styles.avatarUser
            ]}>
              <Ionicons
                name="person"
                size={36}
                color={role === 'admin' ? '#fb923c' : '#38bdf8'}
              />
            </View>

            <View style={[
              styles.roleBadge,
              role === 'admin' ? styles.roleBadgeAdmin : styles.roleBadgeUser
            ]}>
              <Text style={[
                styles.roleBadgeText,
                role === 'admin' ? styles.roleBadgeTextAdmin : styles.roleBadgeTextUser
              ]}>
                {role === 'admin' ? '🛡️ ผู้ดูแลระบบ (Admin)' : '👤 ผู้ใช้ทั่วไป (User)'}
              </Text>
            </View>

            <Text style={styles.userName}>{cleanDisplayName(user.display_name) || user.email}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>

            <View style={styles.actionSection}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => setLogoutModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="log-out-outline" size={18} color="#ffffff" />
                <Text style={styles.logoutButtonText}>ออกจากระบบ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Confirmation Modal for Logout */}
        <LogoutConfirmModal
          visible={logoutModalVisible}
          onClose={() => setLogoutModalVisible(false)}
          onConfirm={handleConfirmLogout}
          loading={loggingOut}
        />

        {/* Auth Success Floating Modal */}
        <AuthSuccessModal
          visible={authModal.visible}
          type={authModal.type}
          targetRoute={authModal.targetRoute || '/'}
          onClose={() => setAuthModal((prev) => ({ ...prev, visible: false }))}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#e2e8f0" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>เข้าสู่ระบบ CarServices</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Mode Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, mode === 'login' && styles.tabButtonActive]}
            onPress={() => setMode('login')}
          >
            <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
              เข้าสู่ระบบ
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, mode === 'register' && styles.tabButtonActive]}
            onPress={() => setMode('register')}
          >
            <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>
              สมัครสมาชิกใหม่
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Inputs */}
        <View style={styles.formCard}>
          {mode === 'register' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ชื่อที่แสดง</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={16} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="เช่น สมชาย ใจดี"
                  placeholderTextColor="#475569"
                  value={displayName}
                  onChangeText={setDisplayName}
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>อีเมล</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={16} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="name@example.com"
                placeholderTextColor="#475569"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>รหัสผ่าน</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={16} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor="#475569"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#020617" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === 'login' ? 'เข้าสู่ระบบ' : 'ยืนยันการสมัครสมาชิก'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Guest Mode */}
        <TouchableOpacity style={styles.guestButton} onPress={handleGuest}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="car-outline" size={16} color="#94a3b8" />
            <Text style={styles.guestButtonText}>เข้าใช้งานแบบผู้เยี่ยมชม (Guest Mode)</Text>
          </View>
          <Text style={styles.guestButtonSub}>ใช้ข้อมูลเดิมในเครื่อง →</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Floating Auth Success Modal */}
      <AuthSuccessModal
        visible={authModal.visible}
        type={authModal.type}
        targetRoute={authModal.targetRoute || '/'}
        onClose={() => setAuthModal((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#020617',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  container: {
    padding: 16,
    gap: 14,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginTop: 4,
  },
  guestButtonText: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  guestButtonSub: {
    fontSize: 10,
    color: '#64748b',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#38bdf8',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#020617',
    fontWeight: 'bold',
  },
  formCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 12,
    color: '#f8fafc',
  },
  submitButton: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#020617',
  },
  profileCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarUser: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  avatarAdmin: {
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.3)',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  roleBadgeUser: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  roleBadgeAdmin: {
    backgroundColor: 'rgba(251, 146, 60, 0.12)',
    borderColor: 'rgba(251, 146, 60, 0.3)',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  roleBadgeTextUser: {
    color: '#38bdf8',
  },
  roleBadgeTextAdmin: {
    color: '#fb923c',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  userEmail: {
    fontSize: 12,
    color: '#94a3b8',
  },
  actionSection: {
    width: '100%',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#38bdf8',
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#020617',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#dc2626',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  logoutButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
