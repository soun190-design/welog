export default function ContentPage() {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>컨텐츠 📚</h2>
        <div style={styles.tabs}>
          <button style={styles.tabActive}>전체</button>
          <button style={styles.tab}>책</button>
          <button style={styles.tab}>영화</button>
        </div>
      </div>
      <div style={styles.sections}>
        <div style={styles.section}>🎯 위시리스트</div>
        <div style={styles.section}>▶️ 진행중</div>
        <div style={styles.section}>✅ 완료</div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: 20 },
  header: { padding: '20px 0' },
  title: { fontSize: 22, fontWeight: 700, margin: '0 0 16px' },
  tabs: { display: 'flex', gap: 8 },
  tab: {
    padding: '6px 16px',
    border: '1px solid #e0e0e0',
    borderRadius: 20,
    background: 'white',
    fontSize: 14,
    cursor: 'pointer',
  },
  tabActive: {
    padding: '6px 16px',
    border: 'none',
    borderRadius: 20,
    background: '#ff7043',
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  sections: { display: 'flex', flexDirection: 'column', gap: 12 },
  section: {
    background: 'white',
    borderRadius: 16,
    padding: '20px',
    fontSize: 16,
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
};
