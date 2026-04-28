import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

export default function AffirmationTimeline({ onClose }) {
  const { user } = useAuth();
  const [affirmations, setAffirmations] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(function() {
    if (!user) return;
    var load = async function() {
      var ref = collection(db, 'users', user.uid, 'affirmations');
      var q = query(ref, orderBy('createdAt', 'asc'));
      var snap = await getDocs(q);
      var list = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
      setAffirmations(list);
      if (list.length > 0) setSelected(list[0].id);
    };
    load();
  }, [user]);

  var selectedAffirmation = affirmations.find(function(a) { return a.id === selected; });
  var history = (selectedAffirmation && selectedAffirmation.history) || [];
  var sortedHistory = history.slice().sort(function(a, b) { return a.date > b.date ? 1 : -1; });

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>확언 타임라인 📈</h3>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* 확언 선택 */}
        <div style={styles.affirmationTabs}>
          {affirmations.map(function(a) {
            return (
              <button
                key={a.id}
                style={selected === a.id ? styles.tabActive : styles.tabBtn}
                onClick={function() { setSelected(a.id); }}
              >
                {a.isGoal ? '🎯 ' : '💬 '}{a.title}
              </button>
            );
          })}
        </div>

        {/* 타임라인 */}
        {sortedHistory.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyText}>아직 기록된 확언이 없어요</p>
            <p style={styles.emptySubText}>매일 아침 확언을 작성하면 여기에 쌓여요</p>
          </div>
        ) : (
          <div style={styles.timeline}>
            {sortedHistory.map(function(item, i) {
              var isLatest = i === sortedHistory.length - 1;
              var isFirst = i === 0;
              return (
                <div key={i} style={styles.timelineItem}>
                  <div style={styles.timelineLeft}>
                    <div style={Object.assign({}, styles.timelineDot, isLatest ? styles.timelineDotLatest : {})} />
                    {i < sortedHistory.length - 1 ? <div style={styles.timelineLine} /> : null}
                  </div>
                  <div style={Object.assign({}, styles.timelineContent, isLatest ? styles.timelineContentLatest : {})}>
                    <p style={styles.timelineDate}>{item.date}</p>
                    <p style={styles.timelineText}>{item.text}</p>
                    {isFirst ? <span style={styles.badge}>시작</span> : null}
                    {isLatest && sortedHistory.length > 1 ? <span style={Object.assign({}, styles.badge, styles.badgeLatest)}>현재</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 성장 요약 */}
        {sortedHistory.length > 1 ? (
          <div style={styles.summaryCard}>
            <p style={styles.summaryLabel}>📊 성장 기록</p>
            <p style={styles.summaryText}>
              {sortedHistory[0].date} 부터 {sortedHistory[sortedHistory.length - 1].date} 까지
            </p>
            <p style={styles.summaryCount}>총 {sortedHistory.length}번 발전했어요 🌱</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', zIndex: 300,
    display: 'flex', alignItems: 'flex-end',
  },
  container: {
    background: 'white', borderRadius: '20px 20px 0 0',
    padding: 20, width: '100%', maxHeight: '85vh', overflowY: 'auto',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 700, margin: 0 },
  closeBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#aaa' },
  affirmationTabs: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 },
  tabBtn: {
    padding: '10px 14px', border: '1px solid #f0f0f0',
    borderRadius: 12, background: 'white', fontSize: 13,
    cursor: 'pointer', textAlign: 'left', color: '#888',
  },
  tabActive: {
    padding: '10px 14px', border: '2px solid #ff7043',
    borderRadius: 12, background: '#fff3f0', fontSize: 13,
    cursor: 'pointer', textAlign: 'left', color: '#ff7043', fontWeight: 600,
  },
  timeline: { position: 'relative' },
  timelineItem: { display: 'flex', gap: 12, marginBottom: 4 },
  timelineLeft: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 },
  timelineDot: {
    width: 12, height: 12, borderRadius: 6,
    background: '#e0e0e0', flexShrink: 0, marginTop: 4,
  },
  timelineDotLatest: { background: '#ff7043', width: 14, height: 14, borderRadius: 7 },
  timelineLine: { width: 2, flex: 1, background: '#f0f0f0', margin: '4px 0' },
  timelineContent: {
    flex: 1, background: '#fafaf8', borderRadius: 12,
    padding: 12, marginBottom: 8,
  },
  timelineContentLatest: { background: '#fff3f0', border: '1px solid #ffccbc' },
  timelineDate: { fontSize: 11, color: '#aaa', margin: '0 0 4px' },
  timelineText: { fontSize: 14, color: '#333', margin: 0, lineHeight: 1.5, fontWeight: 500 },
  badge: {
    display: 'inline-block', fontSize: 10, color: '#aaa',
    background: '#f0f0f0', padding: '2px 8px', borderRadius: 10, marginTop: 6,
  },
  badgeLatest: { color: '#ff7043', background: '#ffe0d6' },
  empty: { textAlign: 'center', padding: '40px 0' },
  emptyText: { fontSize: 15, color: '#888', margin: '0 0 8px' },
  emptySubText: { fontSize: 13, color: '#bbb', margin: 0 },
  summaryCard: {
    background: '#f0f7ff', borderRadius: 12, padding: 16, marginTop: 12,
  },
  summaryLabel: { fontSize: 13, fontWeight: 600, color: '#555', margin: '0 0 8px' },
  summaryText: { fontSize: 13, color: '#666', margin: '0 0 4px' },
  summaryCount: { fontSize: 15, fontWeight: 700, color: '#2196f3', margin: 0 },
};
