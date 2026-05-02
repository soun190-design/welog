import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CoupleProvider, useCouple } from './contexts/CoupleContext';
import LoginPage from './pages/LoginPage';
import CoupleSetupPage from './pages/CoupleSetupPage';
import HomePage from './pages/HomePage';
import RecordPage from './pages/RecordPage';
import SharedPage from './pages/SharedPage';
import ContentPage from './pages/ContentPage';
import SettingsPage from './pages/SettingsPage';
import { useState, useEffect, useCallback } from 'react';
import { Home, NotebookPen, Wallet, Film, SlidersHorizontal, Bell } from 'lucide-react';
import { getUnreadCount } from './firebase/notifications';

function AppRouter() {
  const { user, userDoc, loading: authLoading } = useAuth();
  const { couple, isConnected, loading: coupleLoading } = useCouple();
  const [activeTab, setActiveTab] = useState('home');
  const [unreadCount, setUnreadCount] = useState(0);

  var loadUnread = useCallback(async function() {
    if (!user || !couple) return;
    var count = await getUnreadCount(couple.id, user.uid);
    setUnreadCount(count);
  }, [user, couple]);

  useEffect(function() {
    loadUnread();
    var interval = setInterval(loadUnread, 30000);
    return function() { clearInterval(interval); };
  }, [loadUnread]);

  if (authLoading || coupleLoading) return <LoadingScreen />;
  if (!user) return <LoginPage />;
  if (!userDoc?.coupleId || !isConnected) return <CoupleSetupPage />;

  const tabs = [
    { id: 'home',     label: '홈',    icon: '🏠' },
    { id: 'record',   label: '기록',  icon: '📓' },
    { id: 'shared',   label: '공동관리', icon: '💰' },
    { id: 'content',  label: '컨텐츠', icon: '📚' },
    { id: 'settings', label: '설정',  icon: '⚙️' },
  ];

  const renderPage = () => {
    switch (activeTab) {
      case 'home':     return <HomePage onNotificationRead={loadUnread} />;
      case 'record':   return <RecordPage />;
      case 'shared':   return <SharedPage />;
      case 'content':  return <ContentPage />;
      case 'settings': return <SettingsPage onNotificationRead={loadUnread} />;
      default:         return <HomePage />;
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.welogHeader}>
        <span style={styles.welogLogo}>♥ Welog</span>
        <button style={styles.headerBell} onClick={function() { setActiveTab('settings'); }}>
          <Bell size={20} strokeWidth={1.6} color={unreadCount > 0 ? '#FF6B6B' : '#9E9083'} />
          {unreadCount > 0 ? (
            <span style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
          ) : null}
        </button>
      </header>
      <div style={styles.content}>
        {renderPage()}
      </div>
      <nav style={styles.tabBar}>
        {tabs.map(function(tab) {
          var isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              style={Object.assign({}, styles.tabBtn, isActive ? styles.tabBtnActive : {})}
              onClick={function() { setActiveTab(tab.id); }}
            >
              <div style={Object.assign({}, styles.tabIconWrap, isActive ? styles.tabIconWrapActive : {})}>
                {tab.id === 'home' ? <Home size={20} strokeWidth={1.6} />
                : tab.id === 'record' ? <NotebookPen size={20} strokeWidth={1.6} />
                : tab.id === 'shared' ? <Wallet size={20} strokeWidth={1.6} />
                : tab.id === 'content' ? <Film size={20} strokeWidth={1.6} />
                : <SlidersHorizontal size={20} strokeWidth={1.6} />
                }
                {tab.id === 'settings' && unreadCount > 0 ? (
                  <span style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                ) : null}
              </div>
              <span style={styles.tabLabel}>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      fontSize: 32,
    }}>
      💑
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 480, margin: '0 auto', minHeight: '100vh',
    display: 'flex', flexDirection: 'column', background: '#F5F0EB',
  },
  welogHeader: {
    background: '#FDFAF7', padding: '14px 24px',
    borderBottom: '1px solid #EDE8E3',
    position: 'sticky', top: 0, zIndex: 50,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  welogLogo: {
    fontSize: 18, fontWeight: 800, color: '#FF6B6B', letterSpacing: -0.5,
  },
  headerBell: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 20, padding: 4, color: '#9E9083', position: 'relative',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    paddingBottom: 70,
  },
  tabBar: {
    position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: 480, display: 'flex', background: '#FDFAF7',
    borderTop: '1px solid #EDE8E3', boxShadow: '0 -8px 30px rgba(180,150,130,0.12)',
    zIndex: 100, height: 64, paddingBottom: 4,
  },
  tabBtn: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '6px 0', border: 'none',
    background: 'none', cursor: 'pointer', gap: 3,
    color: '#C4BAB1', transition: 'color 0.15s',
  },
  tabBtnActive: { color: '#FF6B6B' },
  tabIconWrap: {
    position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 28, borderRadius: 14,
  },
  tabIconWrapActive: {
    background: 'linear-gradient(135deg, #FFF0EE, #FFE4E0)',
  },
  badge: {
    position: 'absolute', top: -4, right: -8,
    background: '#FF6B6B', color: 'white',
    fontSize: 9, fontWeight: 700,
    padding: '1px 4px', borderRadius: 8, minWidth: 14,
    textAlign: 'center',
  },
  tabLabel: { fontSize: 10, fontWeight: 600 },
};

export default function App() {
  return (
    <AuthProvider>
      <CoupleProvider>
        <AppRouter />
      </CoupleProvider>
    </AuthProvider>
  );
}
