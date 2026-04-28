import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCouple } from '../contexts/CoupleContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const TODAY = new Date().toISOString().split('T')[0];
const THIS_MONTH = new Date().toISOString().substring(0, 7);

const DAILY_QUESTIONS = [
  { category: '커플', question: '처음 설렜던 순간이 언제였어?' },
  { category: '커플', question: '상대방의 어떤 점이 제일 좋아?' },
  { category: '커플', question: '같이 가보고 싶은 여행지는?' },
  { category: '커플', question: '오늘 상대방에게 고마운 점은?' },
  { category: '커플', question: '우리가 함께한 가장 행복한 순간은?' },
  { category: '명언', question: '행복은 습관이다. 그것을 몸에 지녀라. - 아리스토텔레스' },
  { category: '명언', question: '오늘 할 수 있는 일을 내일로 미루지 마라. - 벤자민 프랭클린' },
  { category: '명언', question: '당신이 할 수 있다고 믿든, 할 수 없다고 믿든, 믿는 대로 된다. - 헨리 포드' },
  { category: '명언', question: '성공은 최종 목적지가 아니다. 실패도 치명적이지 않다. 중요한 것은 계속하는 용기다. - 처칠' },
  { category: '건강', question: '오늘 물 8잔 마셨나요? 💧' },
  { category: '건강', question: '오늘 몇 시간 잤나요? 충분한 수면이 건강의 기본이에요.' },
  { category: '건강', question: '오늘 스트레칭 5분만 해볼까요? 🧘' },
  { category: '경제', question: '이번달 지출 목표를 지키고 있나요?' },
  { category: '경제', question: '오늘 불필요한 지출은 없었나요?' },
  { category: '데이트', question: '이번 주말 같이 뭐 할까요? 🎉' },
  { category: '데이트', question: '요즘 가보고 싶은 맛집이 있나요? 🍽️' },
  { category: '데이트', question: '같이 보고 싶은 영화나 드라마가 있나요? 🎬' },
];

function getTodayQuestion() {
  var dateNum = parseInt(TODAY.replace(/-/g, ''));
  var index = dateNum % DAILY_QUESTIONS.length;
  return DAILY_QUESTIONS[index];
}

