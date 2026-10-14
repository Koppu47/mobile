import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface LanguageSwitchProps {
  lang: 'th' | 'en';
  onToggle: () => void;
}

export function LanguageSwitch({ lang, onToggle }: LanguageSwitchProps) {
  return (
    <TouchableOpacity
      style={styles.langSwitchBtn}
      onPress={onToggle}
      activeOpacity={0.85}
      accessibilityRole="switch"
      accessibilityLabel={`เปลี่ยนภาษา ปัจจุบันเป็น ${lang === 'th' ? 'ไทย' : 'English'}`}
    >
      <View style={[styles.switchTrack, lang === 'en' ? styles.switchTrackEn : styles.switchTrackTh]}>
        <View style={[styles.switchThumb, lang === 'en' ? styles.switchThumbEn : styles.switchThumbTh]}>
          <View style={[styles.switchLed, lang === 'en' ? styles.switchLedEn : styles.switchLedTh]} />
          <Text style={styles.switchThumbText}>{lang.toUpperCase()}</Text>
        </View>
        <View style={styles.switchLabels}>
          <Text style={[styles.switchLabelText, lang === 'th' && styles.switchLabelHidden]}>TH</Text>
          <Text style={[styles.switchLabelText, lang === 'en' && styles.switchLabelHidden]}>EN</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  langSwitchBtn: {
    paddingVertical: 2,
  },
  switchTrack: {
    width: 76,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0b1120',
    borderWidth: 1.5,
    borderColor: '#334155',
    position: 'relative',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  switchTrackTh: {
    borderColor: '#0284c7',
  },
  switchTrackEn: {
    borderColor: '#38bdf8',
  },
  switchThumb: {
    position: 'absolute',
    top: 2.5,
    width: 37,
    height: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 2,
  },
  switchThumbTh: {
    left: 3,
    backgroundColor: '#0284c7',
  },
  switchThumbEn: {
    right: 3,
    backgroundColor: '#0369a1',
  },
  switchLed: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  switchLedTh: {
    backgroundColor: '#38bdf8',
    shadowColor: '#38bdf8',
  },
  switchLedEn: {
    backgroundColor: '#a7f3d0',
    shadowColor: '#10b981',
  },
  switchThumbText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  switchLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  switchLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  switchLabelHidden: {
    opacity: 0,
  },
});
