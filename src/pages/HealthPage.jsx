import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCouple } from '../contexts/CoupleContext';
import { doc, setDoc, getDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const TODAY = new Date().toISOString().split('T')[0];
const THIS_MONTH = new Date().toISOString().substring(0, 7);

const CONDITION_EMOJIS = ['😴', '😔', '😐', '🙂', '😊', '💪'];
const CONDITION_LABELS = ['매우피곤', '피곤', '보통', '괜찮음', '좋음', '최고'];

export default function HealthPage() {
  const { user } = useAuth();
  const { couple } = useCouple();
  const partnerUid = couple && couple.members && couple.members.find(function(m) { return m !== (user && user.uid); });

  const [viewMode, setViewMode] = useState('mine');
  const [tab, setTab] = useState('today');

  const [condition, setCondition] = useState({ emoji: '', memo: '' });
  const [meals, setMeals] = useState({ morning: '', lunch: '', evening: '' });
  const [exercise, setExercise] = useState({ done: false, type: '', duration: '', memo: '' });
  const [showExerciseDetail, setShowExerciseDetail] = useState(false);
  const [monthDots, setMonthDots] = useState({});
  const [partnerRecord, setPartnerRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  var loadMyRecord = useCallback(async function() {
    if (!user || !couple) return;
    try {
      var ref = doc(db, 'couples', couple.id, 'health', TODAY + '_' + user.uid);
      var snap = await getDoc(ref);
      if (snap.exists()) {
        var data = snap.data();
        setCondition(data.condition || { emoji: '', memo: '' });
        setMeals(data.meals || { morning: '', lunch: '', evening: '' });
        setExercise(data.exercise || { done: false, type: '', duration: '', memo: '' });
      }
    } catch (e) { console.error(e); }
  }, [user, couple]);

  var loadPartnerRecord = useCallback(async function() {
    if (!partnerUid || !couple) return;
    try {
      var ref = doc(db, 'couples', couple.id, 'health', TODAY + '_' + partnerUid);
      var snap = await getDoc(ref);
      if (snap.exists()) setPartnerRecord(snap.data());
    } catch (e) { console.error(e); }
  }, [partnerUid, couple]);

  var loadMonthDots = useCallback(async function() {
    if (!couple) return;
    try {
      var ref = collection(db, 'couples', couple.id, 'health');
      var snap = await getDocs(ref);
      var dots = {};
      snap.docs.forEach(function(d) {
        var id = d.id;
        var parts = id.split('_');
        if (parts.length === 2 && id.startsWith(THIS_MONTH)) {
          var date = parts[0];
          var uid = parts[1];
          if (!dots[date]) dots[date] = {};
          dots[date][uid] = d.data().exercise && d.data().exercise.done;
        }
      });
      setMonthDots(dots);
    } catch (e) { console.error(e); }
  }, [couple]);

  useEffect(function() {
    loadMyRecord();
    loadPartnerRecord();
    loadMonthDots();
  }, [loadMyRecord, loadPartnerRecord, loadMonthDots]);

  var saveRecord = async function(updates) {
    if (!user || !couple) return;
    setSaving(true);
    try {
      var ref = doc(db, 'couples', couple.id, 'health', TODAY + '_' + user.uid);
      var snap = await getDoc(ref);
      var existing = snap.exists() ? snap.data() : {};
      await setDoc(ref, Object.assign({}, existing, updates, {
        authorId: user.uid,
        updatedAt: serverTimestamp(),
        createdAt: existing.createdAt || serverTimestamp(),
      }));
      setSaved(true);
      setTimeout(function() { setSaved(false); }, 2000);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  var handleSaveAll = async function() {
    await saveRecord({ condition: condition, meals: meals, exercise: exercise });
    await loadMonthDots();
  };

  var getDaysInMonth = function() {
    var now = new Date();
    var days = [];
    var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (var i = 1; i <= daysInMonth; i++) {
      var dateStr = THIS_MONTH + '-' + String(i).padStart(2, '0');
      days.push(dateStr);
    }
    return days;
  };

  if (viewMode === 'partner') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerRow}>
            <h2 style={styles.title}>파트너 건강 💌</h2>
            <button style={styles.toggleBtn} onClick={function() { setViewMode('mine'); }}>내 기록</button>
          </div>
        </div>
        {!partnerRecord ? (
          <div style={styles.emptyCard}>
            <p style={styles.emptyText}>파트너가 아직 오늘 기록을 작성하지 않았어요</p>
          </div>
        ) : (
          <div>
            {partnerRecord.condition && partnerRecord.condition.emoji ? (
              <div style={styles.card}>
                <p style={styles.cardLabel}>😊 컨디션</p>
                <div style={styles.conditionDisplay}>
                  <span style={styles.conditionEmoji}>{partnerRecord.condition.emoji}</span>
                  {partnerRecord.condition.memo ? (
                    <p style={styles.conditionMemo}>{partnerRecord.condition.memo}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
            {partnerRecord.meals ? (
              <div style={styles.card}>
                <p style={styles.cardLabel}>🍽️ 식단</p>
                {partnerRecord.meals.morning ? <p style={styles.mealItem}>🌅 아침: {partnerRecord.meals.morning}</p> : null}
                {partnerRecord.meals.lunch ? <p style={styles.mealItem}>☀️ 점심: {partnerRecord.meals.lunch}</p> : null}
                {partnerRecord.meals.evening ? <p style={styles.mealItem}>🌆 저녁: {partnerRecord.meals.evening}</p> : null}
              </div>
            ) : null}
            {partnerRecord.exercise ? (
              <div style={styles.card}>
                <p style={styles.cardLabel}>💪 운동</p>
                <p style={styles.exerciseStatus}>
                  {partnerRecord.exercise.done ? '✅ 운동했어요!' : '❌ 오늘은 쉬었어요'}
                </p>
                {partnerRecord.exercise.done && partnerRecord.exercise.type ? (
                  <p style={styles.exerciseDetail}>{partnerRecord.exercise.type} {partnerRecord.exercise.duration ? partnerRecord.exercise.duration + '분' : ''}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerRow}>
          <h2 style={styles.title}>건강 🏃</h2>
          <button style={styles.toggleBtn} onClick={function() { setViewMode('partner'); }}>파트너 기록</button>
        </div>
        <p style={styles.date}>{new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</p>
      </div>

      <div style={styles.tabRow}>
        <button style={tab === 'today' ? styles.tabActive : styles.tabBtn} onClick={function() { setTab('today'); }}>오늘</button>
        <button style={tab === 'month' ? styles.tabActive : styles.tabBtn} onClick={function() { setTab('month'); }}>이번달</button>
      </div>

      {tab === 'today' ? (
        <div>
          {/* 컨디션 */}
          <div style={styles.card}>
            <p style={styles.cardLabel}>😊 오늘의 컨디션</p>
            <div style={styles.emojiRow}>
              {CONDITION_EMOJIS.map(function(emoji, i) {
                return (
                  <button
                    key={i}
                    style={Object.assign({}, styles.emojiBtn, condition.emoji === emoji ? styles.emojiBtnActive : {})}
                    onClick={function() { setCondition(function(prev) { return Object.assign({}, prev, { emoji: emoji }); }); }}
                  >
                    <span style={styles.emojiIcon}>{emoji}</span>
                    <span style={styles.emojiLabel}>{CONDITION_LABELS[i]}</span>
                  </button>
                );
              })}
            </div>
            <input
              style={styles.input}
              placeholder="컨디션 메모 (선택)"
              value={condition.memo}
              onChange={function(e) { setCondition(function(prev) { return Object.assign({}, prev, { memo: e.target.value }); }); }}
            />
          </div>

          {/* 식단 */}
          <div style={styles.card}>
            <p style={styles.cardLabel}>🍽️ 오늘의 식단</p>
            {[
              { key: 'morning', label: '🌅 아침', placeholder: '아침 메뉴를 입력해요' },
              { key: 'lunch', label: '☀️ 점심', placeholder: '점심 메뉴를 입력해요' },
              { key: 'evening', label: '🌆 저녁', placeholder: '저녁 메뉴를 입력해요' },
            ].map(function(meal) {
              return (
                <div key={meal.key} style={styles.mealRow}>
                  <span style={styles.mealLabel}>{meal.label}</span>
                  <input
                    style={styles.mealInput}
                    placeholder={meal.placeholder}
                    value={meals[meal.key] || ''}
                    onChange={function(e) {
                      var val = e.target.value;
                      setMeals(function(prev) { return Object.assign({}, prev, { [meal.key]: val }); });
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* 운동 */}
          <div style={styles.card}>
            <p style={styles.cardLabel}>💪 운동</p>
            <div style={styles.exerciseRow}>
              <button
                style={Object.assign({}, styles.exerciseBtn, exercise.done ? styles.exerciseBtnActive : {})}
                onClick={function() { setExercise(function(prev) { return Object.assign({}, prev, { done: !prev.done }); }); }}
              >
                {exercise.done ? '✅ 운동했어요!' : '운동 안했어요'}
              </button>
              {exercise.done ? (
                <button
                  style={styles.detailToggle}
                  onClick={function() { setShowExerciseDetail(function(p) { return !p; }); }}
                >
                  {showExerciseDetail ? '접기 ▲' : '상세 ▼'}
                </button>
              ) : null}
            </div>
            {exercise.done && showExerciseDetail ? (
              <div style={styles.exerciseDetailBox}>
                <input
                  style={styles.input}
                  placeholder="운동 종류 (예: 러닝, 헬스)"
                  value={exercise.type}
                  onChange={function(e) { setExercise(function(prev) { return Object.assign({}, prev, { type: e.target.value }); }); }}
                />
                <input
                  style={styles.input}
                  type="number"
                  placeholder="운동 시간 (분)"
                  value={exercise.duration}
                  onChange={function(e) { setExercise(function(prev) { return Object.assign({}, prev, { duration: e.target.value }); }); }}
                />
                <input
                  style={styles.input}
                  placeholder="메모"
                  value={exercise.memo}
                  onChange={function(e) { setExercise(function(prev) { return Object.assign({}, prev, { memo: e.target.value }); }); }}
                />
              </div>
            ) : null}
          </div>

          <button style={styles.saveBtn} onClick={handleSaveAll} disabled={saving}>
            {saving ? '저장중...' : saved ? '저장됐어요 ✓' : '저장하기'}
          </button>
        </div>
      ) : null}

      {tab === 'month' ? (
        <div>
          <div style={styles.card}>
            <p style={styles.cardLabel}>💪 이번달 운동 기록</p>
            <div style={styles.legendRow}>
              <div style={styles.legendItem}>
                <div style={Object.assign({}, styles.dot, { background: '#ff7043' })} />
                <span style={styles.legendText}>나</span>
              </div>
              <div style={styles.legendItem}>
                <div style={Object.assign({}, styles.dot, { background: '#42a5f5' })} />
                <span style={styles.legendText}>파트너</span>
              </div>
            </div>
            <div style={styles.dotsGrid}>
              {getDaysInMonth().map(function(dateStr) {
                var dayNum = parseInt(dateStr.split('-')[2]);
                var dayData = monthDots[dateStr] || {};
                var myDone = dayData[user && user.uid];
                var partnerDone = partnerUid && dayData[partnerUid];
                var isToday = dateStr === TODAY;
                return (
                  <div key={dateStr} style={Object.assign({}, styles.dotCell, isToday ? styles.dotCellToday : {})}>
                    <span style={styles.dotDay}>{dayNum}</span>
                    <div style={styles.dotPair}>
                      <div style={Object.assign({}, styles.dot, { background: myDone ? '#ff7043' : '#f0f0f0' })} />
                      <div style={Object.assign({}, styles.dot, { background: partnerDone ? '#42a5f5' : '#f0f0f0' })} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={styles.card}>
            <p style={styles.cardLabel}>📊 이번달 통계</p>
            <div style={styles.statsRow}>
              <div style={styles.statItem}>
                <p style={styles.statNum}>
                  {Object.values(monthDots).filter(function(d) { return d[user && user.uid]; }).length}일
                </p>
                <p style={styles.statLabel}>내 운동일수</p>
              </div>
              <div style={styles.statItem}>
                <p style={styles.statNum}>
                  {partnerUid ? Object.values(monthDots).filter(function(d) { return d[partnerUid]; }).length : 0}일
                </p>
                <p style={styles.statLabel}>파트너 운동일수</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  container: { padding: 20, paddingBottom: 40 },
  header: { padding: '20px 0 12px' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 700, margin: 0, color: '#2D2D2D' },
  date: { color: '#9E9083', fontSize: 14, marginTop: 4 },
  toggleBtn: {
    padding: '6px 14px', background: '#FFF0EE', color: '#FF6B6B',
    border: 'none', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  tabRow: { display: 'flex', gap: 8, marginBottom: 16 },
  tabBtn: {
    flex: 1, padding: '10px', border: '1px solid #DDD5CE',
    borderRadius: 12, background: '#FDFAF7', fontSize: 13, cursor: 'pointer', color: '#5C5049',
  },
  tabActive: {
    flex: 1, padding: '10px', border: 'none', borderRadius: 12,
    background: '#FF6B6B', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  card: {
    background: '#FDFAF7', borderRadius: 16, padding: 16,
    marginBottom: 12, boxShadow: '0 2px 8px rgba(180,150,130,0.10)',
  },
  cardLabel: { fontSize: 13, fontWeight: 600, color: '#9E9083', margin: '0 0 12px' },
  emojiRow: { display: 'flex', gap: 6, marginBottom: 12, justifyContent: 'space-between' },
  emojiBtn: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '8px 4px', border: '1px solid #EDE8E3', borderRadius: 12,
    background: '#FDFAF7', cursor: 'pointer', gap: 4,
  },
  emojiBtnActive: {
    border: '2px solid #FF6B6B', background: '#FFF0EE',
  },
  emojiIcon: { fontSize: 22 },
  emojiLabel: { fontSize: 9, color: '#9E9083' },
  input: {
    width: '100%', padding: 12, border: '1px solid #EDE8E3',
    borderRadius: 12, fontSize: 14, outline: 'none',
    boxSizing: 'border-box', marginBottom: 8, fontFamily: 'inherit', background: '#FDFAF7',
  },
  mealRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  mealLabel: { fontSize: 13, fontWeight: 600, width: 50, flexShrink: 0, color: '#5C5049' },
  mealInput: {
    flex: 1, padding: 10, border: '1px solid #EDE8E3',
    borderRadius: 12, fontSize: 14, outline: 'none', fontFamily: 'inherit', background: '#FDFAF7',
  },
  exerciseRow: { display: 'flex', alignItems: 'center', gap: 8 },
  exerciseBtn: {
    flex: 1, padding: 14, border: '1px solid #DDD5CE',
    borderRadius: 12, background: '#FDFAF7', fontSize: 14, cursor: 'pointer', color: '#5C5049',
  },
  exerciseBtnActive: {
    border: 'none', background: '#FFF0EE', color: '#FF6B6B', fontWeight: 600,
  },
  detailToggle: {
    padding: '10px 14px', border: '1px solid #DDD5CE',
    borderRadius: 12, background: '#FDFAF7', fontSize: 13, cursor: 'pointer', color: '#5C5049',
  },
  exerciseDetailBox: { marginTop: 12 },
  saveBtn: {
    width: '100%', padding: 14, background: '#FF6B6B', color: 'white',
    border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600,
    cursor: 'pointer', marginTop: 4,
  },
  dotsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6,
  },
  dotCell: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 4,
  },
  dotCellToday: { background: '#FFF0EE', borderRadius: 8 },
  dotDay: { fontSize: 11, color: '#9E9083' },
  dotPair: { display: 'flex', gap: 3 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendRow: { display: 'flex', gap: 16, marginBottom: 12 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 12, color: '#7A6E67' },
  statsRow: { display: 'flex', gap: 12 },
  statItem: { flex: 1, textAlign: 'center', padding: 12, background: '#F5F0EB', borderRadius: 12 },
  statNum: { fontSize: 24, fontWeight: 800, color: '#FF6B6B', margin: 0 },
  statLabel: { fontSize: 12, color: '#9E9083', margin: '4px 0 0' },
  conditionDisplay: { display: 'flex', alignItems: 'center', gap: 12 },
  conditionEmoji: { fontSize: 32 },
  conditionMemo: { fontSize: 14, color: '#5C5049' },
  mealItem: { fontSize: 14, color: '#2D2D2D', margin: '4px 0' },
  exerciseStatus: { fontSize: 15, fontWeight: 600, margin: '0 0 4px', color: '#2D2D2D' },
  exerciseDetail: { fontSize: 13, color: '#9E9083' },
  emptyCard: {
    background: '#FDFAF7', borderRadius: 16, padding: 40,
    textAlign: 'center', boxShadow: '0 2px 8px rgba(180,150,130,0.10)',
  },
  emptyText: { color: '#9E9083', fontSize: 14 },
};
