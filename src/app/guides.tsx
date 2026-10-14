import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DIY_GUIDES } from '../data/diyGuidesData';
import { DIYGuide } from '../types';
import { useLanguage } from '../lib/LanguageContext';

export default function GuidesScreen() {
  const { lang } = useLanguage();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeGuide, setActiveGuide] = useState<DIYGuide | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const categories = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'engine_oil', label: 'น้ำมันเครื่อง' },
    { key: 'coolant', label: 'น้ำยาหล่อเย็น' },
    { key: 'windshield_washer', label: 'น้ำฉีดกระจก' },
    { key: 'brake_fluid', label: 'น้ำมันเบรก' },
    { key: 'tires', label: 'ยางรถยนต์' },
    { key: 'general', label: 'ทั่วไป / ใบปัด' },
  ];

  const filteredGuides = DIY_GUIDES.filter((g) => {
    const matchCat = selectedCategory === 'all' || g.category === selectedCategory;
    const matchSearch =
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.summary.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const openGuideModal = (guide: DIYGuide) => {
    setActiveGuide(guide);
    setCompletedSteps({});
  };

  const toggleStep = (stepNumber: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [stepNumber]: !prev[stepNumber],
    }));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{lang === 'th' ? 'คู่มือการบำรุงรักษา DIY' : 'DIY Maintenance Guides'}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {lang === 'th' ? 'ขั้นตอนปฏิบัติจริงพร้อมคำเตือนความปลอดภัย' : 'Step-by-step guides & safety tips'}
          </Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#64748b" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="ค้นหาขั้นตอน DIY เช่น ตรวจน้ำมัน, เติมน้ำฉีดกระจก..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Pills */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
          {categories.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.filterChip, selectedCategory === c.key && styles.filterChipActive]}
              onPress={() => setSelectedCategory(c.key)}
            >
              <Text style={[styles.filterChipText, selectedCategory === c.key && styles.filterChipTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.container}>
        <View style={styles.guidesList}>
          {filteredGuides.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color="#475569" />
              <Text style={styles.emptyText}>ไม่พบคู่มือที่ตรงกับคำค้นหา</Text>
            </View>
          ) : (
            filteredGuides.map((guide) => (
              <TouchableOpacity
                key={guide.id}
                style={styles.guideCard}
                activeOpacity={0.7}
                onPress={() => openGuideModal(guide)}
              >
                <View style={styles.guideCardHeader}>
                  <View style={styles.diffBadge}>
                    <Text style={styles.diffBadgeText}>{guide.difficulty}</Text>
                  </View>
                  <View style={styles.timeBadge}>
                    <Ionicons name="time-outline" size={13} color="#94a3b8" />
                    <Text style={styles.timeText}>ประมาณ {guide.estimatedMinutes} นาที</Text>
                  </View>
                </View>

                <Text style={styles.guideTitle}>{guide.title}</Text>
                <Text style={styles.guideSummary} numberOfLines={2}>
                  {guide.summary}
                </Text>

                <View style={styles.toolsPreview}>
                  <Ionicons name="build-outline" size={14} color="#38bdf8" />
                  <Text style={styles.toolsText} numberOfLines={1}>
                    อุปกรณ์: {guide.toolsNeeded.slice(0, 2).join(', ')}
                    {guide.toolsNeeded.length > 2 ? ` และอีก ${guide.toolsNeeded.length - 2} อย่าง` : ''}
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.stepCountText}>{guide.steps.length} ขั้นตอนอย่างละเอียด</Text>
                  <View style={styles.readMore}>
                    <Text style={styles.readMoreText}>เริ่มทำตาม</Text>
                    <Ionicons name="arrow-forward" size={14} color="#38bdf8" />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Guide Detail Modal */}
      <Modal visible={!!activeGuide} animationType="slide" transparent onRequestClose={() => setActiveGuide(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {activeGuide && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.modalTitle}>{activeGuide.title}</Text>
                    <View style={styles.modalMetaRow}>
                      <View style={styles.diffBadge}>
                        <Text style={styles.diffBadgeText}>{activeGuide.difficulty}</Text>
                      </View>
                      <Text style={styles.modalTimeText}>
                        ใช้เวลาประมาณ {activeGuide.estimatedMinutes} นาที
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setActiveGuide(null)}>
                    <Ionicons name="close-circle" size={28} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  {/* Safety Warnings */}
                  {activeGuide.safetyWarnings && activeGuide.safetyWarnings.length > 0 && (
                    <View style={styles.warningContainer}>
                      <View style={styles.warningHeader}>
                        <Ionicons name="warning" size={18} color="#f59e0b" />
                        <Text style={styles.warningHeading}>ข้อควรระวังเพื่อความปลอดภัย</Text>
                      </View>
                      {activeGuide.safetyWarnings.map((w, idx) => (
                        <Text key={idx} style={styles.warningBullet}>
                          • {w}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Tools Needed */}
                  <View style={styles.sectionBox}>
                    <Text style={styles.sectionHeading}>🛠️ อุปกรณ์ที่ต้องจัดเตรียม</Text>
                    {activeGuide.toolsNeeded.map((t, idx) => (
                      <View key={idx} style={styles.toolItem}>
                        <Ionicons name="checkmark-outline" size={15} color="#10b981" />
                        <Text style={styles.toolText}>{t}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Steps Checklist */}
                  <Text style={styles.stepsHeading}>ขั้นตอนการปฏิบัติงาน (แตะเพื่อติ๊กผ่าน)</Text>
                  {activeGuide.steps.map((step) => {
                    const isDone = !!completedSteps[step.stepNumber];
                    return (
                      <TouchableOpacity
                        key={step.stepNumber}
                        style={[styles.stepItem, isDone && styles.stepItemDone]}
                        activeOpacity={0.8}
                        onPress={() => toggleStep(step.stepNumber)}
                      >
                        <View style={styles.stepTop}>
                          <View style={[styles.stepNumCircle, isDone && styles.stepNumCircleDone]}>
                            {isDone ? (
                              <Ionicons name="checkmark" size={14} color="#fff" />
                            ) : (
                              <Text style={styles.stepNumText}>{step.stepNumber}</Text>
                            )}
                          </View>
                          <Text style={[styles.stepTitle, isDone && styles.stepTitleDone]}>
                            {step.title}
                          </Text>
                        </View>
                        <Text style={styles.stepDesc}>{step.description}</Text>
                        {step.safetyTip && (
                          <View style={styles.stepTip}>
                            <Ionicons name="alert-circle" size={14} color="#f59e0b" style={{ marginRight: 4 }} />
                            <Text style={styles.stepTipText}>{step.safetyTip}</Text>
                          </View>
                        )}
                        {step.proTip && (
                          <View style={[styles.stepTip, { backgroundColor: '#0c4a6e' }]}>
                            <Ionicons name="bulb" size={14} color="#38bdf8" style={{ marginRight: 4 }} />
                            <Text style={[styles.stepTipText, { color: '#e0f2fe' }]}>{step.proTip}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}

                  {/* When to Stop & Consult */}
                  {activeGuide.whenToStopAndConsult && activeGuide.whenToStopAndConsult.length > 0 && (
                    <View style={styles.stopContainer}>
                      <View style={styles.warningHeader}>
                        <Ionicons name="hand-left" size={18} color="#ef4444" />
                        <Text style={[styles.warningHeading, { color: '#fca5a5' }]}>
                          เมื่อใดที่ควรหยุดทำเองและปรึกษาช่างผู้ชำนาญ
                        </Text>
                      </View>
                      {activeGuide.whenToStopAndConsult.map((c, idx) => (
                        <Text key={idx} style={[styles.warningBullet, { color: '#fecaca' }]}>
                          • {c}
                        </Text>
                      ))}
                    </View>
                  )}
                </ScrollView>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    paddingVertical: 9,
    fontSize: 13,
  },
  filterBar: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
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
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  guidesList: {
    gap: 12,
  },
  guideCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  guideCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  diffBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  diffBadgeText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: 'bold',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    color: '#94a3b8',
    fontSize: 11.5,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 6,
  },
  guideSummary: {
    fontSize: 12.5,
    color: '#cbd5e1',
    lineHeight: 18,
    marginBottom: 10,
  },
  toolsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 6,
    padding: 8,
    gap: 6,
  },
  toolsText: {
    fontSize: 11.5,
    color: '#94a3b8',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  stepCountText: {
    fontSize: 11,
    color: '#64748b',
  },
  readMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readMoreText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 10,
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
    maxHeight: '88%',
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  modalTimeText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  modalBody: {
    marginVertical: 14,
  },
  warningContainer: {
    backgroundColor: '#451a03',
    borderColor: '#78350f',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  warningHeading: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fde68a',
  },
  warningBullet: {
    fontSize: 12,
    color: '#fef3c7',
    lineHeight: 18,
    marginTop: 2,
  },
  sectionBox: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 3,
  },
  toolText: {
    fontSize: 12.5,
    color: '#cbd5e1',
  },
  stepsHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 10,
  },
  stepItem: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stepItemDone: {
    borderColor: '#10b981',
    backgroundColor: '#06201b',
  },
  stepTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  stepNumCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumCircleDone: {
    backgroundColor: '#10b981',
  },
  stepNumText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 13.5,
    fontWeight: 'bold',
    color: '#f8fafc',
    flex: 1,
  },
  stepTitleDone: {
    color: '#a7f3d0',
    textDecorationLine: 'line-through',
  },
  stepDesc: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
    paddingLeft: 34,
  },
  stepTip: {
    flexDirection: 'row',
    backgroundColor: '#451a03',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    marginLeft: 34,
    alignItems: 'center',
  },
  stepTipText: {
    fontSize: 11,
    color: '#fde68a',
    flex: 1,
  },
  stopContainer: {
    backgroundColor: '#450a0a',
    borderColor: '#991b1b',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    marginBottom: 20,
  },
});
