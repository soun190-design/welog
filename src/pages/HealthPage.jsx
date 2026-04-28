export default function HealthPage() {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>건강 🏃</h2>
      </div>
      <div style={styles.sections}>
        <div style={styles.section}>😊 오늘의 컨디션</div>
        <div style={styles.section}>🍽️ 식단</div>
        <div style={styles.section}>💪 운동</div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: 20 },
  header: { padding: '20px 0' },
  title: { fontSize: 22, fontWeight: 700, margin: 0 },
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
