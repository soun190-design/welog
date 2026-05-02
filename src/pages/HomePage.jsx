import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCouple } from '../contexts/CoupleContext';
import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

function getToday() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function getThisMonth() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

const DAILY_QUESTIONS = [
  { category: '경제/재테크', question: '요즘 가장 잘한 소비가 뭐야? 💰' },
  { category: '경제/재테크', question: '이번달 절약하고 싶은 항목이 있어? 🎯' },
  { category: '경제/재테크', question: '우리 함께 모으고 싶은 목돈이 있어? 💵' },
  { category: '취향/문화', question: '최근에 본 것 중 가장 인상깊었던 건? 🎬' },
  { category: '취향/문화', question: '같이 읽고 싶은 책이 있어? 📚' },
  { category: '취향/문화', question: '요즘 빠져있는 콘텐츠는? 📱' },
  { category: '데이트', question: '이번 주말에 같이 뭐 하고 싶어? 🎉' },
  { category: '데이트', question: '요즘 가보고 싶은 맛집이 있어? 🍽️' },
  { category: '데이트', question: '올해 안에 꼭 같이 가보고 싶은 곳은? 🗺️' },
];

function getTodayQuestion() {
  var dateNum = parseInt(getToday().replace(/-/g, ''));
  return DAILY_QUESTIONS[dateNum % DAILY_QUESTIONS.length];
}

