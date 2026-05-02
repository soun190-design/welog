import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCouple } from '../contexts/CoupleContext';
import {
  collection, addDoc, getDocs, doc, deleteDoc,
  query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { createNotification } from '../firebase/notifications';

const COLORS = ['#ff7043', '#42a5f5', '#66bb6a', '#ab47bc', '#ffa726', '#26c6da'];
const COLOR_NAMES = ['코랄', '블루', '그린', '퍼플', '오렌지', '민트'];

function getMonthDays(year, month) {
  var firstDay = new Date(year, month, 1).getDay();
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var days = [];
  for (var i = 0; i < firstDay; i++) days.push(null);
  for (var j = 1; j <= daysInMonth; j++) days.push(j);
  return days;
}
function getWeekDays(date) {
  var day = date.getDay();
  var start = new Date(date);
  start.setDate(date.getDate() - day);
  var days = [];
  for (var i = 0; i < 7; i++) {
    var d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDateStr(year, month, day) {
  return year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

export default function SchedulePage() {
  const { user } = useAuth();
  const { couple } = useCouple();

  const [viewMode, setViewMode] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showCategoryAdd, setShowCategoryAdd] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSchedules, setSelectedSchedules] = useState([]);

  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newMemo, setNewMemo] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newIsRecurring, setNewIsRecurring] = useState(false);
  const [newRecurringType, setNewRecurringType] = useState('yearly');

  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  var loadData = useCallback(async function() {
    if (!couple) return;
    try {
      var schedRef = collection(db, 'couples', couple.id, 'schedules');
      var schedSnap = await getDocs(query(schedRef, orderBy('datetime', 'asc')));
      setSchedules(schedSnap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); }));

      var catRef = collection(db, 'couples', couple.id, 'categories');
      var catSnap = await getDocs(catRef);
      setCategories(catSnap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); }));
    } catch (e) { console.error(e); }
  }, [couple]);

  useEffect(function() { loadData(); }, [loadData]);

  var handleAddCategory = async function() {
    if (!newCatName.trim() || !couple) return;
    if (categories.length >= 6) { alert('카테고리는 최대 6개까지 만들 수 있어요'); return; }
    try {
      var ref = collection(db, 'couples', couple.id, 'categories');
      await addDoc(ref, { name: newCatName, color: newCatColor, createdAt: serverTimestamp() });
      setNewCatName('');
      setNewCatColor(COLORS[0]);
      setShowCategoryAdd(false);
      await loadData();
    } catch (e) { console.error(e); }
  };

  var handleAddSchedule = async function() {
    if (!newTitle.trim() || !newDate || !couple) return;
    setSaving(true);
    try {
      var ref = collection(db, 'couples', couple.id, 'schedules');
      await addDoc(ref, {
        title: newTitle,
        datetime: newDate + (newTime ? 'T' + newTime : ''),
        memo: newMemo,
        categoryId: newCategoryId,
        isRecurring: newIsRecurring,
        recurringType: newIsRecurring ? newRecurringType : null,
        authorId: user.uid,
        createdAt: serverTimestamp(),
      });
setNewTitle(''); setNewDate(''); setNewTime('');
      setNewMemo(''); setNewCategoryId(''); setNewIsRecurring(false);
      setShowAdd(false);
      await loadData();
      var partnerUid = couple && couple.members && couple.members.find(function(m) { return m !== user.uid; });
      if (partnerUid) {
        await createNotification(
          couple.id, partnerUid, 'schedule',
          (newTitle + ' 일정이 추가됐어요 📅 ' + newDate),
          { date: newDate, title: newTitle }
        );
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  var handleDeleteSchedule = async function(scheduleId) {
    if (!couple) return;
    try {
      await deleteDoc(doc(db, 'couples', couple.id, 'schedules', scheduleId));
      await loadData();
      setSelectedSchedules(function(prev) { return prev.filter(function(s) { return s.id !== scheduleId; }); });
    } catch (e) { console.error(e); }
  };

  var getSchedulesForDate = function(dateStr) {
    return schedules.filter(function(s) {
      if (!s.datetime) return false;
      var sDate = s.datetime.substring(0, 10);
      if (sDate === dateStr) return true;
      if (s.isRecurring && s.recurringType === 'yearly') {
        return s.datetime.substring(5, 10) === dateStr.substring(5, 10);
      }
      if (s.isRecurring && s.recurringType === 'monthly') {
        return s.datetime.substring(8, 10) === dateStr.substring(8, 10);
      }
      return false;
    });
  };

  var getCategoryById = function(id) {
    return categories.find(function(c) { return c.id === id; }) || null;
  };

  var handleDayClick = function(dateStr) {
    setSelectedDate(dateStr);
    setSelectedSchedules(getSchedulesForDate(dateStr));
  };

  var year = currentDate.getFullYear();
  var month = currentDate.getMonth();
  var monthDays = getMonthDays(year, month);
  var weekDays = getWeekDays(currentDate);
  var todayStr = (function() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerRow}>
          <div>
            <h2 style={styles.title}>우리만의 시간</h2>
            <p style={styles.subcopy}>이번 달 특별한 순간들</p>
          </div>
          <div style={styles.headerBtns}>
            <button style={styles.catBtn} onClick={function() { setShowCategoryAdd(true); }}>🏷️</button>
            <button style={styles.addBtn} onClick={function() { setShowAdd(true); }}>+ 추가</button>
          </div>
        </div>
        <div style={styles.viewToggle}>
          <button style={viewMode === 'month' ? styles.viewActive : styles.viewBtn} onClick={function() { setViewMode('month'); }}>월간</button>
          <button style={viewMode === 'week' ? styles.viewActive : styles.viewBtn} onClick={function() { setViewMode('week'); }}>주간</button>
        </div>
      </div>

      {/* 월간 뷰 */}
      {viewMode === 'month' ? (
        <div style={styles.card}>
          <div style={styles.calHeader}>
            <button style={styles.navBtn} onClick={function() { var d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); }}>◀</button>
            <span style={styles.calTitle}>{year}년 {month + 1}월</span>
            <button style={styles.navBtn} onClick={function() { var d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); }}>▶</button>
          </div>
          <div style={styles.weekLabels}>
            {['일', '월', '화', '수', '목', '금', '토'].map(function(d) {
              return <div key={d} style={styles.weekLabel}>{d}</div>;
            })}
          </div>
          <div style={styles.calGrid}>
            {monthDays.map(function(day, i) {
              if (!day) return <div key={i} />;
              var dateStr = formatDateStr(year, month, day);
              var daySchedules = getSchedulesForDate(dateStr);
              var isToday = dateStr === todayStr;
              var isSelected = dateStr === selectedDate;
              return (
                <div
                  key={i}
                  style={Object.assign({}, styles.calDay,
                    isToday ? styles.calDayToday : {},
                    isSelected ? styles.calDaySelected : {}
                  )}
                  onClick={function() { handleDayClick(dateStr); }}
                >
                  <span style={styles.calDayNum}>{day}</span>
                  <div style={styles.calDots}>
                    {daySchedules.slice(0, 3).map(function(s, idx) {
                      var cat = getCategoryById(s.categoryId);
                      var color = cat ? cat.color : '#ff7043';
                      var isRecurring = s.isRecurring;
                      return (
                        <div key={idx} style={Object.assign({}, styles.calDot, {
                          background: color,
                          opacity: isRecurring ? 0.4 : 1,
                          width: isRecurring ? 4 : 6,
                          height: isRecurring ? 4 : 6,
                        })} />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 주간 뷰 */
        <div style={styles.card}>
          <div style={styles.calHeader}>
            <button style={styles.navBtn} onClick={function() { var d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }}>◀</button>
            <span style={styles.calTitle}>{year}년 {month + 1}월</span>
            <button style={styles.navBtn} onClick={function() { var d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }}>▶</button>
          </div>
          <div style={styles.weekGrid}>
            {weekDays.map(function(d, i) {
              var dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
              var daySchedules = getSchedulesForDate(dateStr);
              var isToday = dateStr === todayStr;
              var isSelected = dateStr === selectedDate;
              return (
                <div
                  key={i}
                  style={Object.assign({}, styles.weekDay,
                    isToday ? styles.calDayToday : {},
                    isSelected ? styles.calDaySelected : {}
                  )}
                  onClick={function() { handleDayClick(dateStr); }}
                >
                  <span style={styles.weekDayLabel}>{'일월화수목금토'[i]}</span>
                  <span style={styles.weekDayNum}>{d.getDate()}</span>
                  <div style={styles.calDots}>
                    {daySchedules.slice(0, 3).map(function(s, idx) {
                      var cat = getCategoryById(s.categoryId);
                      return <div key={idx} style={Object.assign({}, styles.calDot, { background: cat ? cat.color : '#ff7043' })} />;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 선택된 날짜 일정 */}
      {selectedDate ? (
        <div style={styles.card}>
          <p style={styles.cardLabel}>{selectedDate}</p>
          {selectedSchedules.length === 0 ? (
            <p style={styles.emptyText}>일정이 없어요</p>
          ) : (
            selectedSchedules.map(function(s) {
              var cat = getCategoryById(s.categoryId);
              var catColor = cat ? cat.color : '#FF6B6B';
              return (
                <div key={s.id} style={Object.assign({}, styles.scheduleItem, s.isRecurring ? styles.scheduleRecurring : {})}>
                  <div style={Object.assign({}, styles.scheduleIconWrap, { background: catColor + '22' })}>
                    <div style={Object.assign({}, styles.scheduleColorDot, { background: catColor })} />
                  </div>
                  <div style={styles.scheduleInfo}>
                    <p style={styles.scheduleTitle}>{s.title}</p>
                    {s.datetime && s.datetime.includes('T') ? (
                      <p style={styles.scheduleTime}>{s.datetime.substring(11, 16)}</p>
                    ) : null}
                    {s.memo ? <p style={styles.scheduleMemo}>{s.memo}</p> : null}
                    {s.isRecurring ? <span style={styles.recurringBadge}>반복</span> : null}
                  </div>
                  <button style={styles.deleteBtn} onClick={function() { handleDeleteSchedule(s.id); }}>✕</button>
                </div>
              );
            })
          )}
          <button style={styles.addForDateBtn} onClick={function() { setNewDate(selectedDate); setShowAdd(true); }}>
            + 이 날에 일정 추가
          </button>
        </div>
      ) : null}

      {/* 다가오는 일정 */}
      <div style={styles.card}>
        <p style={styles.cardLabel}>다가오는 순간들</p>
        {schedules.filter(function(s) { return s.datetime >= todayStr && !s.isRecurring; }).slice(0, 5).length === 0 ? (
          <p style={styles.emptyText}>아직 예정된 순간이 없어요 🌸</p>
        ) : (
          schedules.filter(function(s) { return s.datetime >= todayStr && !s.isRecurring; }).slice(0, 5).map(function(s) {
            var cat = getCategoryById(s.categoryId);
            var catColor = cat ? cat.color : '#FF6B6B';
            return (
              <div key={s.id} style={styles.upcomingItem}>
                <div style={Object.assign({}, styles.scheduleIconWrap, { background: catColor + '22' })}>
                  <div style={Object.assign({}, styles.scheduleColorDot, { background: catColor })} />
                </div>
                <div style={styles.scheduleInfo}>
                  <p style={styles.scheduleTitle}>{s.title}</p>
                  <p style={styles.scheduleTime}>{s.datetime.substring(0, 10)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 일정 추가 모달 */}
      {showAdd ? (
        <div style={styles.modal}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>일정 추가</span>
              <button style={styles.closeBtn} onClick={function() { setShowAdd(false); }}>✕</button>
            </div>
            <input style={styles.input} placeholder="일정 제목" value={newTitle} onChange={function(e) { setNewTitle(e.target.value); }} />
            <input style={styles.input} type="date" value={newDate} onChange={function(e) { setNewDate(e.target.value); }} />
            <input style={styles.input} type="time" value={newTime} onChange={function(e) { setNewTime(e.target.value); }} />
            <input style={styles.input} placeholder="메모 (선택)" value={newMemo} onChange={function(e) { setNewMemo(e.target.value); }} />

            <p style={styles.inputLabel}>카테고리</p>
            <div style={styles.catRow}>
              <button
                style={Object.assign({}, styles.catItem, !newCategoryId ? styles.catItemActive : {})}
                onClick={function() { setNewCategoryId(''); }}
              >없음</button>
              {categories.map(function(cat) {
                return (
                  <button
                    key={cat.id}
                    style={Object.assign({}, styles.catItem, {
                      borderColor: cat.color,
                      background: newCategoryId === cat.id ? cat.color : 'white',
                      color: newCategoryId === cat.id ? 'white' : cat.color,
                    })}
                    onClick={function() { setNewCategoryId(cat.id); }}
                  >{cat.name}</button>
                );
              })}
            </div>

            <div style={styles.recurringRow}>
              <label style={styles.recurringLabel}>
                <input
                  type="checkbox"
                  checked={newIsRecurring}
                  onChange={function(e) { setNewIsRecurring(e.target.checked); }}
                  style={{ marginRight: 8 }}
                />
                반복 일정 (기념일 등)
              </label>
              {newIsRecurring ? (
                <div style={styles.recurringTypes}>
                  {[
                    { id: 'yearly', label: '매년' },
                    { id: 'monthly', label: '매월' },
                  ].map(function(t) {
                    return (
                      <button
                        key={t.id}
                        style={newRecurringType === t.id ? styles.typeActive : styles.typeBtn}
                        onClick={function() { setNewRecurringType(t.id); }}
                      >{t.label}</button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <button style={styles.saveBtn} onClick={handleAddSchedule} disabled={saving}>
              {saving ? '저장중...' : '저장하기'}
            </button>
          </div>
        </div>
      ) : null}

      {/* 카테고리 추가 모달 */}
      {showCategoryAdd ? (
        <div style={styles.modal}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>카테고리 추가 ({categories.length}/6)</span>
              <button style={styles.closeBtn} onClick={function() { setShowCategoryAdd(false); }}>✕</button>
            </div>
            <input style={styles.input} placeholder="카테고리 이름" value={newCatName} onChange={function(e) { setNewCatName(e.target.value); }} />
            <p style={styles.inputLabel}>색상 선택</p>
            <div style={styles.colorRow}>
              {COLORS.map(function(color, i) {
                return (
                  <button
                    key={i}
                    style={Object.assign({}, styles.colorBtn, {
                      background: color,
                      border: newCatColor === color ? '3px solid #333' : '3px solid transparent',
                    })}
                    onClick={function() { setNewCatColor(color); }}
                  >
                    {COLOR_NAMES[i]}
                  </button>
                );
              })}
            </div>
            {categories.length > 0 ? (
              <div>
                <p style={styles.inputLabel}>기존 카테고리</p>
                {categories.map(function(cat) {
                  return (
                    <div key={cat.id} style={styles.existingCat}>
                      <div style={Object.assign({}, styles.catColorDot, { background: cat.color })} />
                      <span style={styles.catName}>{cat.name}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
            <button style={styles.saveBtn} onClick={handleAddCategory}>추가하기</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  container: { padding: 20, paddingBottom: 40 },
  header: { padding: '20px 0 12px' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 32, fontWeight: 800, margin: 0, color: '#2D2D2D', letterSpacing: -0.5 },
  subcopy: { fontSize: 13, color: '#B0A69D', margin: '2px 0 0', fontWeight: 400 },
  headerBtns: { display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 4 },
  catBtn: {
    padding: '8px 12px', background: '#FDFAF7', border: '1px solid #DDD5CE',
    borderRadius: 20, fontSize: 14, cursor: 'pointer',
  },
  addBtn: {
    padding: '8px 16px', background: '#FF6B6B', color: 'white',
    border: 'none', borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  viewToggle: { display: 'flex', gap: 8, marginBottom: 4 },
  viewBtn: {
    padding: '6px 16px', border: '1px solid #DDD5CE',
    borderRadius: 20, background: '#FDFAF7', fontSize: 13, cursor: 'pointer', color: '#5C5049',
  },
  viewActive: {
    padding: '6px 16px', border: 'none', borderRadius: 20,
    background: '#FF6B6B', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  card: {
    background: '#FDFAF7', borderRadius: 16, padding: 16,
    marginBottom: 12, boxShadow: '0 2px 8px rgba(180,150,130,0.10)',
  },
  cardLabel: { fontSize: 13, fontWeight: 600, color: '#9E9083', margin: '0 0 12px' },
  calHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calTitle: { fontSize: 15, fontWeight: 700, color: '#2D2D2D' },
  navBtn: { background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', padding: '4px 8px', color: '#5C5049' },
  weekLabels: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 },
  weekLabel: { textAlign: 'center', fontSize: 11, color: '#9E9083', padding: '4px 0' },
  calGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 },
  calDay: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '6px 2px', borderRadius: 8, cursor: 'pointer', minHeight: 44,
  },
  calDayToday: { background: '#FFF0EE' },
  calDaySelected: { background: '#FF6B6B', borderRadius: 8 },
  calDayNum: { fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#2D2D2D' },
  calDots: { display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' },
  calDot: { width: 6, height: 6, borderRadius: 3 },
  weekGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 },
  weekDay: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '8px 4px', borderRadius: 12, cursor: 'pointer',
  },
  weekDayLabel: { fontSize: 11, color: '#9E9083', marginBottom: 4 },
  weekDayNum: { fontSize: 16, fontWeight: 700, marginBottom: 4, color: '#2D2D2D' },
  scheduleItem: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '10px 0', borderBottom: '1px solid #EDE8E3',
  },
  scheduleRecurring: { opacity: 0.7 },
  scheduleIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  scheduleColorDot: { width: 10, height: 10, borderRadius: 5 },
  scheduleColor: { width: 4, height: '100%', minHeight: 20, borderRadius: 2, flexShrink: 0, marginTop: 2 },
  scheduleInfo: { flex: 1 },
  scheduleTitle: { fontSize: 14, fontWeight: 600, margin: 0, lineHeight: 1.4, color: '#2D2D2D' },
  scheduleTime: { fontSize: 12, color: '#9E9083', margin: '2px 0 0' },
  scheduleMemo: { fontSize: 12, color: '#9E9083', margin: '4px 0 0' },
  recurringBadge: {
    fontSize: 10, color: '#9E9083', background: '#EDE8E3',
    padding: '2px 6px', borderRadius: 10, marginTop: 4, display: 'inline-block',
  },
  deleteBtn: {
    background: 'none', border: 'none', color: '#C4BAB1',
    cursor: 'pointer', fontSize: 14, padding: '0 4px',
  },
  upcomingItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 0', borderBottom: '1px solid #EDE8E3',
  },
  addForDateBtn: {
    width: '100%', padding: 10, background: '#FFF0EE', color: '#FF6B6B',
    border: '1px dashed #FF6B6B', borderRadius: 12, fontSize: 13,
    fontWeight: 600, cursor: 'pointer', marginTop: 8,
  },
  modal: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(45,30,20,0.45)', zIndex: 200, display: 'flex', alignItems: 'flex-end',
  },
  modalCard: {
    background: '#FDFAF7', borderRadius: '20px 20px 0 0', padding: 20,
    width: '100%', maxHeight: '85vh', overflowY: 'auto',
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#2D2D2D' },
  closeBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9E9083' },
  input: {
    width: '100%', padding: 12, border: '1px solid #EDE8E3',
    borderRadius: 12, fontSize: 14, outline: 'none',
    boxSizing: 'border-box', marginBottom: 8, fontFamily: 'inherit', background: '#FDFAF7',
  },
  inputLabel: { fontSize: 13, fontWeight: 600, color: '#5C5049', margin: '8px 0 8px' },
  catRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  catItem: {
    padding: '6px 12px', border: '1px solid #DDD5CE',
    borderRadius: 20, background: '#FDFAF7', fontSize: 13, cursor: 'pointer', color: '#5C5049',
  },
  catItemActive: { background: '#FF6B6B', color: 'white', border: 'none' },
  recurringRow: { marginBottom: 12 },
  recurringLabel: { fontSize: 14, display: 'flex', alignItems: 'center', marginBottom: 8, color: '#5C5049' },
  recurringTypes: { display: 'flex', gap: 8 },
  typeBtn: {
    padding: '6px 14px', border: '1px solid #DDD5CE',
    borderRadius: 20, background: '#FDFAF7', fontSize: 13, cursor: 'pointer', color: '#5C5049',
  },
  typeActive: {
    padding: '6px 14px', border: 'none', borderRadius: 20,
    background: '#FF6B6B', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  saveBtn: {
    width: '100%', padding: 14, background: '#FF6B6B', color: 'white',
    border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600,
    cursor: 'pointer', marginTop: 4,
  },
  colorRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  colorBtn: {
    width: 44, height: 44, borderRadius: 22, cursor: 'pointer',
    fontSize: 10, color: 'white', fontWeight: 600,
  },
  existingCat: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' },
  catColorDot: { width: 12, height: 12, borderRadius: 6 },
  catName: { fontSize: 14, color: '#2D2D2D' },
  emptyText: { color: '#9E9083', fontSize: 14, textAlign: 'center', padding: '16px 0' },
};
