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
    background: 'white',
    borderBottom: '1px solid #f0f0f0',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  tabBtn: {
    flex: 1, padding: '16px',
    border: 'none', background: 'none',
    fontSize: 14, cursor: 'pointer', color: '#aaa', fontWeight: 600,
  },
  tabActive: {
    flex: 1, padding: '16px',
    border: 'none', background: 'none',
    fontSize: 14, cursor: 'pointer',
    color: '#ff7043', fontWeight: 700,
    borderBottom: '2px solid #ff7043',
  },
};
