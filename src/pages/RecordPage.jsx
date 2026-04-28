import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCouple } from '../contexts/CoupleContext';
import { doc, setDoc, getDoc, collection, addDoc, query, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const TODAY = new Date().toISOString().split('T')[0];
const YESTERDAY = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const GNEWS_API_KEY = 'bcf3dada057318a80aa25e747fdb5881';

function formatDate() {
  return new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });
}

function NewsSection({ sectionKey, newsOpinions, setNewsOpinions, onSaveOpinion }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

const loadNews = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        '/api/news'
      );
      const data = await res.json();
      if (data.articles && data.articles.length > 0) {
        setNews(data.articles);
        setLoaded(true);
      } else {
        alert('뉴스 오류: ' + JSON.stringify(data));
      }
    } catch (e) {
      alert('fetch 에러: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!loaded) {
    return (
      <button style={styles.newsLoadBtn} onClick={loadNews} disabled={loading}>
        {loading ? '불러오는 중...' : '📰 뉴스 불러오기'}
      </button>
    );
  }

  return (
    <div>
      {news.map(function(article, i) {
        var key = sectionKey + '_' + i;
        return (
          <div key={i} style={styles.newsCard}>
            <a href={article.url} target="_blank" rel="noreferrer" style={styles.newsTitle}>
              {article.title}
            </a>
            <p style={styles.newsSource}>{article.source && article.source.name}</p>
            <input
              style={styles.input}
              placeholder="내 생각 한 줄"
              value={newsOpinions[key] || ''}
              onChange={function(e) {
                var updated = Object.assign({}, newsOpinions);
                updated[key] = e.target.value;
                setNewsOpinions(updated);
              }}
              onBlur={function() { onSaveOpinion(key, newsOpinions[key] || ''); }}
            />
          </div>
        );
      })}
      <button style={styles.refreshBtn} onClick={loadNews} disabled={loading}>
        {loading ? '불러오는 중...' : '🔄 새로고침'}
      </button>
    </div>
  );
}

