import { useState } from 'react';

const sections = [
  { id: 'morning', icon: '🌅', label: '아침' },
  { id: 'lunch',   icon: '☀️', label: '점심' },
  { id: 'evening', icon: '🌆', label: '저녁' },
  { id: 'night',   icon: '🌙', label: '자기 전' },
];

export default function RecordPage() {
  const [openSection, setOpenSection] = useState('morning');
  const [lunch, setLunch] = useState('');
  const [evening, setEvening] = useState('');
  const [diary, setDiary] = useState('');
  const [gratitude, setGratitude] = useState(['', '', '']);

  const toggleSection = (id) => {
    setOpenSection(prev => prev === id ? null : id);
  };

  const updateGratitude = (index, value) => {
    const updated = [...gratitude];
    updated[index] = value;
    setGratitude(updated);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>오늘의 기록 📓</h2>
        <p style={styles.date}>{new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</p>
      </div>

      {sections.map(section => (
        <div key={section.id} style={styles.card}>
          <button
            style={styles.sectionHeader}
            onClick={() => toggleSection(section.id)}
          >
            <span style={styles.sectionTitle}>
              {section.icon} {section.label}
            </span>
            <span>{openSection === section.id ? '▲' : '▼'}</span>
          </button>

          {openSection === section.id && (
            <div style={styles.sectionBody}>

              {section.id === 'morning' && (
                <div>
                  <p style={styles.comingSoon}>✏️ 확언 기능 준비중</p>
                  <p style={styles.comingSoon}>📰 뉴스 기능 준비중</p>
                </div>
              )}

              {section.id === 'lunch' && (
                <div>
                  <textarea
                    style={styles.textarea}
                    placeholder="점심 메모를 자유롭게 남겨요"
                    value={lunch}
                    onChange={e => setLunch(e.target.value)}
                  />
                  <p style={styles.comingSoon}>📰 뉴스 불러오기</p>
                </div>
              )}

              {section.id === 'evening' && (
                <div>
                  <textarea
                    style={styles.textarea}
                    placeholder="저녁 메모를 자유롭게 남겨요"
                    value={evening}
                    onChange={e => setEvening(e.target.value)}
                  />
                  <p style={styles.comingSoon}>📰 뉴스 불러오기</p>
                </div>
              )}

              {section.id === 'night' && (
                <div>
                  <p style={styles.label}>오늘 하루 일기</p>
                  <textarea
                    style={{ ...styles.textarea, minHeight: 120 }}
                    placeholder="오늘 하루를 자유롭게 기록해요"
                    value={diary}
                    onChange={e => setDiary(e.target.value)}
                  />
                  <p style={styles.label}>감사일기</p>
                  {gratitude.map((g, i) => (
                    <input
                      key={i}
                      style={styles.input}
                      placeholder={`감사한 것 ${i + 1}`}
                      value={g}
                      onChange={e => updateGratitude(i, e.target.value)}
                    />
                  ))}
                  <button style={styles.saveBtn}>저장하기</button>
                </div>
              )}

            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: { padding: 20 },
  header: { padding: '20px 0 12px' },
  title: { fontSize: 22, fontWeight: 700, margin: 0 },
  date: { color: '#aaa', fontSize: 14, marginTop: 4 },
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
  sectionTitle: { fontSize: 16, fontWeight: 600 },
  sectionBody: { padding: '0 20px 20px' },
  label: { fontSize: 14, fontWeight: 600, color: '#555', margin: '12px 0 8px' },
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
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #f0f0f0',
    borderRadius: 12,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 8,
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
  comingSoon: {
    color: '#bbb',
    fontSize: 14,
    textAlign: 'center',
    padding: '12px 0',
  },
};
