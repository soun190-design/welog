import { useState } from 'react';
import BudgetPage from './BudgetPage';
import SchedulePage from './SchedulePage';

export default function SharedPage() {
  const [activeTab, setActiveTab] = useState('budget');

  return (
    <div>
      <div style={styles.tabRow}>
        <button
          style={activeTab === 'budget' ? styles.tabActive : styles.tabBtn}
          onClick={function() { setActiveTab('budget'); }}
        >
          💰 가계부
        </button>
        <button
          style={activeTab === 'schedule' ? styles.tabActive : styles.tabBtn}
          onClick={function() { setActiveTab('schedule'); }}
        >
          📅 일정
        </button>
      </div>
      {activeTab === 'budget' ? <BudgetPage /> : <SchedulePage />}
    </div>
  );
}

const styles = {
  tabRow: {
    display: 'flex',
    background: '#EDE8E3',
    borderRadius: 25,
    margin: '12px 24px',
    padding: 4,
    position: 'sticky',
    top: 8,
    zIndex: 10,
  },
  tabBtn: {
    flex: 1, padding: '10px 16px',
    border: 'none', background: 'none',
    fontSize: 14, cursor: 'pointer', color: '#9E9083', fontWeight: 600,
    borderRadius: 22,
  },
  tabActive: {
    flex: 1, padding: '10px 16px',
    border: 'none',
    fontSize: 14, cursor: 'pointer',
    color: '#2D2D2D', fontWeight: 700,
    borderRadius: 22,
    background: '#FDFAF7',
    boxShadow: '0 2px 6px rgba(180,150,130,0.15)',
  },
};