export default function HomePage() {
  const { user, userDoc } = useAuth();
  const { couple } = useCouple();
  const partnerUid = couple && couple.members && couple.members.find(function(m) { return m !== (user && user.uid); });

  const [todayQuestion] = useState(getTodayQuestion());
  const [myAnswer, setMyAnswer] = useState('');
  const [partnerAnswer, setPartnerAnswer] = useState('');
  const [showAnswerInput, setShowAnswerInput] = useState(false);
  const [answerSaved, setAnswerSaved] = useState(false);

  const [todayRecord, setTodayRecord] = useState(null);
  const [todayHealth, setTodayHealth] = useState(null);
  const [budgetSummary, setBudgetSummary] = useState(null);
  const [upcomingSchedule, setUpcomingSchedule] = useState(null);

  var loadHomeData = useCallback(async function() {
    if (!user || !couple) return;
    try {
      // 오늘의 질문 답변
      var qRef = doc(db, 'couples', couple.id, 'daily_answers', TODAY);
      var qSnap = await getDoc(qRef);
      if (qSnap.exists()) {
        var qData = qSnap.data();
        var answers = qData.answers || {};
        setMyAnswer(answers[user.uid] || '');
        setPartnerAnswer(answers[partnerUid] || '');
        if (answers[user.uid]) setAnswerSaved(true);
      }

      // 오늘의 기록 여부
      var rRef = doc(db, 'couples', couple.id, 'daily', TODAY + '_' + user.uid);
      var rSnap = await getDoc(rRef);
      if (rSnap.exists()) setTodayRecord(rSnap.data());

      // 오늘의 건강 기록
      var hRef = doc(db, 'couples', couple.id, 'health', TODAY + '_' + user.uid);
      var hSnap = await getDoc(hRef);
      if (hSnap.exists()) setTodayHealth(hSnap.data());

      // 가계부 요약
      var bRef = doc(db, 'couples', couple.id, 'budget', THIS_MONTH);
      var bSnap = await getDoc(bRef);
      if (bSnap.exists()) setBudgetSummary(bSnap.data());

    } catch (e) { console.error(e); }
  }, [user, couple, partnerUid]);

  useEffect(function() { loadHomeData(); }, [loadHomeData]);

  var handleSaveAnswer = async function() {
    if (!myAnswer.trim() || !couple || !user) return;
    try {
      var ref = doc(db, 'couples', couple.id, 'daily_answers', TODAY);
      var snap = await getDoc(ref);
      var existing = snap.exists() ? snap.data() : {};
      var answers = Object.assign({}, existing.answers || {});
      answers[user.uid] = myAnswer;
      await setDoc(ref, Object.assign({}, existing, {
        answers: answers,
        questionIndex: DAILY_QUESTIONS.indexOf(todayQuestion),
        updatedAt: serverTimestamp(),
      }));
      setAnswerSaved(true);
      setShowAnswerInput(false);
      await loadHomeData();
    } catch (e) { console.error(e); }
  };

  var calcBudget = function() {
    if (!budgetSummary) return null;
    var income = budgetSummary.income || {};
    var salary = income.salary || 0;
    var overtime = income.overtimePay || 0;
    var extras = (income.extras || []).reduce(function(s, e) { return s + (e.amount || 0); }, 0);
    var totalIncome = salary + overtime + extras;
    var fixedTotal = (budgetSummary.fixedCosts || []).reduce(function(s, f) { return s + (f.amount || 0); }, 0);
    var varTotal = (budgetSummary.variableExpenses || []).reduce(function(s, e) { return s + (e.amount || 0); }, 0);
    var available = totalIncome - fixedTotal - varTotal;
    var goal = budgetSummary.variableGoal || 0;
    var goalRate = goal > 0 ? Math.min(Math.round((varTotal / goal) * 100), 100) : 0;
    return { totalIncome, fixedTotal, varTotal, available, goal, goalRate };
  };

  var budget = calcBudget();

  var formatNum = function(n) {
    return (parseInt(n) || 0).toLocaleString();
  };

  var getGreeting = function() {
    var hour = new Date().getHours();
    if (hour < 12) return '좋은 아침이에요 ☀️';
    if (hour < 18) return '좋은 오후예요 🌤️';
    return '좋은 저녁이에요 🌙';
  };

  var categoryColors = {
    '커플': '#ff7043',
    '명언': '#9c27b0',
    '건강': '#4caf50',
    '경제': '#2196f3',
    '데이트': '#e91e63',
  };

  return (
    <div style={styles.container}>
      {/* 상단 인사 */}
      <div style={styles.header}>
        <div>
          <p style={styles.greeting}>{getGreeting()}</p>
          <h2 style={styles.name}>{user && user.displayName && user.displayName.split(' ')[0]} 💑</h2>
        </div>
        <img
          src={(user && user.photoURL) || 'https://via.placeholder.com/40'}
          alt="프로필"
          style={styles.avatar}
        />
      </div>

      {/* 오늘의 질문 */}
      <div style={styles.questionCard}>
        <div style={styles.questionHeader}>
          <span style={Object.assign({}, styles.categoryBadge, {
            background: categoryColors[todayQuestion.category] || '#ff7043'
          })}>
            {todayQuestion.category}
          </span>
          <span style={styles.questionDate}>{TODAY}</span>
        </div>
        <p style={styles.questionText}>{todayQuestion.question}</p>

        {answerSaved && !showAnswerInput ? (
          <div>
            <div style={styles.answerBox}>
              <p style={styles.answerLabel}>나의 답변</p>
              <p style={styles.answerText}>{myAnswer}</p>
            </div>
            {partnerAnswer ? (
              <div style={Object.assign({}, styles.answerBox, { background: '#f0f7ff' })}>
                <p style={styles.answerLabel}>파트너 답변 💌</p>
                <p style={styles.answerText}>{partnerAnswer}</p>
              </div>
            ) : (
              <p style={styles.waitingText}>💭 파트너가 아직 답변하지 않았어요</p>
            )}
            <button style={styles.editBtn} onClick={function() { setShowAnswerInput(true); }}>
              답변 수정
            </button>
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
              <button style={styles.cancelBtn} onClick={function() { setShowAnswerInput(false); }}>취소</button>
              <button style={styles.saveBtn} onClick={handleSaveAnswer}>저장하기</button>
            </div>
          </div>
        ) : (
          <button style={styles.answerBtn} onClick={function() { setShowAnswerInput(true); }}>
            ✏️ 답변하기
          </button>
        )}
      </div>

      {/* 오늘 현황 */}
      <div style={styles.card}>
        <p style={styles.cardLabel}>오늘 현황</p>
        <div style={styles.statusGrid}>
          <div style={styles.statusItem}>
            <span style={styles.statusIcon}>📓</span>
            <span style={styles.statusText}>일기</span>
            <span style={styles.statusBadge}>
              {todayRecord && todayRecord.night ? '✅' : '⬜'}
            </span>
          </div>
          <div style={styles.statusItem}>
            <span style={styles.statusIcon}>🏃</span>
            <span style={styles.statusText}>운동</span>
            <span style={styles.statusBadge}>
              {todayHealth && todayHealth.exercise && todayHealth.exercise.done ? '✅' : '⬜'}
            </span>
          </div>
          <div style={styles.statusItem}>
            <span style={styles.statusIcon}>🍽️</span>
            <span style={styles.statusText}>식단</span>
            <span style={styles.statusBadge}>
              {todayHealth && todayHealth.meals && todayHealth.meals.morning ? '✅' : '⬜'}
            </span>
          </div>
          <div style={styles.statusItem}>
            <span style={styles.statusIcon}>😊</span>
            <span style={styles.statusText}>컨디션</span>
            <span style={styles.statusBadge}>
              {todayHealth && todayHealth.condition && todayHealth.condition.emoji
                ? todayHealth.condition.emoji : '⬜'}
            </span>
          </div>
        </div>
      </div>

      {/* 가계부 요약 */}
      {budget ? (
        <div style={styles.card}>
          <p style={styles.cardLabel}>💰 {THIS_MONTH} 가계부</p>
          <div style={styles.budgetRow}>
            <span style={styles.budgetLabel}>가용현금</span>
            <span style={Object.assign({}, styles.budgetAmount, {
              color: budget.available >= 0 ? '#2ecc71' : '#e53e3e'
            })}>
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
  container: { padding: 20, paddingBottom: 40 },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 0 16px',
  },
  greeting: { fontSize: 13, color: '#aaa', margin: 0 },
  name: { fontSize: 22, fontWeight: 700, margin: '4px 0 0' },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  questionCard: {
    background: 'white', borderRadius: 20, padding: 20,
    marginBottom: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  },
  questionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  categoryBadge: {
    color: 'white', fontSize: 11, fontWeight: 700,
    padding: '4px 10px', borderRadius: 20,
  },
  questionDate: { fontSize: 12, color: '#bbb' },
  questionText: { fontSize: 16, fontWeight: 600, color: '#333', lineHeight: 1.5, margin: '0 0 16px' },
  answerBtn: {
    width: '100%', padding: 12, background: '#fff3f0', color: '#ff7043',
    border: '1px dashed #ff7043', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  answerInput: {
    width: '100%', minHeight: 80, padding: 12, border: '1px solid #f0f0f0',
    borderRadius: 12, fontSize: 14, resize: 'none', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 8,
  },
  btnRow: { display: 'flex', gap: 8 },
  cancelBtn: {
    flex: 1, padding: 12, background: '#f5f5f5', color: '#888',
    border: 'none', borderRadius: 12, fontSize: 14, cursor: 'pointer',
  },
  saveBtn: {
    flex: 1, padding: 12, background: '#ff7043', color: 'white',
    border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  answerBox: {
    background: '#fafaf8', borderRadius: 12, padding: 12, marginBottom: 8,
  },
  answerLabel: { fontSize: 11, color: '#aaa', fontWeight: 600, margin: '0 0 4px' },
  answerText: { fontSize: 14, color: '#333', margin: 0, lineHeight: 1.5 },
  waitingText: { fontSize: 13, color: '#bbb', textAlign: 'center', padding: '8px 0' },
  editBtn: {
    width: '100%', padding: 10, background: 'none', color: '#aaa',
    border: '1px solid #f0f0f0', borderRadius: 12, fontSize: 13, cursor: 'pointer', marginTop: 4,
  },
  card: {
    background: 'white', borderRadius: 16, padding: 16,
    marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  cardLabel: { fontSize: 13, fontWeight: 600, color: '#888', margin: '0 0 12px' },
  statusGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  statusItem: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '10px 4px', background: '#fafaf8', borderRadius: 12, gap: 4,
  },
  statusIcon: { fontSize: 20 },
  statusText: { fontSize: 11, color: '#aaa' },
  statusBadge: { fontSize: 16 },
  budgetRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  budgetLabel: { fontSize: 14, color: '#666' },
  budgetAmount: { fontSize: 18, fontWeight: 800 },
  budgetSub: { fontSize: 14, fontWeight: 600, color: '#333' },
  progressBar: {
    height: 8, background: '#f0f0f0', borderRadius: 4,
    overflow: 'hidden', margin: '8px 0 4px',
  },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 12, color: '#aaa', margin: 0 },
};