export default function RecordPage() {
  const { user } = useAuth();
  const { couple } = useCouple();
  const partnerUid = couple && couple.members && couple.members.find(function(m) { return m !== (user && user.uid); });

  const [viewMode, setViewMode] = useState('mine');
  const [openSection, setOpenSection] = useState('morning');
  const [lunch, setLunch] = useState('');
  const [evening, setEvening] = useState('');
  const [diary, setDiary] = useState('');
  const [gratitude, setGratitude] = useState(['', '', '']);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [affirmations, setAffirmations] = useState([]);
  const [todayAffirmations, setTodayAffirmations] = useState({});
  const [newAffirmation, setNewAffirmation] = useState('');
  const [showAddAffirmation, setShowAddAffirmation] = useState(false);
  const [newsOpinions, setNewsOpinions] = useState({});
  const [partnerRecord, setPartnerRecord] = useState(null);

  useEffect(function() {
    if (!user || !couple) return;
    var load = async function() {
      var ref = doc(db, 'couples', couple.id, 'daily', TODAY + '_' + user.uid);
      var snap = await getDoc(ref);
      if (snap.exists()) {
        var data = snap.data();
        setLunch((data.lunch && data.lunch.memo) || '');
        setEvening((data.evening && data.evening.memo) || '');
        setDiary((data.night && data.night.diary) || '');
        setGratitude((data.night && data.night.gratitude) || ['', '', '']);
        setNewsOpinions(data.newsOpinions || {});
      }
    };
    load();
  }, [user, couple]);

  useEffect(function() {
    if (!partnerUid || !couple) return;
    var load = async function() {
      var ref = doc(db, 'couples', couple.id, 'daily', TODAY + '_' + partnerUid);
      var snap = await getDoc(ref);
      if (snap.exists()) setPartnerRecord(snap.data());
    };
    load();
  }, [partnerUid, couple]);

  useEffect(function() {
    if (!user) return;
    var load = async function() {
      var ref = collection(db, 'users', user.uid, 'affirmations');
      var q = query(ref, orderBy('createdAt', 'asc'));
      var snap = await getDocs(q);
      var list = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
      setAffirmations(list);
      var todayMap = {};
      list.forEach(function(a) {
        var todayEntry = a.history && a.history.find(function(h) { return h.date === TODAY; });
        var historyList = a.history || [];
        var yesterdayEntry = historyList.find(function(h) { return h.date === YESTERDAY; }) || (historyList.length > 0 ? historyList[historyList.length - 1] : null);
        todayMap[a.id] = {
          today: (todayEntry && todayEntry.text) || '',
          yesterday: (yesterdayEntry && yesterdayEntry.text) || '',
        };
      });
      setTodayAffirmations(todayMap);
    };
    load();
  }, [user]);

  var saveToFirestore = async function(field, value) {
    if (!user || !couple) return;
    var ref = doc(db, 'couples', couple.id, 'daily', TODAY + '_' + user.uid);
    var snap = await getDoc(ref);
    var existing = snap.exists() ? snap.data() : {};
    await setDoc(ref, Object.assign({}, existing, {
      [field]: value,
      authorId: user.uid,
      updatedAt: serverTimestamp(),
      createdAt: existing.createdAt || serverTimestamp(),
    }));
  };

  var handleSaveNight = async function() {
    setSaving(true);
    try {
      await saveToFirestore('night', { diary: diary, gratitude: gratitude });
      setSaved(true);
      setTimeout(function() { setSaved(false); }, 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  var handleSaveAffirmation = async function(affirmationId, text) {
    if (!user || !text.trim()) return;
    try {
      var ref = doc(db, 'users', user.uid, 'affirmations', affirmationId);
      var snap = await getDoc(ref);
      var data = snap.data();
      var history = (data.history || []).filter(function(h) { return h.date !== TODAY; });
      history.push({ text: text, date: TODAY });
      await setDoc(ref, Object.assign({}, data, { history: history }));
    } catch (e) { console.error(e); }
  };

  var handleAddAffirmation = async function() {
    if (!user || !newAffirmation.trim()) return;
    try {
      var ref = collection(db, 'users', user.uid, 'affirmations');
      var docRef = await addDoc(ref, {
        title: newAffirmation,
        isGoal: affirmations.length === 0,
        history: [],
        createdAt: serverTimestamp(),
      });
      setAffirmations(function(prev) { return prev.concat([{ id: docRef.id, title: newAffirmation, isGoal: affirmations.length === 0, history: [] }]); });
      setTodayAffirmations(function(prev) { return Object.assign({}, prev, { [docRef.id]: { today: '', yesterday: '' } }); });
      setNewAffirmation('');
      setShowAddAffirmation(false);
    } catch (e) { console.error(e); }
  };

  var handleSaveNewsOpinion = async function(key, value) {
    var updated = Object.assign({}, newsOpinions, { [key]: value });
    setNewsOpinions(updated);
    try { await saveToFirestore('newsOpinions', updated); }
    catch (e) { console.error(e); }
  };

  var updateGratitude = function(index, value) {
    var updated = gratitude.slice();
    updated[index] = value;
    setGratitude(updated);
  };

  if (viewMode === 'partner') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerRow}>
            <h2 style={styles.title}>파트너의 기록 💌</h2>
            <button style={styles.toggleBtn} onClick={function() { setViewMode('mine'); }}>내 기록</button>
          </div>
          <p style={styles.date}>{formatDate()}</p>
        </div>
        {!partnerRecord ? (
          <div style={styles.emptyCard}>
            <p style={styles.emptyText}>아직 파트너가 오늘 기록을 작성하지 않았어요 💭</p>
          </div>
        ) : (
          <div>
            {partnerRecord.lunch && partnerRecord.lunch.memo ? (
              <div style={styles.card}>
                <div style={styles.staticHeader}><span style={styles.sectionTitle}>☀️ 점심</span></div>
                <div style={styles.sectionBody}><p style={styles.recordText}>{partnerRecord.lunch.memo}</p></div>
              </div>
            ) : null}
            {partnerRecord.evening && partnerRecord.evening.memo ? (
              <div style={styles.card}>
                <div style={styles.staticHeader}><span style={styles.sectionTitle}>🌆 저녁</span></div>
                <div style={styles.sectionBody}><p style={styles.recordText}>{partnerRecord.evening.memo}</p></div>
              </div>
            ) : null}
            {partnerRecord.night ? (
              <div style={styles.card}>
                <div style={styles.staticHeader}><span style={styles.sectionTitle}>🌙 자기 전</span></div>
                <div style={styles.sectionBody}>
                  {partnerRecord.night.diary ? (
                    <div>
                      <p style={styles.label}>오늘 하루 일기</p>
                      <p style={styles.recordText}>{partnerRecord.night.diary}</p>
                    </div>
                  ) : null}
                  {partnerRecord.night.gratitude && partnerRecord.night.gratitude.some(function(g) { return g; }) ? (
                    <div>
                      <p style={styles.label}>감사일기</p>
                      {partnerRecord.night.gratitude.filter(function(g) { return g; }).map(function(g, i) {
                        return <p key={i} style={styles.gratitudeItem}>🙏 {g}</p>;
                      })}
                    </div>
                  ) : null}
                </div>
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
          <h2 style={styles.title}>오늘의 기록 📓</h2>
          <button style={styles.toggleBtn} onClick={function() { setViewMode('partner'); }}>파트너 기록</button>
        </div>
        <p style={styles.date}>{formatDate()}</p>
      </div>

      <div style={styles.card}>
        <button style={styles.sectionHeader} onClick={function() { setOpenSection(function(p) { return p === 'morning' ? null : 'morning'; }); }}>
          <span style={styles.sectionTitle}>🌅 아침</span>
          <span>{openSection === 'morning' ? '▲' : '▼'}</span>
        </button>
        {openSection === 'morning' ? (
          <div style={styles.sectionBody}>
            <p style={styles.label}>✏️ 나의 확언</p>
            {affirmations.length === 0 ? (
              <p style={styles.emptySmall}>아직 확언이 없어요. 첫 확언을 작성해봐요!</p>
            ) : (
              affirmations.map(function(a) {
                return (
                  <div key={a.id} style={styles.affirmationCard}>
                    <p style={styles.affirmationTitle}>{a.isGoal ? '🎯 ' : '💬 '}{a.title}</p>
                    {todayAffirmations[a.id] && todayAffirmations[a.id].yesterday ? (
                      <p style={styles.yesterdayText}>이전: "{todayAffirmations[a.id].yesterday}"</p>
                    ) : null}
                    <input
                      style={styles.input}
                      placeholder="오늘의 확언을 작성해요"
                      value={(todayAffirmations[a.id] && todayAffirmations[a.id].today) || ''}
                      onChange={function(e) {
                        var val = e.target.value;
                        setTodayAffirmations(function(prev) {
                          var next = Object.assign({}, prev);
                          next[a.id] = Object.assign({}, prev[a.id], { today: val });
                          return next;
                        });
                      }}
                      onBlur={function() { handleSaveAffirmation(a.id, (todayAffirmations[a.id] && todayAffirmations[a.id].today) || ''); }}
                    />
                  </div>
                );
              })
            )}
            {showAddAffirmation ? (
              <div>
                <input
                  style={styles.input}
                  placeholder="새 확언 입력"
                  value={newAffirmation}
                  onChange={function(e) { setNewAffirmation(e.target.value); }}
                />
                <div style={styles.btnRow}>
                  <button style={Object.assign({}, styles.saveBtn, { flex: 1 })} onClick={handleAddAffirmation}>추가</button>
                  <button style={styles.cancelBtn} onClick={function() { setShowAddAffirmation(false); }}>취소</button>
                </div>
              </div>
            ) : (
              <button style={styles.addBtn} onClick={function() { setShowAddAffirmation(true); }}>+ 확언 추가</button>
            )}
            <p style={styles.label}>📰 오늘의 뉴스</p>
            <NewsSection sectionKey="morning" newsOpinions={newsOpinions} setNewsOpinions={setNewsOpinions} onSaveOpinion={handleSaveNewsOpinion} />
          </div>
        ) : null}
      </div>

      <div style={styles.card}>
        <button style={styles.sectionHeader} onClick={function() { setOpenSection(function(p) { return p === 'lunch' ? null : 'lunch'; }); }}>
          <span style={styles.sectionTitle}>☀️ 점심</span>
          <span>{openSection === 'lunch' ? '▲' : '▼'}</span>
        </button>
        {openSection === 'lunch' ? (
          <div style={styles.sectionBody}>
            <textarea
              style={styles.textarea}
              placeholder="점심 메모를 자유롭게 남겨요"
              value={lunch}
              onChange={function(e) { setLunch(e.target.value); }}
              onBlur={function() { saveToFirestore('lunch', { memo: lunch }); }}
            />
            <NewsSection sectionKey="lunch" newsOpinions={newsOpinions} setNewsOpinions={setNewsOpinions} onSaveOpinion={handleSaveNewsOpinion} />
          </div>
        ) : null}
      </div>

      <div style={styles.card}>
        <button style={styles.sectionHeader} onClick={function() { setOpenSection(function(p) { return p === 'evening' ? null : 'evening'; }); }}>
          <span style={styles.sectionTitle}>🌆 저녁</span>
          <span>{openSection === 'evening' ? '▲' : '▼'}</span>
        </button>
        {openSection === 'evening' ? (
          <div style={styles.sectionBody}>
            <textarea
              style={styles.textarea}
              placeholder="저녁 메모를 자유롭게 남겨요"
              value={evening}
              onChange={function(e) { setEvening(e.target.value); }}
              onBlur={function() { saveToFirestore('evening', { memo: evening }); }}
            />
            <NewsSection sectionKey="evening" newsOpinions={newsOpinions} setNewsOpinions={setNewsOpinions} onSaveOpinion={handleSaveNewsOpinion} />
          </div>
        ) : null}
      </div>

      <div style={styles.card}>
        <button style={styles.sectionHeader} onClick={function() { setOpenSection(function(p) { return p === 'night' ? null : 'night'; }); }}>
          <span style={styles.sectionTitle}>🌙 자기 전</span>
          <span>{openSection === 'night' ? '▲' : '▼'}</span>
        </button>
        {openSection === 'night' ? (
          <div style={styles.sectionBody}>
            <p style={styles.label}>오늘 하루 일기</p>
            <textarea
              style={Object.assign({}, styles.textarea, { minHeight: 120 })}
              placeholder="오늘 하루를 자유롭게 기록해요"
              value={diary}
              onChange={function(e) { setDiary(e.target.value); }}
            />
            <p style={styles.label}>감사일기</p>
            {gratitude.map(function(g, i) {
              return (
                <input
                  key={i}
                  style={styles.input}
                  placeholder={'감사한 것 ' + (i + 1)}
                  value={g}
                  onChange={function(e) { updateGratitude(i, e.target.value); }}
                />
              );
            })}
            <button style={styles.saveBtn} onClick={handleSaveNight} disabled={saving}>
              {saving ? '저장 중...' : saved ? '저장됐어요 ✓' : '저장하기'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: 20, paddingBottom: 40 },
  header: { padding: '20px 0 12px' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 700, margin: 0 },
  date: { color: '#aaa', fontSize: 14, marginTop: 4 },
  toggleBtn: {
    padding: '6px 14px',
    background: '#fff3f0',
    color: '#ff7043',
    border: 'none',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  card: {
    background: 'white',
    borderRadius: 16,
    marginBottom: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  sectionHeader: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
  },
  staticHeader: { padding: '16px 20px 0' },
  sectionTitle: { fontSize: 16, fontWeight: 600 },
  sectionBody: { padding: '4px 20px 20px' },
  label: { fontSize: 14, fontWeight: 600, color: '#555', margin: '16px 0 8px' },
  textarea: {
    width: '100%',
    minHeight: 80,
    padding: 12,
    border: '1px solid #f0f0f0',
    borderRadius: 12,
    fontSize: 14,
    resize: 'none',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    lineHeight: 1.6,
  },
  input: {
    width: '100%',
    padding: 12,
    border: '1px solid #f0f0f0',
    borderRadius: 12,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 8,
    fontFamily: 'inherit',
  },
  saveBtn: {
    width: '100%',
    padding: 14,
    background: '#ff7043',
    color: 'white',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    padding: 12,
    background: '#f5f5f5',
    color: '#888',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    cursor: 'pointer',
    marginLeft: 8,
  },
  addBtn: {
    width: '100%',
    padding: 12,
    background: '#fff3f0',
    color: '#ff7043',
    border: '1px dashed #ff7043',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
  },
  btnRow: { display: 'flex', gap: 8 },
  affirmationCard: {
    background: '#fafaf8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  affirmationTitle: { fontSize: 13, fontWeight: 600, color: '#555', margin: '0 0 6px' },
  yesterdayText: { fontSize: 12, color: '#bbb', margin: '0 0 8px', fontStyle: 'italic' },
  newsLoadBtn: {
    width: '100%',
    padding: 12,
    background: '#f5f5f5',
    color: '#555',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    cursor: 'pointer',
    marginTop: 4,
  },
  newsCard: {
    background: '#fafaf8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  newsTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#333',
    textDecoration: 'none',
    display: 'block',
    marginBottom: 4,
    lineHeight: 1.5,
  },
  newsSource: { fontSize: 11, color: '#aaa', margin: '0 0 8px' },
  refreshBtn: {
    width: '100%',
    padding: 10,
    background: '#f5f5f5',
    color: '#888',
    border: 'none',
    borderRadius: 12,
    fontSize: 13,
    cursor: 'pointer',
  },
  emptyCard: {
    background: 'white',
    borderRadius: 16,
    padding: 40,
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  emptyText: { color: '#aaa', fontSize: 14 },
  emptySmall: { color: '#bbb', fontSize: 13, textAlign: 'center', padding: '8px 0' },
  recordText: { fontSize: 14, color: '#333', lineHeight: 1.6, margin: '8px 0' },
  gratitudeItem: { fontSize: 14, color: '#333', margin: '4px 0' },
};
