import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCouple } from '../contexts/CoupleContext';
import {
  collection, addDoc, getDocs, doc, setDoc, getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { createNotification } from '../firebase/notifications';

const OVERTIME_RATE = 12000;

function getYearMonth(offset) {
  var d = new Date();
  d.setMonth(d.getMonth() + offset);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

var THIS_MONTH = getYearMonth(0);
var LAST_MONTH = getYearMonth(-1);

export default function BudgetPage() {
  const { user } = useAuth();
  const { couple } = useCouple();

  var thisMonth = THIS_MONTH;
  var lastMonth = LAST_MONTH;

  const [tab, setTab] = useState('summary');
    const [lastMonthFixed, setLastMonthFixed] = useState([]);

  const [salary, setSalary] = useState('');
  const [overtimeHours, setOvertimeHours] = useState('');
  const [extras, setExtras] = useState([]);
  const [newExtraTitle, setNewExtraTitle] = useState('');
  const [newExtraAmount, setNewExtraAmount] = useState('');

  const [fixedCosts, setFixedCosts] = useState([]);
  const [newFixedTitle, setNewFixedTitle] = useState('');
  const [newFixedAmount, setNewFixedAmount] = useState('');

  const [expenses, setExpenses] = useState([]);
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpCategory, setNewExpCategory] = useState('식비');
  const [newExpType, setNewExpType] = useState('cash');
  const [variableGoal, setVariableGoal] = useState('');

  const [cardSettings, setCardSettings] = useState([]);
  const [newCardName, setNewCardName] = useState('');
  const [newCardDate, setNewCardDate] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  var categories = ['식비', '외식', '마트', '교통', '의료', '쇼핑', '문화', '기타'];

  var loadData = useCallback(async function() {
    if (!couple) return;
    try {
      var ref = doc(db, 'couples', couple.id, 'budget', thisMonth);
      var snap = await getDoc(ref);
      if (snap.exists()) {
  var data = snap.data();
  var income = data.income || {};

  setSalary(String(income.salary || ''));
  setOvertimeHours(String(income.overtimeHours || ''));
  setExtras(income.extras || []);
  setFixedCosts(data.fixedCosts || []);
  setExpenses(data.variableExpenses || []);
  setVariableGoal(String(data.variableGoal || ''));
}

      var lastRef = doc(db, 'couples', couple.id, 'budget', lastMonth);
      var lastSnap = await getDoc(lastRef);
      if (lastSnap.exists()) {
        setLastMonthFixed(lastSnap.data().fixedCosts || []);
      }

      var cardRef = collection(db, 'couples', couple.id, 'cardSettings');
      var cardSnap = await getDocs(cardRef);
      setCardSettings(cardSnap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); }));
    } catch (e) { console.error(e); }
  }, [couple, thisMonth, lastMonth]);

  useEffect(function() { loadData(); }, [loadData]);

  var saveData = async function(updates) {
    if (!couple) return;
    setSaving(true);
    try {
      var ref = doc(db, 'couples', couple.id, 'budget', thisMonth);
      var snap = await getDoc(ref);
      var existing = snap.exists() ? snap.data() : {};
      await setDoc(ref, Object.assign({}, existing, updates, { updatedAt: serverTimestamp() }));
      await loadData();
      setSaved(true);
      setTimeout(function() { setSaved(false); }, 2000);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  var calcTotals = function() {
    var salaryNum = parseInt(salary) || 0;
    var overtimePay = (parseInt(overtimeHours) || 0) * OVERTIME_RATE;
    var extraTotal = extras.reduce(function(sum, e) { return sum + (parseInt(e.amount) || 0); }, 0);
    var totalIncome = salaryNum + overtimePay + extraTotal;

    var fixedTotal = fixedCosts.reduce(function(sum, f) { return sum + (parseInt(f.amount) || 0); }, 0);
    var varTotal = expenses.reduce(function(sum, e) { return sum + (parseInt(e.amount) || 0); }, 0);
    var cardTotal = expenses.filter(function(e) { return e.paymentType === 'card'; }).reduce(function(sum, e) { return sum + (parseInt(e.amount) || 0); }, 0);
    var totalExpense = fixedTotal + varTotal;
    var available = totalIncome - totalExpense;
    var goalNum = parseInt(variableGoal) || 0;
    var goalRate = goalNum > 0 ? Math.min(Math.round((varTotal / goalNum) * 100), 100) : 0;

    return { totalIncome, overtimePay, fixedTotal, varTotal, cardTotal, totalExpense, available, goalNum, goalRate };
  };

  var totals = calcTotals();

  var handleSaveIncome = async function() {
    await saveData({
      income: {
        salary: parseInt(salary) || 0,
        overtimeHours: parseInt(overtimeHours) || 0,
        overtimePay: totals.overtimePay,
        extras: extras,
      }
    });
  };

  var handleAddExtra = function() {
    if (!newExtraTitle.trim() || !newExtraAmount) return;
    var updated = extras.concat([{ title: newExtraTitle, amount: parseInt(newExtraAmount) || 0 }]);
    setExtras(updated);
    setNewExtraTitle('');
    setNewExtraAmount('');
  };

  var handleRemoveExtra = function(index) {
    setExtras(extras.filter(function(_, i) { return i !== index; }));
  };

  var handleSaveFixed = async function() {
    await saveData({ fixedCosts: fixedCosts });
  };

  var handleLoadLastMonth = function() {
    if (lastMonthFixed.length === 0) {
      alert('지난달 고정비가 없어요');
      return;
    }
    setFixedCosts(lastMonthFixed);
  };

  var handleAddFixed = function() {
    if (!newFixedTitle.trim() || !newFixedAmount) return;
    setFixedCosts(fixedCosts.concat([{ title: newFixedTitle, amount: parseInt(newFixedAmount) || 0 }]));
    setNewFixedTitle('');
    setNewFixedAmount('');
  };

  var handleRemoveFixed = function(index) {
    setFixedCosts(fixedCosts.filter(function(_, i) { return i !== index; }));
  };

 var handleAddExpense = async function() {
    if (!newExpTitle.trim() || !newExpAmount) return;
    var newItem = {
      title: newExpTitle,
      amount: parseInt(newExpAmount) || 0,
      category: newExpCategory,
      paymentType: newExpType,
      authorId: user.uid,
      date: new Date().toISOString().split('T')[0],
    };
    var updated = expenses.concat([newItem]);
    setExpenses(updated);
    setNewExpTitle('');
    setNewExpAmount('');
    await saveData({ variableExpenses: updated });
    var partnerUid = couple && couple.members && couple.members.find(function(m) { return m !== user.uid; });
    if (partnerUid) {
      await createNotification(
        couple.id, partnerUid, 'budget',
        (newExpCategory + ' ' + newExpTitle + ' ' + (parseInt(newExpAmount) || 0).toLocaleString() + '원 지출됐어요'),
        { amount: parseInt(newExpAmount) || 0, category: newExpCategory }
      );
    }
  };

  var handleRemoveExpense = async function(index) {
    var updated = expenses.filter(function(_, i) { return i !== index; });
    setExpenses(updated);
    await saveData({ variableExpenses: updated });
  };

  var handleAddCard = async function() {
    if (!newCardName.trim() || !newCardDate) return;
    try {
      var ref = collection(db, 'couples', couple.id, 'cardSettings');
      await addDoc(ref, {
        name: newCardName,
        paymentDate: parseInt(newCardDate),
        createdAt: serverTimestamp(),
      });
      setNewCardName('');
      setNewCardDate('');
      await loadData();
    } catch (e) { console.error(e); }
  };

  var formatNum = function(n) {
    return (parseInt(n) || 0).toLocaleString();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>가계부 💰</h2>
        <p style={styles.month}>{thisMonth}</p>
      </div>

      <div style={styles.tabRow}>
        {[
          { id: 'summary', label: '요약' },
          { id: 'income', label: '수입' },
          { id: 'fixed', label: '고정비' },
          { id: 'variable', label: '지출' },
          { id: 'card', label: '카드' },
        ].map(function(t) {
          return (
            <button
              key={t.id}
              style={tab === t.id ? styles.tabActive : styles.tabBtn}
              onClick={function() { setTab(t.id); }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 요약 */}
      {tab === 'summary' ? (
        <div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>총 수입</span>
              <span style={styles.summaryValue}>+{formatNum(totals.totalIncome)}원</span>
            </div>
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>고정비</span>
              <span style={styles.summaryMinus}>-{formatNum(totals.fixedTotal)}원</span>
            </div>
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>변동지출</span>
              <span style={styles.summaryMinus}>-{formatNum(totals.varTotal)}원</span>
            </div>
            <div style={styles.divider} />
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabelBold}>가용현금</span>
              <span style={Object.assign({}, styles.summaryValueBold, { color: totals.available >= 0 ? '#2ecc71' : '#e53e3e' })}>
                {totals.available >= 0 ? '+' : ''}{formatNum(totals.available)}원
              </span>
            </div>
          </div>

          <div style={styles.card}>
            <p style={styles.cardLabel}>💳 카드 미결제</p>
            <p style={styles.cardAmount}>{formatNum(totals.cardTotal)}원</p>
            {cardSettings.map(function(card) {
              return (
                <p key={card.id} style={styles.cardInfo}>
                  {card.name} · 매월 {card.paymentDate}일 결제
                </p>
              );
            })}
          </div>

          {totals.goalNum > 0 ? (
            <div style={styles.card}>
              <p style={styles.cardLabel}>🎯 변동지출 목표</p>
              <div style={styles.progressBar}>
                <div style={Object.assign({}, styles.progressFill, {
                  width: totals.goalRate + '%',
                  background: totals.goalRate >= 100 ? '#e53e3e' : totals.goalRate >= 80 ? '#f39c12' : '#2ecc71',
                })} />
              </div>
              <p style={styles.progressText}>
                {formatNum(totals.varTotal)}원 / {formatNum(totals.goalNum)}원 ({totals.goalRate}%)
              </p>
            </div>
          ) : null}

          {totals.overtimePay > 0 ? (
            <div style={styles.card}>
              <p style={styles.cardLabel}>⏰ 초과근무</p>
              <p style={styles.cardAmount}>{overtimeHours}시간 → 예상 {formatNum(totals.overtimePay)}원</p>
              <p style={styles.cardInfo}>다음달 수입에 반영돼요</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 수입 */}
      {tab === 'income' ? (
        <div>
          <div style={styles.card}>
            <p style={styles.cardLabel}>💵 고정 월급</p>
            <input
              style={styles.input}
              type="number"
              placeholder="월급 입력"
              value={salary}
              onChange={function(e) { setSalary(e.target.value); }}
            />
          </div>

          <div style={styles.card}>
            <p style={styles.cardLabel}>⏰ 초과근무 수당</p>
            <p style={styles.hint}>시간당 {formatNum(OVERTIME_RATE)}원</p>
            <input
              style={styles.input}
              type="number"
              placeholder="이번달 초과근무 시간"
              value={overtimeHours}
              onChange={function(e) { setOvertimeHours(e.target.value); }}
            />
            {overtimeHours ? (
              <p style={styles.calcText}>
                예상 수당: {formatNum((parseInt(overtimeHours) || 0) * OVERTIME_RATE)}원
              </p>
            ) : null}
          </div>

          <div style={styles.card}>
            <p style={styles.cardLabel}>💸 기타 수입</p>
            {extras.map(function(e, i) {
              return (
                <div key={i} style={styles.listItem}>
                  <span style={styles.listLabel}>{e.title}</span>
                  <span style={styles.listAmount}>{formatNum(e.amount)}원</span>
                  <button style={styles.removeBtn} onClick={function() { handleRemoveExtra(i); }}>✕</button>
                </div>
              );
            })}
            <div style={styles.addRow}>
              <input
                style={Object.assign({}, styles.input, { flex: 1 })}
                placeholder="항목명"
                value={newExtraTitle}
                onChange={function(e) { setNewExtraTitle(e.target.value); }}
              />
              <input
                style={Object.assign({}, styles.input, { width: 100 })}
                type="number"
                placeholder="금액"
                value={newExtraAmount}
                onChange={function(e) { setNewExtraAmount(e.target.value); }}
              />
              <button style={styles.addSmallBtn} onClick={handleAddExtra}>추가</button>
            </div>
          </div>

          <button style={styles.saveBtn} onClick={handleSaveIncome} disabled={saving}>
            {saving ? '저장중...' : saved ? '저장됐어요 ✓' : '저장하기'}
          </button>
        </div>
      ) : null}

      {/* 고정비 */}
      {tab === 'fixed' ? (
        <div>
          <button style={styles.loadLastBtn} onClick={handleLoadLastMonth}>
            📋 지난달 고정비 불러오기
          </button>
          <div style={styles.card}>
            <p style={styles.cardLabel}>📌 고정비 목록</p>
            {fixedCosts.length === 0 ? (
              <p style={styles.emptyText}>고정비를 추가해주세요</p>
            ) : (
              fixedCosts.map(function(f, i) {
                return (
                  <div key={i} style={styles.listItem}>
                    <span style={styles.listLabel}>{f.title}</span>
                    <span style={styles.listAmount}>{formatNum(f.amount)}원</span>
                    <button style={styles.removeBtn} onClick={function() { handleRemoveFixed(i); }}>✕</button>
                  </div>
                );
              })
            )}
            <div style={styles.addRow}>
              <input
                style={Object.assign({}, styles.input, { flex: 1 })}
                placeholder="항목명"
                value={newFixedTitle}
                onChange={function(e) { setNewFixedTitle(e.target.value); }}
              />
              <input
                style={Object.assign({}, styles.input, { width: 100 })}
                type="number"
                placeholder="금액"
                value={newFixedAmount}
                onChange={function(e) { setNewFixedAmount(e.target.value); }}
              />
              <button style={styles.addSmallBtn} onClick={handleAddFixed}>추가</button>
            </div>
          </div>
          <div style={styles.totalCard}>
            <span style={styles.totalLabel}>고정비 합계</span>
            <span style={styles.totalAmount}>{formatNum(totals.fixedTotal)}원</span>
          </div>
          <button style={styles.saveBtn} onClick={handleSaveFixed} disabled={saving}>
            {saving ? '저장중...' : saved ? '저장됐어요 ✓' : '저장하기'}
          </button>
        </div>
      ) : null}

      {/* 변동지출 */}
      {tab === 'variable' ? (
        <div>
          <div style={styles.card}>
            <p style={styles.cardLabel}>🎯 이번달 목표금액</p>
            <input
              style={styles.input}
              type="number"
              placeholder="변동지출 목표금액"
              value={variableGoal}
              onChange={function(e) { setVariableGoal(e.target.value); }}
              onBlur={function() { saveData({ variableGoal: parseInt(variableGoal) || 0 }); }}
            />
          </div>

          <div style={styles.card}>
            <p style={styles.cardLabel}>💸 지출 추가</p>
            <input
              style={styles.input}
              placeholder="항목명"
              value={newExpTitle}
              onChange={function(e) { setNewExpTitle(e.target.value); }}
            />
            <input
              style={styles.input}
              type="number"
              placeholder="금액"
              value={newExpAmount}
              onChange={function(e) { setNewExpAmount(e.target.value); }}
            />
            <div style={styles.categoryRow}>
              {categories.map(function(cat) {
                return (
                  <button
                    key={cat}
                    style={newExpCategory === cat ? styles.catActive : styles.catBtn}
                    onClick={function() { setNewExpCategory(cat); }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
            <div style={styles.typeRow}>
              <button
                style={newExpType === 'cash' ? styles.typeActive : styles.typeBtn}
                onClick={function() { setNewExpType('cash'); }}
              >💵 현금</button>
              <button
                style={newExpType === 'card' ? styles.typeActive : styles.typeBtn}
                onClick={function() { setNewExpType('card'); }}
              >💳 카드</button>
            </div>
            <button style={styles.saveBtn} onClick={handleAddExpense}>추가하기</button>
          </div>

          <div style={styles.totalCard}>
            <span style={styles.totalLabel}>변동지출 합계</span>
            <span style={styles.totalAmount}>{formatNum(totals.varTotal)}원</span>
          </div>

          {expenses.length === 0 ? (
            <p style={styles.emptyText}>지출 내역이 없어요</p>
          ) : (
            expenses.slice().reverse().map(function(e, i) {
              return (
                <div key={i} style={styles.expenseItem}>
                  <div style={styles.expenseLeft}>
                    <span style={styles.expenseCategory}>{e.category}</span>
                    <span style={styles.expenseTitle}>{e.title}</span>
                    <span style={styles.expenseType}>{e.paymentType === 'card' ? '💳' : '💵'}</span>
                  </div>
                  <div style={styles.expenseRight}>
                    <span style={styles.expenseAmount}>{formatNum(e.amount)}원</span>
                    <button style={styles.removeBtn} onClick={function() { handleRemoveExpense(expenses.length - 1 - i); }}>✕</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : null}

      {/* 카드 */}
      {tab === 'card' ? (
        <div>
          <div style={styles.card}>
            <p style={styles.cardLabel}>💳 카드 미결제 현황</p>
            <div style={styles.listItem}>
              <span style={styles.listLabel}>이번달 카드 사용액</span>
              <span style={styles.listAmount}>{formatNum(totals.cardTotal)}원</span>
            </div>
          </div>

          <div style={styles.card}>
            <p style={styles.cardLabel}>카드 등록</p>
            {cardSettings.map(function(card) {
              return (
                <div key={card.id} style={styles.listItem}>
                  <span style={styles.listLabel}>{card.name}</span>
                  <span style={styles.listAmount}>매월 {card.paymentDate}일</span>
                </div>
              );
            })}
            <div style={styles.addRow}>
              <input
                style={Object.assign({}, styles.input, { flex: 1 })}
                placeholder="카드명"
                value={newCardName}
                onChange={function(e) { setNewCardName(e.target.value); }}
              />
              <input
                style={Object.assign({}, styles.input, { width: 80 })}
                type="number"
                placeholder="결제일"
                value={newCardDate}
                onChange={function(e) { setNewCardDate(e.target.value); }}
              />
              <button style={styles.addSmallBtn} onClick={handleAddCard}>추가</button>
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
  title: { fontSize: 22, fontWeight: 700, margin: 0 },
  month: { color: '#aaa', fontSize: 14, margin: '4px 0 0' },
  tabRow: { display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto' },
  tabBtn: {
    padding: '8px 14px', border: '1px solid #e0e0e0',
    borderRadius: 20, background: 'white', fontSize: 13,
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  tabActive: {
    padding: '8px 14px', border: 'none',
    borderRadius: 20, background: '#ff7043', color: 'white',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  card: {
    background: 'white', borderRadius: 16, padding: 16,
    marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  cardLabel: { fontSize: 13, fontWeight: 600, color: '#888', margin: '0 0 12px' },
  cardAmount: { fontSize: 20, fontWeight: 700, color: '#333', margin: '0 0 4px' },
  cardInfo: { fontSize: 12, color: '#aaa', margin: '4px 0 0' },
  summaryCard: {
    background: 'white', borderRadius: 16, padding: 20,
    marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  summaryLabel: { fontSize: 14, color: '#666' },
  summaryValue: { fontSize: 16, fontWeight: 600, color: '#2ecc71' },
  summaryMinus: { fontSize: 16, fontWeight: 600, color: '#e53e3e' },
  summaryLabelBold: { fontSize: 16, fontWeight: 700, color: '#333' },
  summaryValueBold: { fontSize: 20, fontWeight: 800 },
  divider: { height: 1, background: '#f0f0f0', margin: '8px 0 16px' },
  progressBar: {
    height: 12, background: '#f0f0f0', borderRadius: 6,
    overflow: 'hidden', margin: '8px 0',
  },
  progressFill: { height: '100%', borderRadius: 6, transition: 'width 0.3s' },
  progressText: { fontSize: 13, color: '#666', margin: 0 },
  input: {
    width: '100%', padding: 12, border: '1px solid #f0f0f0',
    borderRadius: 12, fontSize: 14, outline: 'none',
    boxSizing: 'border-box', marginBottom: 8, fontFamily: 'inherit',
  },
  hint: { fontSize: 12, color: '#aaa', margin: '0 0 8px' },
  calcText: { fontSize: 14, color: '#ff7043', fontWeight: 600, margin: '0 0 8px' },
  addRow: { display: 'flex', gap: 8, alignItems: 'center' },
  listItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 0', borderBottom: '1px solid #f0f0f0',
  },
  listLabel: { fontSize: 14, color: '#333', flex: 1 },
  listAmount: { fontSize: 14, fontWeight: 600, color: '#333', marginRight: 8 },
  removeBtn: {
    background: 'none', border: 'none', color: '#ccc',
    cursor: 'pointer', fontSize: 14, padding: '0 4px',
  },
  addSmallBtn: {
    padding: '12px 14px', background: '#ff7043', color: 'white',
    border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  saveBtn: {
    width: '100%', padding: 14, background: '#ff7043', color: 'white',
    border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600,
    cursor: 'pointer', marginTop: 4, marginBottom: 12,
  },
  loadLastBtn: {
    width: '100%', padding: 12, background: '#f5f5f5', color: '#555',
    border: 'none', borderRadius: 12, fontSize: 14, cursor: 'pointer', marginBottom: 12,
  },
  totalCard: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#fff3f0', borderRadius: 12, padding: '12px 16px', marginBottom: 12,
  },
  totalLabel: { fontSize: 14, fontWeight: 600, color: '#ff7043' },
  totalAmount: { fontSize: 18, fontWeight: 800, color: '#ff7043' },
  categoryRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  catBtn: {
    padding: '6px 12px', border: '1px solid #e0e0e0',
    borderRadius: 20, background: 'white', fontSize: 12, cursor: 'pointer',
  },
  catActive: {
    padding: '6px 12px', border: 'none', borderRadius: 20,
    background: '#ff7043', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  typeRow: { display: 'flex', gap: 8, marginBottom: 8 },
  typeBtn: {
    flex: 1, padding: 10, border: '1px solid #e0e0e0',
    borderRadius: 12, background: 'white', fontSize: 14, cursor: 'pointer',
  },
  typeActive: {
    flex: 1, padding: 10, border: 'none', borderRadius: 12,
    background: '#ff7043', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  expenseItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: 'white', borderRadius: 12, padding: '12px 16px',
    marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  expenseLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  expenseCategory: {
    fontSize: 11, color: '#ff7043', background: '#fff3f0',
    padding: '2px 8px', borderRadius: 10, fontWeight: 600,
  },
  expenseTitle: { fontSize: 14, color: '#333' },
  expenseType: { fontSize: 14 },
  expenseRight: { display: 'flex', alignItems: 'center', gap: 8 },
  expenseAmount: { fontSize: 14, fontWeight: 700, color: '#333' },
  emptyText: { color: '#aaa', fontSize: 14, textAlign: 'center', padding: '20px 0' },
};
