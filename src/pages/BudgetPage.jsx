export default function BudgetPage() {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>가계부 💰</h2>
      </div>
      <div style={styles.sections}>
        <div style={styles.section}>📊 이번달 요약</div>
        <div style={styles.section}>💵 수입</div>
        <div style={styles.section}>📌 고정비</div>
        <div style={styles.section}>💸 변동지출</div>
        <div style={styles.section}>💳 카드 관리</div>
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