export default function HomePage() {
  const { user } = useAuth();
  const { couple } = useCouple();
  const partnerUid = couple && couple.members && couple.members.find(function(m) { return m !== (user && user.uid); });

  const [todayQuestion, setTodayQuestion] = useState(getTodayQuestion());
  const [myAnswer, setMyAnswer] = useState('');
  const [partnerAnswer, setPartnerAnswer] = useState('');
  const [showAnswerInput, setShowAnswerInput] = useState(false);
  const [answerSaved, setAnswerSaved] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [todayHealth, setTodayHealth] = useState(null);
  const [budgetSummary, setBudgetSummary] = useState(null);

  // 파트너 감정 카드
  const PARTNER_MOODS = ['🥰', '😊', '😐', '😔', '😫'];
  const [myMood, setMyMood] = useState('');
  const [partnerMood] = useState('');
  const [moodSaved, setMoodSaved] = useState(false);

  // FAB
  const [showFab, setShowFab] = useState(false);

  // 기록 히스토리
  const [answerHistory, setAnswerHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  var loadHomeData = useCallback(async function() {
    if (!user || !couple) return;
    try {
      var today = getToday();
      var thisMonth = getThisMonth();
      var qRef = doc(db, 'couples', couple.id, 'daily_answers', today);
      var qSnap = await getDoc(qRef);
      if (qSnap.exists()) {
        var qData = qSnap.data();
        var answers = qData.answers || {};
        setMyAnswer(answers[user.uid] || '');
        setPartnerAnswer(answers[partnerUid] || '');
        if (answers[user.uid]) setAnswerSaved(true);
        if (qData.question) {
          setTodayQuestion({ question: qData.question, category: qData.category || '오늘의 질문' });
        }
      }
      var rRef = doc(db, 'couples', couple.id, 'daily', today + '_' + user.uid);
      var rSnap = await getDoc(rRef);
      if (rSnap.exists()) setTodayRecord(rSnap.data());
      var hRef = doc(db, 'couples', couple.id, 'health', today + '_' + user.uid);
      var hSnap = await getDoc(hRef);
      if (hSnap.exists()) setTodayHealth(hSnap.data());
      var bRef = doc(db, 'couples', couple.id, 'budget', thisMonth);
      var bSnap = await getDoc(bRef);
      if (bSnap.exists()) setBudgetSummary(bSnap.data());
    } catch (e) { console.error(e); }
  }, [user, couple, partnerUid]);

  useEffect(function() {
    loadHomeData();
  }, [loadHomeData]);

  useEffect(function() {
    if (!couple) return;
    var loadQuestion = async function() {
      try {
        var ref = doc(db, 'couples', couple.id, 'daily_answers', getToday());
        var snap = await getDoc(ref);
        if (snap.exists() && snap.data().question) return;
        var res = await fetch('/api/question');
        var data = await res.json();
        if (data.question) {
          setTodayQuestion({ question: data.question, category: data.category || '오늘의 질문' });
          await setDoc(ref, {
            question: data.question,
            category: data.category,
            answers: (snap.exists() && snap.data().answers) || {},
            updatedAt: serverTimestamp(),
          });
        }
      } catch (e) { console.error(e); }
    };
    loadQuestion();
  }, [couple]);

  var handleSaveAnswer = async function() {
    if (!myAnswer.trim() || !couple || !user) return;
    try {
      var ref = doc(db, 'couples', couple.id, 'daily_answers', getToday());
      var snap = await getDoc(ref);
      var existing = snap.exists() ? snap.data() : {};
      var answers = Object.assign({}, existing.answers || {});
      answers[user.uid] = myAnswer;
      await setDoc(ref, Object.assign({}, existing, { answers: answers, updatedAt: serverTimestamp() }));
      setAnswerSaved(true);
      setShowAnswerInput(false);
      await loadHomeData();
    } catch (e) { console.error(e); }
  };

  var loadAnswerHistory = useCallback(async function() {
    if (!user || !couple) return;
    setHistoryLoading(true);
    try {
      var ref = collection(db, 'couples', couple.id, 'daily_answers');
      var snap = await getDocs(ref);
      var today = getToday();
      var list = snap.docs
        .map(function(d) { return Object.assign({ date: d.id }, d.data()); })
        .filter(function(item) { return item.date !== today; })
        .sort(function(a, b) { return b.date.localeCompare(a.date); });
      setAnswerHistory(list);
      setHistoryLoaded(true);
    } catch (e) { console.error(e); }
    finally { setHistoryLoading(false); }
  }, [user, couple]);

  useEffect(function() {
    if (showHistory && !historyLoaded) loadAnswerHistory();
  }, [showHistory, historyLoaded, loadAnswerHistory]);

  var calcBudget = function() {
    if (!budgetSummary) return null;
    var income = budgetSummary.income || {};
    var totalIncome = (income.salary || 0) + (income.overtimePay || 0) + ((income.extras || []).reduce(function(s, e) { return s + (e.amount || 0); }, 0));
    var fixedTotal = (budgetSummary.fixedCosts || []).reduce(function(s, f) { return s + (f.amount || 0); }, 0);
    var varTotal = (budgetSummary.variableExpenses || []).reduce(function(s, e) { return s + (e.amount || 0); }, 0);
    var available = totalIncome - fixedTotal - varTotal;
    var goal = budgetSummary.variableGoal || 0;
    var goalRate = goal > 0 ? Math.min(Math.round((varTotal / goal) * 100), 100) : 0;
    return { totalIncome, fixedTotal, varTotal, available, goal, goalRate };
  };

  var budget = calcBudget();

  var formatNum = function(n) { return (parseInt(n) || 0).toLocaleString(); };

  var getGreeting = function() {
    var hour = new Date().getHours();
    if (hour < 12) return '좋은 아침이에요 ☀️';
    if (hour < 18) return '좋은 오후예요 🌤️';
    return '좋은 저녁이에요 🌙';
  };

  var handleMoodSelect = function(emoji) {
    setMyMood(emoji);
    setMoodSaved(true);
    setTimeout(function() { setMoodSaved(false); }, 2000);
  };

  return (
    <div style={styles.container}>
      {/* FAB 바텀시트 오버레이 */}
      {showFab ? (
        <div style={styles.fabOverlay} onClick={function() { setShowFab(false); }}>
          <div style={styles.fabSheet} onClick={function(e) { e.stopPropagation(); }}>
            <div style={styles.fabSheetHandle} />
            <p style={styles.fabSheetTitle}>빠른 입력</p>
            <div style={styles.fabSheetGrid}>
              {[
                { icon: '📓', label: '기록 작성' },
                { icon: '💸', label: '지출 추가' },
                { icon: '✅', label: '할 일 추가' },
                { icon: '😊', label: '감정 선택' },
              ].map(function(item) {
                return (
                  <button key={item.label} style={styles.fabSheetItem} onClick={function() { setShowFab(false); }}>
                    <span style={styles.fabSheetIcon}>{item.icon}</span>
                    <span style={styles.fabSheetLabel}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* FAB 버튼 */}
      <button style={styles.fab} onClick={function() { setShowFab(true); }}>
        <span style={styles.fabIcon}>+</span>
      </button>

      {/* 상단 인사 */}
      <div style={styles.header}>
        <img src={(user && user.photoURL) || 'https://via.placeholder.com/40'} alt="프로필" style={styles.avatar} />
        <div style={{ flex: 1 }}>
          <p style={styles.greeting}>{getGreeting()}</p>
          <h2 style={styles.name}>{user && user.displayName && user.displayName.split(' ')[0]} 💑</h2>
        </div>
      </div>

      {/* 파트너 감정 카드 */}
      <div style={styles.moodCard}>
        <p style={styles.moodCardTitle}>오늘 파트너는 어때요? 💭</p>
        <div style={styles.moodRow}>
          {PARTNER_MOODS.map(function(emoji) {
            return (
              <button
                key={emoji}
                style={Object.assign({}, styles.moodBtn, myMood === emoji ? styles.moodBtnActive : {})}
                onClick={function() { handleMoodSelect(emoji); }}
              >
                <span style={styles.moodEmoji}>{emoji}</span>
              </button>
            );
          })}
        </div>
        {myMood ? (
          <div style={styles.moodResult}>
            <span style={styles.moodResultText}>내가 생각하는 파트너: {myMood}</span>
            {partnerMood ? <span style={styles.moodPartnerText}> 파트너: {partnerMood}</span> : null}
            {moodSaved ? <span style={styles.moodSavedBadge}>저장됨 ✓</span> : null}
          </div>
        ) : null}
      </div>

      {/* 오늘의 질문 */}
      <div style={styles.questionCard}>
        <div style={styles.questionHeader}>
          <span style={styles.categoryBadge}>{todayQuestion.category}</span>
          <span style={styles.questionDate}>{getToday()}</span>
        </div>
        <p style={styles.questionText}>{todayQuestion.question}</p>
        {answerSaved && !showAnswerInput ? (
          <div>
            <div style={styles.answerBox}>
              <p style={styles.answerLabel}>나의 답변</p>
              <p style={styles.answerText}>{myAnswer}</p>
            </div>
            {partnerAnswer ? (
              <div style={styles.answerBoxPartner}>
                <p style={styles.answerLabel}>파트너 답변 💌</p>
                <p style={styles.answerText}>{partnerAnswer}</p>
              </div>
            ) : (
              <p style={styles.waitingText}>💭 파트너가 아직 답변하지 않았어요</p>
            )}
            <button style={styles.editBtn} onClick={function() { setShowAnswerInput(true); }}>답변 수정</button>
          </div>
        ) : showAnswerInput ? (
          <div>
            <textarea
              style={styles.answerInput}
              placeholder="답변을 입력해요"
              value={myAnswer}
              onChange={function(e) { setMyAnswer(e.target.value); }}
            />
            <div style={styles.btnRow}>
              <button style={styles.questionCancelBtn} onClick={function() { setShowAnswerInput(false); }}>취소</button>
              <button style={styles.questionSaveBtn} onClick={handleSaveAnswer}>저장하기</button>
            </div>
          </div>
        ) : (
          <button style={styles.answerBtn} onClick={function() { setShowAnswerInput(true); }}>✏️ 답변하기</button>
        )}
      </div>

      {/* 오늘 현황 - 한 줄 요약 */}
      <div style={styles.card}>
        <p style={styles.cardLabel}>오늘 현황</p>
        <div style={styles.statusBar}>
          <div style={styles.statusChip}>
            <span style={styles.statusChipIcon}>📓</span>
            <span style={styles.statusChipLabel}>일기</span>
            <span style={styles.statusChipVal}>{todayRecord && todayRecord.night ? '✅' : '—'}</span>
          </div>
          <div style={styles.statusDivider} />
          <div style={styles.statusChip}>
            <span style={styles.statusChipIcon}>🏃</span>
            <span style={styles.statusChipLabel}>운동</span>
            <span style={styles.statusChipVal}>{todayHealth && todayHealth.exercise && todayHealth.exercise.done ? '✅' : '—'}</span>
          </div>
          <div style={styles.statusDivider} />
          <div style={styles.statusChip}>
            <span style={styles.statusChipIcon}>💰</span>
            <span style={styles.statusChipLabel}>지출</span>
            <span style={styles.statusChipVal}>
              {budget && budget.varTotal > 0 ? formatNum(budget.varTotal) + '원' : '—'}
            </span>
          </div>
          <div style={styles.statusDivider} />
          <div style={styles.statusChip}>
            <span style={styles.statusChipIcon}>😊</span>
            <span style={styles.statusChipLabel}>컨디션</span>
            <span style={styles.statusChipVal}>{todayHealth && todayHealth.condition && todayHealth.condition.emoji ? todayHealth.condition.emoji : '—'}</span>
          </div>
        </div>
      </div>

      {/* 기록 히스토리 */}
      <div style={styles.card}>
        <div style={styles.historyHeader}>
          <p style={styles.cardLabel}>📖 기록</p>
          <button
            style={showHistory ? styles.historyToggleActive : styles.historyToggle}
            onClick={function() { setShowHistory(function(p) { return !p; }); }}
          >
            {showHistory ? '접기' : '펼치기'}
          </button>
        </div>
        {showHistory ? (
          historyLoading ? (
            <p style={styles.emptyText}>불러오는 중...</p>
          ) : answerHistory.length === 0 ? (
            <p style={styles.emptyText}>아직 기록이 없어요</p>
          ) : (
            answerHistory.map(function(item) {
              var myAns = item.answers && item.answers[user.uid];
              var partnerAns = item.answers && partnerUid && item.answers[partnerUid];
              return (
                <div key={item.date} style={styles.historyItem}>
                  <div style={styles.historyItemHeader}>
                    <span style={styles.historyDate}>{item.date}</span>
                    {item.category ? <span style={styles.historyCategoryBadge}>{item.category}</span> : null}
                  </div>
                  <p style={styles.historyQuestion}>{item.question}</p>
                  {myAns ? (
                    <div style={styles.historyMyAnswer}>
                      <span style={styles.historyAnswerLabel}>나</span>
                      <p style={styles.historyAnswerText}>{myAns}</p>
                    </div>
                  ) : null}
                  {partnerAns ? (
                    <div style={styles.historyPartnerAnswer}>
                      <span style={styles.historyAnswerLabel}>파트너 💌</span>
                      <p style={styles.historyAnswerText}>{partnerAns}</p>
                    </div>
                  ) : (
                    <p style={styles.historyNoPartner}>파트너 답변 없음</p>
                  )}
                </div>
              );
            })
          )
        ) : null}
      </div>

      {/* 가계부 요약 */}
      {budget ? (
        <div style={styles.card}>
          <p style={styles.cardLabel}>💰 {getThisMonth()} 가계부</p>
          <div style={styles.budgetRow}>
            <span style={styles.budgetLabel}>가용현금</span>
            <span style={Object.assign({}, styles.budgetAmount, { color: budget.available >= 0 ? '#2ecc71' : '#e53e3e' })}>
              {budget.available >= 0 ? '+' : ''}{formatNum(budget.available)}원
            </span>
          </div>
          <div style={styles.budgetRow}>
            <span style={styles.budgetLabel}>이번달 지출</span>
            <span style={styles.budgetSub}>{formatNum(budget.varTotal)}원</span>
          </div>
          {budget.goal > 0 ? (
            <div>
              <div style={styles.progressBar}>
                <div style={Object.assign({}, styles.progressFill, {
                  width: budget.goalRate + '%',
                  background: budget.goalRate >= 100 ? '#e53e3e' : budget.goalRate >= 80 ? '#f39c12' : '#2ecc71',
                })} />
              </div>
              <p style={styles.progressText}>목표 {formatNum(budget.goal)}원 중 {budget.goalRate}% 사용</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  container: { padding: 24, paddingBottom: 100 },
  header: { display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0 20px' },
  greeting: { fontSize: 13, color: '#9E9083', margin: 0 },
  name: { fontSize: 22, fontWeight: 800, margin: '2px 0 0', color: '#2D2D2D', letterSpacing: -0.5 },
  avatar: { width: 44, height: 44, borderRadius: 22, border: '2px solid #EDE8E3', flexShrink: 0 },

  moodCard: {
    background: '#FDFAF7', borderRadius: 20, padding: '14px 16px', marginBottom: 14,
    boxShadow: '0 2px 10px rgba(180,150,130,0.10)',
  },
  moodCardTitle: { fontSize: 13, fontWeight: 700, color: '#9E9083', margin: '0 0 10px' },
  moodRow: { display: 'flex', gap: 8, justifyContent: 'space-between' },
  moodBtn: {
    flex: 1, padding: '10px 4px', border: '1.5px solid #EDE8E3',
    borderRadius: 14, background: '#F5F0EB', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  moodBtnActive: { border: '2px solid #FF6B6B', background: '#FFF0EE' },
  moodEmoji: { fontSize: 26 },
  moodResult: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  moodResultText: { fontSize: 13, color: '#5C5049' },
  moodPartnerText: { fontSize: 13, color: '#9E9083' },
  moodSavedBadge: {
    fontSize: 11, color: '#FF6B6B', background: '#FFF0EE',
    padding: '2px 8px', borderRadius: 10, fontWeight: 600,
  },

  statusBar: { display: 'flex', alignItems: 'center' },
  statusChip: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '4px 0' },
  statusChipIcon: { fontSize: 20 },
  statusChipLabel: { fontSize: 10, color: '#9E9083', fontWeight: 600 },
  statusChipVal: { fontSize: 12, fontWeight: 700, color: '#2D2D2D' },
  statusDivider: { width: 1, height: 40, background: '#EDE8E3', flexShrink: 0 },

  fab: {
    position: 'fixed', bottom: 80, right: 24, zIndex: 101,
    width: 56, height: 56, borderRadius: 28,
    background: '#FF6B6B', border: 'none', cursor: 'pointer',
    boxShadow: '0 6px 24px rgba(255,107,107,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  fabIcon: { fontSize: 28, color: 'white', lineHeight: 1, marginTop: -2 },
  fabOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(45,30,20,0.45)', zIndex: 200, display: 'flex', alignItems: 'flex-end',
  },
  fabSheet: {
    background: '#FDFAF7', borderRadius: '24px 24px 0 0',
    padding: '12px 24px 40px', width: '100%', animation: 'slideUp 0.3s ease',
  },
  fabSheetHandle: {
    width: 40, height: 4, borderRadius: 2, background: '#DDD5CE',
    margin: '0 auto 16px',
  },
  fabSheetTitle: { fontSize: 16, fontWeight: 700, color: '#2D2D2D', margin: '0 0 20px', textAlign: 'center' },
  fabSheetGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  fabSheetItem: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    padding: '20px 16px', background: '#F5F0EB', borderRadius: 20,
    border: 'none', cursor: 'pointer',
  },
  fabSheetIcon: { fontSize: 32 },
  fabSheetLabel: { fontSize: 13, fontWeight: 600, color: '#5C5049' },

  questionCard: {
    background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
    borderRadius: 20, padding: 20, marginBottom: 16,
    boxShadow: '0 6px 24px rgba(255,107,107,0.35)',
  },
  questionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  categoryBadge: {
    background: 'rgba(255,255,255,0.90)', color: '#FF6B6B',
    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
  },
  questionDate: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  questionText: { fontSize: 16, fontWeight: 600, color: 'white', lineHeight: 1.6, margin: '0 0 16px' },
  answerBtn: {
    width: '100%', padding: 13,
    background: 'rgba(255,255,255,0.20)', color: 'white',
    border: '1.5px solid rgba(255,255,255,0.55)',
    borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  answerInput: {
    width: '100%', minHeight: 80, padding: 12,
    border: '1.5px solid rgba(255,255,255,0.45)',
    borderRadius: 12, fontSize: 14, resize: 'none', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 8,
    background: 'rgba(255,255,255,0.15)', color: 'white',
  },
  btnRow: { display: 'flex', gap: 8 },
  cancelBtn: { flex: 1, padding: 12, background: '#EDE8E3', color: '#9E9083', border: 'none', borderRadius: 12, fontSize: 14, cursor: 'pointer' },
  saveBtn: { flex: 1, padding: 12, background: '#FF6B6B', color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  questionCancelBtn: {
    flex: 1, padding: 12, background: 'rgba(255,255,255,0.20)', color: 'white',
    border: 'none', borderRadius: 12, fontSize: 14, cursor: 'pointer',
  },
  questionSaveBtn: {
    flex: 1, padding: 12, background: 'rgba(255,255,255,0.92)', color: '#FF6B6B',
    border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },
  answerBox: { background: 'rgba(255,255,255,0.18)', borderRadius: 12, padding: 12, marginBottom: 8 },
  answerBoxPartner: { background: 'rgba(255,255,255,0.28)', borderRadius: 12, padding: 12, marginBottom: 8 },
  answerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.80)', fontWeight: 600, margin: '0 0 4px' },
  answerText: { fontSize: 14, color: 'white', margin: 0, lineHeight: 1.5 },
  waitingText: { fontSize: 13, color: 'rgba(255,255,255,0.70)', textAlign: 'center', padding: '8px 0' },
  editBtn: {
    width: '100%', padding: 10, background: 'rgba(255,255,255,0.15)',
    color: 'rgba(255,255,255,0.80)', border: '1px solid rgba(255,255,255,0.35)',
    borderRadius: 12, fontSize: 13, cursor: 'pointer', marginTop: 4,
  },

  card: { background: '#FDFAF7', borderRadius: 20, padding: '14px 16px', marginBottom: 14, boxShadow: '0 2px 10px rgba(180,150,130,0.10)' },
  cardLabel: { fontSize: 13, fontWeight: 700, color: '#9E9083', margin: '0 0 10px' },

  statusGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  statusItem: {
    display: 'flex', alignItems: 'center',
    padding: '10px 12px', background: '#F5F0EB', borderRadius: 12, gap: 10,
  },
  statusIcon: { fontSize: 22, flexShrink: 0 },
  statusInfo: { flex: 1 },
  statusText: { fontSize: 13, fontWeight: 600, color: '#2D2D2D', display: 'block' },
  statusHint: { fontSize: 11, color: '#B0A69D', display: 'block', marginTop: 2 },
  statusBadge: { fontSize: 20, flexShrink: 0 },

  todoHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  todoHeaderBtns: { display: 'flex', gap: 8, alignItems: 'center' },
  partnerBtn: { padding: '5px 12px', background: '#EDE8E3', color: '#9E9083', border: 'none', borderRadius: 20, fontSize: 12, cursor: 'pointer' },
  partnerBtnActive: { padding: '5px 12px', background: '#FFF0EE', color: '#FF6B6B', border: 'none', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  addTodoBtn: {
    width: 30, height: 30, background: '#FF6B6B', color: 'white',
    border: 'none', borderRadius: 15, fontSize: 18, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(255,107,107,0.35)',
  },
  todoInputBox: { marginBottom: 12, background: '#F5F0EB', borderRadius: 14, padding: 12 },
  input: { width: '100%', padding: 12, border: '1px solid #EDE8E3', borderRadius: 12, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 8, fontFamily: 'inherit', background: '#FDFAF7' },
  todoItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #EDE8E3' },
  urgencyBar: { width: 4, height: 34, borderRadius: 2, flexShrink: 0 },
  todoContent: { flex: 1 },
  todoText: { fontSize: 14, color: '#2D2D2D', margin: 0, lineHeight: 1.4 },
  todoDone: { textDecoration: 'line-through', color: '#9E9083' },
  todoDue: { fontSize: 11, color: '#9E9083', margin: '3px 0 0' },
  todoBtns: { display: 'flex', gap: 6, alignItems: 'center' },
  shareBtn: {
    padding: '4px 8px', background: '#EDE8E3', color: '#9E9083',
    border: 'none', borderRadius: 10, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  shareBtnActive: { background: '#E8F0FE', color: '#4285f4' },
  doneBtn: {
    width: 34, height: 34, borderRadius: 17, border: '2px solid #DDD5CE',
    background: '#FDFAF7', fontSize: 15, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#B0A69D', flexShrink: 0,
  },
  doneBtnActive: { border: '2px solid #FF6B6B', background: '#FFF0EE', color: '#FF6B6B' },
  emptyText: { color: '#9E9083', fontSize: 14, textAlign: 'center', padding: '12px 0' },

  historyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  historyToggle: {
    padding: '4px 12px', background: '#EDE8E3', color: '#9E9083',
    border: 'none', borderRadius: 20, fontSize: 12, cursor: 'pointer',
  },
  historyToggleActive: {
    padding: '4px 12px', background: '#FFF0EE', color: '#FF6B6B',
    border: 'none', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  historyItem: {
    borderBottom: '1px solid #EDE8E3', paddingBottom: 14, marginBottom: 14,
  },
  historyItemHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  historyDate: { fontSize: 12, color: '#9E9083', fontWeight: 600 },
  historyCategoryBadge: {
    background: '#FFF0EE', color: '#FF6B6B',
    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
  },
  historyQuestion: { fontSize: 14, fontWeight: 600, color: '#2D2D2D', margin: '0 0 8px', lineHeight: 1.5 },
  historyMyAnswer: { background: '#F5F0EB', borderRadius: 10, padding: '8px 12px', marginBottom: 6 },
  historyPartnerAnswer: { background: '#FFF0EE', borderRadius: 10, padding: '8px 12px', marginBottom: 6 },
  historyAnswerLabel: { fontSize: 11, color: '#9E9083', fontWeight: 600, display: 'block', marginBottom: 3 },
  historyAnswerText: { fontSize: 13, color: '#2D2D2D', margin: 0, lineHeight: 1.5 },
  historyNoPartner: { fontSize: 12, color: '#B0A69D', fontStyle: 'italic', margin: 0 },

  budgetRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  budgetLabel: { fontSize: 14, color: '#7A6E67' },
  budgetAmount: { fontSize: 28, fontWeight: 800, letterSpacing: -0.5 },
  budgetSub: { fontSize: 14, fontWeight: 600, color: '#2D2D2D' },
  progressBar: { height: 8, background: '#EDE8E3', borderRadius: 4, overflow: 'hidden', margin: '10px 0 4px' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 12, color: '#9E9083', margin: 0 },
};
