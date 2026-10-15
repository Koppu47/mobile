import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../lib/LanguageContext';

export default function LanguageScreen() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#e2e8f0" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{lang === 'th' ? 'เลือกภาษา' : 'Select Language'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.container}>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.item, lang === 'th' && styles.itemActive]}
            onPress={() => setLang('th')}
            activeOpacity={0.7}
          >
            <View style={styles.itemLeft}>
              <Text style={styles.flag}>🇹🇭</Text>
              <Text style={[styles.langText, lang === 'th' && styles.langTextActive]}>ภาษาไทย</Text>
            </View>
            {lang === 'th' && <Ionicons name="checkmark" size={20} color="#38bdf8" />}
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.item, lang === 'en' && styles.itemActive]}
            onPress={() => setLang('en')}
            activeOpacity={0.7}
          >
            <View style={styles.itemLeft}>
              <Text style={styles.flag}>🇬🇧</Text>
              <Text style={[styles.langText, lang === 'en' && styles.langTextActive]}>English</Text>
            </View>
            {lang === 'en' && <Ionicons name="checkmark" size={20} color="#38bdf8" />}
          </TouchableOpacity>
        </View>
      </View>
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
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  itemActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flag: {
    fontSize: 24,
  },
  langText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  langTextActive: {
    color: '#f8fafc',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
  },
});
