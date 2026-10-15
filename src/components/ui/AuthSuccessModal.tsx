import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export interface AuthSuccessModalProps {
  visible: boolean;
  type: 'login' | 'register';
  title?: string;
  targetRoute?: string;
  autoCloseDelay?: number;
  onClose: () => void;
}

export function AuthSuccessModal({
  visible,
  type,
  title,
  targetRoute = '/',
  autoCloseDelay = 1400,
  onClose,
}: AuthSuccessModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      onClose();
      router.replace(targetRoute as any);
    }, autoCloseDelay);

    return () => clearTimeout(timer);
  }, [visible, autoCloseDelay, targetRoute, router, onClose]);

  const defaultTitle = type === 'login' ? 'ล็อกอินสำเร็จ' : 'สมัครสมาชิกสำเร็จ';
  const displayTitle = title || defaultTitle;

  const handlePressImmediate = () => {
    onClose();
    router.replace(targetRoute as any);
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Success Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={44} color="#10b981" />
          </View>

          {/* Title & Subtitle */}
          <Text style={styles.title}>{displayTitle}</Text>
          <Text style={styles.subtitle}>กำลังนำทางไปหน้าแรก...</Text>

          {/* Loader indicator */}
          <View style={styles.loaderRow}>
            <ActivityIndicator size="small" color="#38bdf8" />
            <Text style={styles.loaderText}>ระบบกำลังประมวลผล</Text>
          </View>

          {/* Instant Navigate Button */}
          <TouchableOpacity
            style={styles.instantButton}
            onPress={handlePressImmediate}
            activeOpacity={0.8}
          >
            <Text style={styles.instantButtonText}>ไปหน้าแรกทันที</Text>
            <Ionicons name="arrow-forward" size={16} color="#38bdf8" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 330,
    backgroundColor: '#0f172a',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  loaderText: {
    fontSize: 12,
    color: '#64748b',
  },
  instantButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  instantButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
  },
});
