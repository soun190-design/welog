import { useState, useEffect, useRef } from 'react';
import { BookMarked, Camera, Plus, ChevronLeft, Hash, MessageSquare, Loader2, BookOpen } from 'lucide-react';
import {
  collection, addDoc, doc, getDoc, setDoc, onSnapshot,
  query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

export default function BookNotes({ content, coupleId, user, partnerUid, onBack }) {
  var contentId = content.id;
  var uid = user.uid;

  var [activeTab, setActiveTab] = useState('my');
  var [notes, setNotes] = useState([]);
  var [partnerNotes, setPartnerNotes] = useState([]);
  var [totalPages, setTotalPages] = useState('');
  var [currentPage, setCurrentPage] = useState('');
  var [showAddSheet, setShowAddSheet] = useState(false);
  var [page, setPage] = useState('');
  var [sentence, setSentence] = useState('');
  var [thought, setThought] = useState('');
  var [ocrLoading, setOcrLoading] = useState(false);
  var [saving, setSaving] = useState(false);
  var fileInputRef = useRef(null);

  useEffect(function() {
    if (!coupleId || !contentId) return;
    var ref = doc(db, 'couples', coupleId, 'bookNotes', contentId);
    getDoc(ref).then(function(snap) {
      if (snap.exists()) {
        var data = snap.data();
        if (data.totalPages) setTotalPages(String(data.totalPages));
        if (data['currentPage_' + uid]) setCurrentPage(String(data['currentPage_' + uid]));
      }
    }).catch(console.error);
  }, [coupleId, contentId, uid]);

  useEffect(function() {
    if (!coupleId || !contentId) return;
    var notesRef = collection(db, 'couples', coupleId, 'bookNotes', contentId, 'notes');
    var q = query(notesRef, orderBy('page', 'asc'));
    var unsub = onSnapshot(q, function(snap) {
      var all = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
      setNotes(all.filter(function(n) { return n.authorId === uid; }));
      setPartnerNotes(all.filter(function(n) { return n.authorId !== uid; }));
    });
    return unsub;
  }, [coupleId, contentId, uid]);

  var handleSaveProgress = async function() {
    if (!coupleId || !contentId) return;
    var update = {};
    if (totalPages) update.totalPages = Number(totalPages);
    if (currentPage) update['currentPage_' + uid] = Number(currentPage);
    if (Object.keys(update).length === 0) return;
    try {
      await setDoc(doc(db, 'couples', coupleId, 'bookNotes', contentId), update, { merge: true });
    } catch (e) { console.error(e); }
  };

  var handleOcr = async function(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    setOcrLoading(true);
    try {
      var base64 = await new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function(ev) { resolve(ev.target.result.split(',')[1]); };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      var res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });
      var data = await res.json();
      if (data.text) setSentence(data.text);
      else alert(data.error || '텍스트를 인식하지 못했어요');
    } catch (err) {
      console.error(err);
      alert('OCR 처리 중 오류가 발생했어요');
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  var handleSaveNote = async function() {
    if (!coupleId || !contentId || !page || !sentence.trim()) return;
    setSaving(true);
    try {
      var notesRef = collection(db, 'couples', coupleId, 'bookNotes', contentId, 'notes');
      await addDoc(notesRef, {
        page: Number(page),
        sentence: sentence.trim(),
        thought: thought.trim(),
        authorId: uid,
        createdAt: serverTimestamp(),
      });
      setPage('');
      setSentence('');
      setThought('');
      setShowAddSheet(false);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  var progress = (totalPages && currentPage && Number(totalPages) > 0)
    ? Math.min(100, Math.round((Number(currentPage) / Number(totalPages)) * 100))
    : 0;

  var displayNotes = activeTab === 'my' ? notes : partnerNotes;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>
          <ChevronLeft size={20} color="#2D2D2D" strokeWidth={1.5} />
        </button>
        <div style={styles.headerBook}>
          {content.thumbnail ? (
            <img src={content.thumbnail} alt={content.title} style={styles.headerThumb} />
          ) : (
            <div style={styles.headerThumbEmpty}>
              <BookOpen size={24} color="#B0A69D" strokeWidth={1.2} />
            </div>
          )}
          <div style={styles.headerBookInfo}>
            <p style={styles.headerTitle}>{content.title}</p>
            {content.director ? <p style={styles.headerAuthor}>{content.director}</p> : null}
          </div>
        </div>
      </div>

      <div style={styles.progressCard}>
        <div style={styles.progressRow}>
          <div style={styles.progressInputGroup}>
            <span style={styles.progressLabel}>현재 페이지</span>
            <input
              style={styles.progressInput}
              type="number"
              placeholder="0"
              value={currentPage}
              onChange={function(e) { setCurrentPage(e.target.value); }}
              onBlur={handleSaveProgress}
            />
          </div>
          <span style={styles.progressSep}>/</span>
          <div style={styles.progressInputGroup}>
            <span style={styles.progressLabel}>전체 페이지</span>
            <input
              style={styles.progressInput}
              type="number"
              placeholder="0"
              value={totalPages}
              onChange={function(e) { setTotalPages(e.target.value); }}
              onBlur={handleSaveProgress}
            />
          </div>
          <span style={styles.progressPercent}>{progress}%</span>
        </div>
        <div style={styles.progressBarBg}>
          <div style={Object.assign({}, styles.progressBarFill, { width: progress + '%' })} />
        </div>
      </div>

      <div style={styles.tabRow}>
        <button
          style={activeTab === 'my' ? styles.tabActive : styles.tab}
          onClick={function() { setActiveTab('my'); }}
        >내 기록</button>
        <button
          style={activeTab === 'partner' ? styles.tabActive : styles.tab}
          onClick={function() { setActiveTab('partner'); }}
        >파트너 기록</button>
      </div>

      <div style={styles.noteList}>
        {displayNotes.length === 0 ? (
          <div style={styles.emptyNote}>
            <div style={styles.emptyNoteIcon}>
              <BookMarked size={28} color="#9FA8DA" strokeWidth={1.5} />
            </div>
            <p style={styles.emptyNoteText}>아직 기록이 없어요</p>
          </div>
        ) : displayNotes.map(function(note) {
          var isPartner = note.authorId !== uid;
          var dateStr = '';
          if (note.createdAt) {
            var d = note.createdAt.toDate ? note.createdAt.toDate() : new Date(note.createdAt);
            dateStr = d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
          }
          return (
            <div key={note.id} style={Object.assign({}, styles.noteCard, isPartner ? styles.noteCardPartner : {})}>
              <div style={styles.noteTop}>
                <span style={styles.notePage}>p.{note.page}</span>
                <span style={styles.noteDate}>{dateStr}</span>
              </div>
              {note.sentence ? (
                <p style={Object.assign({}, styles.noteSentence, isPartner ? styles.noteSentencePartner : {})}>
                  "{note.sentence}"
                </p>
              ) : null}
              {note.thought ? (
                <p style={styles.noteThought}>{note.thought}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      {activeTab === 'my' ? (
        <button style={styles.fab} onClick={function() { setShowAddSheet(true); }}>
          <Plus size={22} color="white" strokeWidth={1.5} />
        </button>
      ) : null}

      {showAddSheet ? (
        <div
          style={styles.sheetOverlay}
          onClick={function(e) { if (e.target === e.currentTarget) setShowAddSheet(false); }}
        >
          <div style={styles.sheet}>
            <div style={styles.sheetHeader}>
              <span style={styles.sheetTitle}>기록 추가</span>
              <button style={styles.closeBtn} onClick={function() { setShowAddSheet(false); }}>✕</button>
            </div>

            <div style={styles.inputRow}>
              <Hash size={16} color="#9E9083" strokeWidth={1.5} />
              <input
                style={styles.fieldInput}
                type="number"
                placeholder="페이지 번호"
                value={page}
                onChange={function(e) { setPage(e.target.value); }}
              />
            </div>

            <div style={styles.sentenceGroup}>
              <div style={styles.sentenceInputRow}>
                <BookOpen size={16} color="#9E9083" strokeWidth={1.5} />
                <input
                  style={styles.fieldInput}
                  placeholder="기억하고 싶은 문장"
                  value={sentence}
                  onChange={function(e) { setSentence(e.target.value); }}
                />
              </div>
              <button
                style={styles.ocrBtn}
                onClick={function() { fileInputRef.current && fileInputRef.current.click(); }}
                disabled={ocrLoading}
              >
                {ocrLoading
                  ? <Loader2 size={18} color="#0277BD" strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Camera size={18} color="#0277BD" strokeWidth={1.5} />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="camera"
                style={{ display: 'none' }}
                onChange={handleOcr}
              />
            </div>

            <div style={styles.inputRow}>
              <MessageSquare size={16} color="#9E9083" strokeWidth={1.5} />
              <input
                style={styles.fieldInput}
                placeholder="내 생각 (선택)"
                value={thought}
                onChange={function(e) { setThought(e.target.value); }}
              />
            </div>

            <button
              style={Object.assign({}, styles.saveBtn, (!page || !sentence.trim()) ? { opacity: 0.5 } : {})}
              onClick={handleSaveNote}
              disabled={saving || !page || !sentence.trim()}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      ) : null}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

var styles = {
  container: { paddingBottom: 100 },
  header: {
    padding: '16px 20px 12px',
    display: 'flex', alignItems: 'center', gap: 12,
    background: '#FDFAF7',
    boxShadow: '0 1px 4px rgba(180,150,130,0.10)',
    position: 'sticky', top: 0, zIndex: 10,
  },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 },
  headerBook: { display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  headerThumb: { width: 60, height: 90, objectFit: 'cover', borderRadius: 8, flexShrink: 0 },
  headerThumbEmpty: {
    width: 60, height: 90, background: '#EDE8E3', borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerBookInfo: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 15, fontWeight: 700, color: '#2D2D2D', margin: 0, lineHeight: 1.4, wordBreak: 'keep-all' },
  headerAuthor: { fontSize: 12, color: '#9E9083', margin: '4px 0 0' },

  progressCard: {
    margin: 16,
    padding: '16px 18px',
    background: 'linear-gradient(135deg, #FFF9C4, #FFE082)',
    borderRadius: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  progressRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  progressInputGroup: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  progressLabel: { fontSize: 11, color: '#7C6A00', fontWeight: 600 },
  progressInput: {
    width: '100%', padding: '8px 10px',
    border: '1px solid rgba(0,0,0,0.12)', borderRadius: 10,
    fontSize: 16, fontWeight: 700, color: '#2D2D2D',
    background: 'rgba(255,255,255,0.7)', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  },
  progressSep: { fontSize: 20, color: '#9E9083', flexShrink: 0 },
  progressPercent: { fontSize: 20, fontWeight: 800, color: '#FF6B6B', flexShrink: 0, minWidth: 48, textAlign: 'right' },
  progressBarBg: { height: 8, background: 'rgba(255,255,255,0.6)', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', background: '#FF6B6B', borderRadius: 4, transition: 'width 0.3s ease' },

  tabRow: { display: 'flex', padding: '0 16px', marginBottom: 4 },
  tab: {
    flex: 1, padding: '10px', border: 'none', background: 'none',
    fontSize: 14, color: '#9E9083', cursor: 'pointer',
    borderBottom: '2px solid transparent',
  },
  tabActive: {
    flex: 1, padding: '10px', border: 'none', background: 'none',
    fontSize: 14, fontWeight: 700, color: '#FF6B6B', cursor: 'pointer',
    borderBottom: '2px solid #FF6B6B',
  },

  noteList: { padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 12 },
  noteCard: {
    background: '#FDFAF7', borderRadius: 16, padding: 16,
    borderLeft: '3px solid #FF6B6B',
    boxShadow: '0 2px 8px rgba(180,150,130,0.10)',
  },
  noteCardPartner: { borderLeft: '3px solid #42a5f5' },
  noteTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  notePage: { fontSize: 14, fontWeight: 700, color: '#FF6B6B' },
  noteDate: { fontSize: 11, color: '#B0A69D' },
  noteSentence: {
    fontStyle: 'italic',
    borderLeft: '3px solid #FF6B6B',
    paddingLeft: 12,
    color: '#5C5049',
    lineHeight: 1.7,
    margin: '0 0 8px',
    fontSize: 14,
  },
  noteSentencePartner: { borderLeft: '3px solid #42a5f5' },
  noteThought: { fontSize: 13, color: '#7C6F66', lineHeight: 1.6, margin: 0 },

  emptyNote: { padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  emptyNoteIcon: {
    width: 56, height: 56, borderRadius: 28,
    background: 'linear-gradient(135deg, #C5CAE9, #9FA8DA)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  emptyNoteText: { fontSize: 14, color: '#B0A69D', margin: 0 },

  fab: {
    position: 'fixed', right: 20, bottom: 80,
    width: 52, height: 52, borderRadius: 26,
    background: '#FF6B6B', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(255,107,107,0.40)', zIndex: 101,
  },

  sheetOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(45,30,20,0.45)', zIndex: 200,
    display: 'flex', alignItems: 'flex-end',
  },
  sheet: {
    background: '#FDFAF7', borderRadius: '20px 20px 0 0',
    padding: '20px 20px 40px', width: '100%', boxSizing: 'border-box',
  },
  sheetHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: 700, color: '#2D2D2D' },
  closeBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9E9083' },

  inputRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#F5F0EB', borderRadius: 12, padding: '12px 14px', marginBottom: 10,
  },
  fieldInput: {
    flex: 1, border: 'none', background: 'none', outline: 'none',
    fontSize: 14, color: '#2D2D2D', fontFamily: 'inherit',
  },
  sentenceGroup: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  sentenceInputRow: {
    flex: 1, display: 'flex', alignItems: 'center', gap: 10,
    background: '#F5F0EB', borderRadius: 12, padding: '12px 14px',
  },
  ocrBtn: {
    width: 48, height: 48, borderRadius: 12, flexShrink: 0,
    background: 'linear-gradient(135deg, #B3E5FC, #81D4FA)',
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  saveBtn: {
    width: '100%', padding: 14, background: '#FF6B6B', color: 'white',
    border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700,
    cursor: 'pointer', marginTop: 8, fontFamily: 'inherit',
  },
};
