export default function SchedulePage() {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>일정 📅</h2>
      </div>
      <div style={styles.emptyCard}>
        <p style={styles.emptyText}>일정 기능 준비중이에요</p>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: 20, paddingBottom: 40 },
  header: { padding: '20px 0 12px' },
  title: { fontSize: 22, fontWeight: 700, margin: 0 },
  emptyCard: {
    background: 'white', borderRadius: 16, padding: 40,
    textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  emptyText: { color: '#aaa', fontSize: 14 },
};
