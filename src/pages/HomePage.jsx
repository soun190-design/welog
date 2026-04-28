export default function HomePage() {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>안녕, Welog 💑</h2>
        <p style={styles.sub}>오늘도 함께해요</p>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: 20 },
  header: {
    padding: '40px 0 20px',
    textAlign: 'center',
  },
  title: { fontSize: 24, fontWeight: 700, margin: 0 },
  sub: { color: '#aaa', marginTop: 8 },
};
