import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCouple } from '../contexts/CoupleContext';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const TODAY = new Date().toISOString().split('T')[0];
const THIS_MONTH = new Date().toISOString().substring(0, 7);

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
  var dateNum = parseInt(TODAY.replace(/-/g, ''));
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

  // 투두리스트
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [newTodoDue, setNewTodoDue] = useState('');
  const [showTodoInput, setShowTodoInput] = useState(false);
  const [showPartnerTodos, setShowPartnerTodos] = useState(false);
  const [partnerTodos, setPartnerTodos] = useState([]);

  var getDaysElapsed = function(createdAt) {
    if (!createdAt) return 0;
    var created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    var now = new Date();
    return Math.floor((now - created) / (1000 * 60 * 60 * 24));
  };

  var getUrgencyColor = function(todo) {
    if (todo.isDone) return '#e0e0e0';
    if (todo.dueDate && todo.dueDate < TODAY) return '#e53e3e';
    var days = getDaysElapsed(todo.createdAt);
    if (todo.dueDate) {
      var dueDate = new Date(todo.dueDate);
      var daysLeft = Math.floor((dueDate - new Date()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 1) return '#e53e3e';
      if (daysLeft <= 3) return '#f39c12';
      return '#66bb6a';
    }
    if (days >= 5) return '#e53e3e';
    if (days >= 3) return '#f39c12';
    if (days >= 1) return '#ffa726';
    return '#66bb6a';
  };

  var loadTodos = useCallback(async function() {
    if (!user) return;
    try {
      var ref = collection(db, 'users', user.uid, 'todos');
      var snap = await getDocs(ref);
      var list = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
      list.sort(function(a, b) {
        if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
        return 0;
      });
      setTodos(list);
    } catch (e) { console.error(e); }
  }, [user]);

  var loadPartnerTodos = useCallback(async function() {
    if (!partnerUid) return;
    try {
      var ref = collection(db, 'users', partnerUid, 'todos');
      var snap = await getDocs(ref);
      var list = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
      setPartnerTodos(list.filter(function(t) { return t.isShared; }));
    } catch (e) { console.error(e); }
  }, [partnerUid]);

  var loadHomeData = useCallback(async function() {
    if (!user || !couple) return;
    try {
      var qRef = doc(db, 'couples', couple.id, 'daily_answers', TODAY);
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
      var rRef = doc(db, 'couples', couple.id, 'daily', TODAY + '_' + user.uid);
      var rSnap = await getDoc(rRef);
      if (rSnap.exists()) setTodayRecord(rSnap.data());
      var hRef = doc(db, 'couples', couple.id, 'health', TODAY + '_' + user.uid);
      var hSnap = await getDoc(hRef);
      if (hSnap.exists()) setTodayHealth(hSnap.data());
      var bRef = doc(db, 'couples', couple.id, 'budget', THIS_MONTH);
      var bSnap = await getDoc(bRef);
      if (bSnap.exists()) setBudgetSummary(bSnap.data());
    } catch (e) { console.error(e); }
  }, [user, couple, partnerUid]);

  useEffect(function() {
    loadHomeData();
    loadTodos();
  }, [loadHomeData, loadTodos]);

  useEffect(function() {
    if (showPartnerTodos) loadPartnerTodos();
  }, [showPartnerTodos, loadPartnerTodos]);

  useEffect(function() {
    if (!couple) return;
    var loadQuestion = async function() {
      try {
        var ref = doc(db, 'couples', couple.id, 'daily_answers', TODAY);
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
      var ref = doc(db, 'couples', couple.id, 'daily_answers', TODAY);
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

  var handleAddTodo = async function() {
    if (!newTodo.trim() || !user) return;
    try {
      var ref = collection(db, 'users', user.uid, 'todos');
      await addDoc(ref, {
        content: newTodo,
        dueDate: newTodoDue || null,
        isDone: false,
        isShared: false,
        createdAt: serverTimestamp(),
      });
      setNewTodo('');
      setNewTodoDue('');
      setShowTodoInput(false);
      await loadTodos();
    } catch (e) { console.error(e); }
  };

  var handleToggleTodo = async function(todoId, isDone) {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'todos', todoId), {
        isDone: !isDone,
        doneAt: !isDone ? serverTimestamp() : null,
      });
      await loadTodos();
    } catch (e) { console.error(e); }
  };

  var handleToggleShare = async function(todoId, isShared) {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'todos', todoId), { isShared: !isShared });
      await loadTodos();
    } catch (e) { console.error(e); }
  };

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

  var categoryColors = {
    '경제/재테크': '#2196f3',
    '취향/문화': '#9c27b0',
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
        <img src={(user && user.photoURL) || 'https://via.placeholder.com/40'} alt="프로필" style={styles.avatar} />
      </div>

      {/* 오늘의 질문 */}
      <div style={styles.questionCard}>
        <div style={styles.questionHeader}>
          <span style={Object.assign({}, styles.categoryBadge, { background: categoryColors[todayQuestion.category] || '#ff7043' })}>
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
              <button style={styles.cancelBtn} onClick={function() { setShowAnswerInput(false); }}>취소</button>
              <button style={styles.saveBtn} onClick={handleSaveAnswer}>저장하기</button>
            </div>
          </div>
        ) : (
          <button style={styles.answerBtn} onClick={function() { setShowAnswerInput(true); }}>✏️ 답변하기</button>
        )}
      </div>

      {/* 오늘 현황 */}
      <div style={styles.card}>
        <p style={styles.cardLabel}>오늘 현황</p>
        <div style={styles.statusGrid}>
          <div style={styles.statusItem}>
            <span style={styles.statusIcon}>📓</span>
            <span style={styles.statusText}>일기</span>
            <span style={styles.statusBadge}>{todayRecord && todayRecord.night ? '✅' : '⬜'}</span>
          </div>
          <div style={styles.statusItem}>
            <span style={styles.statusIcon}>🏃</span>
            <span style={styles.statusText}>운동</span>
            <span style={styles.statusBadge}>{todayHealth && todayHealth.exercise && todayHealth.exercise.done ? '✅' : '⬜'}</span>
          </div>
          <div style={styles.statusItem}>
            <span style={styles.statusIcon}>🍽️</span>
            <span style={styles.statusText}>식단</span>
            <span style={styles.statusBadge}>{todayHealth && todayHealth.meals && todayHealth.meals.morning ? '✅' : '⬜'}</span>
          </div>
          <div style={styles.statusItem}>
            <span style={styles.statusIcon}>😊</span>
            <span style={styles.statusText}>컨디션</span>
            <span style={styles.statusBadge}>{todayHealth && todayHealth.condition && todayHealth.condition.emoji ? todayHealth.condition.emoji : '⬜'}</span>
          </div>
        </div>
      </div>

      {/* 투두리스트 */}
      <div style={styles.card}>
        <div style={styles.todoHeader}>
          <p style={styles.cardLabel}>✅ 할 일</p>
          <div style={styles.todoHeaderBtns}>
            <button
              style={showPartnerTodos ? styles.partnerBtnActive : styles.partnerBtn}
              onClick={function() { setShowPartnerTodos(function(p) { return !p; }); }}
            >
              {showPartnerTodos ? '내 할 일' : '파트너 할 일'}
            </button>
            <button style={styles.addTodoBtn} onClick={function() { setShowTodoInput(function(p) { return !p; }); }}>+</button>
          </div>
        </div>

        {showTodoInput ? (
          <div style={styles.todoInputBox}>
            <input
              style={styles.input}
              placeholder="할 일 입력"
              value={newTodo}
              onChange={function(e) { setNewTodo(e.target.value); }}
              onKeyDown={function(e) { if (e.key === 'Enter') handleAddTodo(); }}
            />
            <input
              style={styles.input}
              type="date"
              value={newTodoDue}
              onChange={function(e) { setNewTodoDue(e.target.value); }}
            />
            <div style={styles.btnRow}>
              <button style={styles.cancelBtn} onClick={function() { setShowTodoInput(false); }}>취소</button>
              <button style={styles.saveBtn} onClick={handleAddTodo}>추가</button>
            </div>
          </div>
        ) : null}

        {showPartnerTodos ? (
          partnerTodos.length === 0 ? (
            <p style={styles.emptyText}>파트너가 공유한 할 일이 없어요</p>
          ) : (
            partnerTodos.map(function(todo) {
              return (
                <div key={todo.id} style={styles.todoItem}>
                  <div style={Object.assign({}, styles.urgencyBar, { background: getUrgencyColor(todo) })} />
                  <div style={styles.todoContent}>
                    <p style={Object.assign({}, styles.todoText, todo.isDone ? styles.todoDone : {})}>
                      {todo.content}
                    </p>
                    {todo.dueDate ? <p style={styles.todoDue}>~{todo.dueDate}</p> : null}
                  </div>
                  {todo.isDone ? <span style={styles.doneIcon}>✅</span> : null}
                </div>
              );
            })
          )
        ) : (
          todos.length === 0 ? (
            <p style={styles.emptyText}>할 일을 추가해봐요!</p>
          ) : (
            todos.map(function(todo) {
              return (
                <div key={todo.id} style={styles.todoItem}>
                  <div style={Object.assign({}, styles.urgencyBar, { background: getUrgencyColor(todo) })} />
                  <div style={styles.todoContent}>
                    <p style={Object.assign({}, styles.todoText, todo.isDone ? styles.todoDone : {})}>
                      {todo.content}
                    </p>
                    {todo.dueDate ? <p style={styles.todoDue}>~{todo.dueDate}</p> : null}
                  </div>
                  <div style={styles.todoBtns}>
                    <button
                      style={styles.todoIconBtn}
                      onClick={function() { handleToggleShare(todo.id, todo.isShared); }}
                      title={todo.isShared ? '공유 중' : '공유 안 함'}
                    >
                      {todo.isShared ? '👁️' : '🙈'}
                    </button>
                    <button
                      style={styles.todoIconBtn}
                      onClick={function() { handleToggleTodo(todo.id, todo.isDone); }}
                    >
                      {todo.isDone ? '↩️' : '✅'}
                    </button>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>

      {/* 가계부 요약 */}
      {budget ? (
        <div style={styles.card}>
          <p style={styles.cardLabel}>💰 {THIS_MONTH} 가계부</p>
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
  container: { padding: 20, paddingBottom: 40 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 16px' },
  greeting: { fontSize: 13, color: '#aaa', margin: 0 },
  name: { fontSize: 22, fontWeight: 700, margin: '4px 0 0' },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  questionCard: {
    background: 'white', borderRadius: 20, padding: 20,
    marginBottom: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  },
  questionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  categoryBadge: { color: 'white', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20 },
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
  cancelBtn: { flex: 1, padding: 12, background: '#f5f5f5', color: '#888', border: 'none', borderRadius: 12, fontSize: 14, cursor: 'pointer' },
  saveBtn: { flex: 1, padding: 12, background: '#ff7043', color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  answerBox: { background: '#fafaf8', borderRadius: 12, padding: 12, marginBottom: 8 },
  answerLabel: { fontSize: 11, color: '#aaa', fontWeight: 600, margin: '0 0 4px' },
  answerText: { fontSize: 14, color: '#333', margin: 0, lineHeight: 1.5 },
  waitingText: { fontSize: 13, color: '#bbb', textAlign: 'center', padding: '8px 0' },
  editBtn: { width: '100%', padding: 10, background: 'none', color: '#aaa', border: '1px solid #f0f0f0', borderRadius: 12, fontSize: 13, cursor: 'pointer', marginTop: 4 },
  card: { background: 'white', borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cardLabel: { fontSize: 13, fontWeight: 600, color: '#888', margin: '0 0 12px' },
  statusGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  statusItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px', background: '#fafaf8', borderRadius: 12, gap: 4 },
  statusIcon: { fontSize: 20 },
  statusText: { fontSize: 11, color: '#aaa' },
  statusBadge: { fontSize: 16 },
  todoHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  todoHeaderBtns: { display: 'flex', gap: 8, alignItems: 'center' },
  partnerBtn: { padding: '4px 10px', background: '#f5f5f5', color: '#888', border: 'none', borderRadius: 20, fontSize: 12, cursor: 'pointer' },
  partnerBtnActive: { padding: '4px 10px', background: '#fff3f0', color: '#ff7043', border: 'none', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  addTodoBtn: { width: 28, height: 28, background: '#ff7043', color: 'white', border: 'none', borderRadius: 14, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  todoInputBox: { marginBottom: 12 },
  input: { width: '100%', padding: 12, border: '1px solid #f0f0f0', borderRadius: 12, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 8, fontFamily: 'inherit' },
  todoItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f5f5f5' },
  urgencyBar: { width: 4, height: 36, borderRadius: 2, flexShrink: 0 },
  todoContent: { flex: 1 },
  todoText: { fontSize: 14, color: '#333', margin: 0, lineHeight: 1.4 },
  todoDone: { textDecoration: 'line-through', color: '#aaa' },
  todoDue: { fontSize: 11, color: '#aaa', margin: '2px 0 0' },
  todoBtns: { display: 'flex', gap: 4 },
  todoIconBtn: { background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', padding: '2px' },
  doneIcon: { fontSize: 16 },
  emptyText: { color: '#aaa', fontSize: 14, textAlign: 'center', padding: '16px 0' },
  budgetRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  budgetLabel: { fontSize: 14, color: '#666' },
  budgetAmount: { fontSize: 18, fontWeight: 800 },
  budgetSub: { fontSize: 14, fontWeight: 600, color: '#333' },
  progressBar: { height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden', margin: '8px 0 4px' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 12, color: '#aaa', margin: 0 },
};
