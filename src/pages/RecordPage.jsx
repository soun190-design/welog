import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCouple } from '../contexts/CoupleContext';
import {
  doc, setDoc, getDoc,
  collection, addDoc,
  query, orderBy, getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const TODAY = new Date().toISOString().split('T')[0];
const YESTERDAY = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const GNEWS_API_KEY = 'bcf3dada057318a80aa25e747fdb5881';

export default function RecordPage() {
  const { user } = useAuth();
  const { couple } = useCouple();
  const partnerUid = couple?.members?.find(m => m !== user?.uid);

  const [viewMode, setViewMode] = useState('mine');
  const [openSection, setOpenSection] = useState('morning');

  // 내 기록
  const [record, setRecord] = useState({
    lunch: { memo: '' },
    evening: { memo: '' },
    night: { diary: '', gratitude: ['', '', ''] },
  });

  // 파트너 기록
  const [partnerRecord, setPartnerRecord] = useState(null);

  // 확언
  const [affirmations, setAffirmations] = useState([]);
  const [todayAffirmations, setTodayAffirmations] = useState({});
  const [newAffirmation, setNewAffirmation] = useState('');
  const [showAddAffirmation, setShowAddAffirmation] = useState(false);

  // 뉴스
  const [news, setNews] = useState([]);
  const [newsOpinions, setNewsOpinions] = useState({});
  const [newsLoading, setNewsLoading] = useState(false);
  const [activeNewsSection, setActiveNewsSection] = useState(null);

  // 저장 상태
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // 내 기록 불러오기
  useEffect(() => {
    if (!user || !couple) return;
    const load = async () => {
      const ref = doc(db, 'couples', couple.id, 'daily', `${TODAY}_${user.uid}`);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setRecord({
          lunch: data.lunch || { memo: '' },
          evening: data.evening || { memo: '' },
          night: data.night || { diary: '', gratitude: ['', '', ''] },
        });
        setNewsOpinions(data.newsOpinions || {});
      }
    };
    load();
  }, [user, couple]);

  // 파트너 기록 불러오기
  useEffect(() => {
    if (!partnerUid || !couple) return;
    const load = async () => {
      const ref = doc(db, 'couples', couple.id, 'daily', `${TODAY}_${partnerUid}`);
      const snap = await getDoc(ref);
      if (snap.exists()) setPartnerRecord(snap.data());
    };
    load();
  }, [partnerUid, couple]);

  // 확언 불러오기
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const ref = collection(db, 'users', user.uid, 'affirmations');
      const q = query(ref, orderBy('createdAt', 'asc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAffirmations(list);
      const todayMap = {};
      list.forEach(a => {
        const todayEntry = a.history?.find(h => h.date === TODAY);
        const yesterdayEntry = a.history?.find(h => h.date === YESTERDAY)
          || (a.history?.length > 0 ? a.history[a.history.length - 1] : null);
        todayMap[a.id] = {
          today: todayEntry?.text || '',
          yesterday: yesterdayEntry?.text || '',
        };
      });
      setTodayAffirmations(todayMap);
    };
    load();
  }, [user]);

  // Firestore 저장 공통 함수
  const saveToFirestore = async (field, value) => {
    if (!user || !couple) return;
    const ref = doc(db, 'couples', couple.id, 'daily', `${TODAY}_${user.uid}`);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? snap.data() : {};
    await setDoc(ref, {
      ...existing,
      [field]: value,
      authorId: user.uid,
      updatedAt: serverTimestamp(),
      createdAt: existing.createdAt || serverTimestamp(),
    });
  };

  // 자기전 저장
  const handleSaveNight = async () => {
    setSaving(true);
    try {
      await saveToFirestore('night', record.night);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // 메모 blur 저장
  const handleSaveMemo = async (type) => {
    try { await saveToFirestore(type, record[type]); }
    catch (e) { console.error(e); }
  };

  // 확언 오늘 버전 저장
  const handleSaveAffirmation = async (affirmationId, text) => {
    if (!user || !text.trim()) return;
    try {
      const ref = doc(db, 'users', user.uid, 'affirmations', affirmationId);
      const snap = await getDoc(ref);
      const data = snap.data();
      const history = (data.history || []).filter(h => h.date !== TODAY);
      history.push({ text, date: TODAY });
      await setDoc(ref, { ...data, history });
    } catch (e) { console.error(e); }
  };

  // 확언 추가
  const handleAddAffirmation = async () => {
    if (!user || !newAffirmation.trim()) return;
    try {
      const ref = collection(db, 'users', user.uid, 'affirmations');
      const docRef = await addDoc(ref, {
        title: newAffirmation,
        isGoal: affirmations.length === 0,
        history: [],
        createdAt: serverTimestamp(),
      });
      setAffirmations(prev => [...prev, { id: docRef.id, title: newAffirmation, isGoal: affirmations.length === 0, history: [] }]);
      setTodayAffirmations(prev => ({ ...prev, [docRef.id]: { today: '', yesterday: '' } }));
      setNewAffirmation('');
      setShowAddAffirmation(false);
    } catch (e) { console.error(e); }
  };

  // 뉴스 불러오기
  const loadNews = async (section) => {
    setNewsLoading(true);
    setActiveNewsSection(section);
    try {
      const res = await fetch(
        `https://gnews.io/api/v4/top-headlines?lang=ko&country=kr&max=4&apikey=${GNEWS_API_KEY}`
      );
      const data = await res.json();
      setNews(data.articles || []);
    } catch (e) {
      console.error(e);
    } finally {
      setNewsLoading(false);
    }
  };

  // 뉴스 의견 저장
  const handleSaveNewsOpinion = async (key, value) => {
    const updated = { ...newsOpinions, [key]: value };
    setNewsOpinions(updated);
    try { await saveToFirestore('newsOpinions', updated); }
    catch (e) { console.error(e); }
  };

  const updateGratitude = (index, value) => {
    const updated = [...(record.night?.gratitude || ['', '', ''])];
    updated[index] = value;
    setRecord(prev => ({ ...prev, night: { ...prev.night, gratitude: updated } }));
  };

  const NewsSection = ({ sectionKey }) => (
    <div>
      {activeNewsSection !== sectionKey || news.length === 0 ? (
        <button
          style={styles.newsLoadBtn}
          onClick={() => loadNews(sectionKey)}
          disabled={newsLoading}
        >
          {newsLoading && activeNewsSection === sectionKey ? '불러오는 중...' : '📰 뉴스 불러오기'}
        </button>
      ) : (
        <div>
          {news.map((article, i) => (
            <div key={i} style={styles.newsCard}>
              <a href={article.url} target="_blank" rel="noreferrer" style={styles.newsTitle}>
                {article.title}
              </a>
              <p style={styles.newsSource}>{article.source?.name}</p>
              <input
                style={styles.input}
                placeholder="내 생각 한 줄"
                value={newsOpinions[`${sectionKey}_${i}`] || ''}
                onChange={e => setNewsOpinions(prev => ({ ...prev, [`${sectionKey}_${i}`]: e.target.value }))}
                onBlur={() => handleSaveNewsOpinion(`${sectionKey}_${i}`, newsOpinions[`${sectionKey}_${i}`] || '')}
              />
            </div>
          ))}
          <button style={styles.refreshBtn} onClick={() => loadNews(sectionKey)} disabled={newsLoading}>
            🔄 새로고침
          </button>
        </div>
      )}
    </div>
  );

  // 파트너 기록 뷰
  if (viewMode === 'partner') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerRow}>
            <h2 style={styles.title}>파트너의 기록 💌</h2>
            <button style={styles.toggleBtn} onClick={() => setViewMode('mine')}>
              내 기록
            </button>
          </div>
          <p style={styles.date}>{formatDate()}</p>
        </div>
        {!partnerRecord ? (
          <div style={styles.emptyCard}>
            <p style={styles.emptyText}>아직 파트너가 오늘 기록을 작성하지 않았어요 💭</p>
          </div>
        ) : (
          <>
            {partnerRecord.lunch?.memo && (
              <div style={styles.card}>
                <div style={styles.staticHeader}><span style={styles.sectionTitle}>☀️ 점심</span></div>
                <div style={styles.sectionBody}>
                  <p style={styles.recordText}>{partnerRecord.lunch.memo}</p>
                </div>
              </div>
            )}
            {partnerRecord.evening?.memo && (
              <div style={styles.card}>
                <div style={styles.staticHeader}><span style={styles.sectionTitle}>🌆 저녁</span></div>
                <div style={styles.sectionBody}>
                  <p style={styles.recordText}>{partnerRecord.evening.memo}</p>
                </div>
              </div>
            )}
            {partnerRecord.night && (
              <div style={styles.card}>
                <div style={styles.staticHeader}><span style={styles.sectionTitle}>🌙 자기 전</span></div>
                <div style={styles.sectionBody}>
                  {partnerRecord.night.diary && (
                    <>
                      <p style={styles.label}>오늘 하루 일기</p>
                      <p style={styles.recordText}>{partnerRecord.night.diary}</p>
                    </>
                  )}
                  {partnerRecord.night.gratitude?.some(g => g) && (
                    <>
                      <p style={styles.label}>감사일기</p>
                      {partnerRecord.night.gratitude.filter(g => g).map((g, i) => (
                        <p key={i} style={styles.gratitudeItem}>🙏 {g}</p>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerRow}>
          <h2 style={styles.title}>오늘의 기록 📓</h2>
          <button style={styles.toggleBtn} onClick={() => setViewMode('partner')}>
            파트너 기록
          </button>
        </div>
        <p style={styles.date}>{formatDate()}</p>
      </div>

      {/* 아침 */}
      <div style={styles.card}>
        <button style={styles.sectionHeader} onClick={() => setOpenSection(p => p === 'morning' ? null : 'morning')}>
          <span style={styles.sectionTitle}>🌅 아침</span>
          <span>{openSection === 'morning' ? '▲' : '▼'}</span>
        </button>
        {openSection === 'morning' && (
          <div style={styles.sectionBody}>
            <p style={styles.label}>✏️ 나의 확언</p>
            {affirmations.length === 0 ? (
              <p style={styles.emptySmall}>아직 확언이 없어요. 첫 확언을 작성해봐요!</p>
            ) : (
              affirmations.map(a => (
                <div key={a.id} style={styles.affirmationCard}>
                  <span style={styles.affirmationTitle}>
                    {a.isGoal ? '🎯 ' : '💬 '}{a.title}
                  </span>
                  {todayAffirmations[a.id]?.yesterday && (
                    <p style={styles.yesterdayText}>
                      이전: "{todayAffirmations[a.id].yesterday}"
                    </p>
                  )}
                  <input
                    style={styles.input}
                    placeholder="오늘의 확언을 작성해요"
                    value={todayAffirmations[a.id]?.today || ''}
                    onChange={e => setTodayAffirmations(prev => ({
                      ...prev,
                      [a.id]: { ...prev[a.id], today: e.target.value }
                    }))}
                    onBlur={() => handleSaveAffirmation(a.id, todayAffirmations[a.id]?.today || '')}
                  />
                </div>
              ))
            )}
            {showAddAffirmation ? (
              <div>
                <input
                  style={styles.input}
                  placeholder="새 확언 입력"
                  value={newAffirmation}
                  onChange={e => setNewAffirmation(e.target.value)}
                />
                <div style={styles.btnRow}>
                  <button style={{ ...styles.saveBtn, flex: 1 }} onClick={handleAddAffirmation}>추가</button>
                  <button style={styles.cancelBtn} onClick={() => setShowAddAffirmation(false)}>취소</button>
                </div>
              </div>
            ) : (
              <button style={styles.addBtn} onClick={() => setShowAddAffirmation(true)}>
                + 확언 추가
              </button>
            )}
            <p style={styles.label}>📰 오늘의 뉴스</p>
            <NewsSection sectionKey="morning" />
          </div>
        )}
      </div>

      {/* 점심 */}
      <div style={styles.card}>
        <button style={styles.sectionHeader} onClick={() => setOpenSection(p => p === 'lunch' ? null : 'lunch')}>
          <span style={styles.sectionTitle}>☀️ 점심</span>
          <span>{openSection === 'lunch' ? '▲' : '▼'}</span>
        </button>
        {openSection === 'lunch' && (
          <div style={styles.sectionBody}>
            <textarea
              style={styles.textarea}
              placeholder="점심 메모를 자유롭게 남겨요"
              value={record.lunch?.memo || ''}
              onChange={e => setRecord(prev => ({ ...prev, lunch: { memo: e.target.value } }))}
              onBlur={() => handleSaveMemo('lunch')}
            />
            <NewsSection sectionKey="lunch" />
          </div>
        )}
      </div>

      {/* 저녁 */}
      <div style={styles.card}>
        <button style={styles.sectionHeader} onClick={() => setOpenSection(p => p === 'evening' ? null : 'evening')}>
          <span style={styles.sectionTitle}>🌆 저녁</span>
          <span>{openSection === 'evening' ? '▲'
