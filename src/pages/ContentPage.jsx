import { useState, useEffect, useCallback } from 'react';
import { Clapperboard, BookOpen, Plus, BookMarked } from 'lucide-react';
import BookNotes from '../components/BookNotes';
import { useAuth } from '../contexts/AuthContext';
import { useCouple } from '../contexts/CoupleContext';
import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

export default function ContentPage() {
  const { user } = useAuth();
  const { couple } = useCouple();
  const partnerUid = couple && couple.members && couple.members.find(function(m) { return m !== (user && user.uid); });

  const [contents, setContents] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('wish');
  const [reviewFilter, setReviewFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [showSearch, setShowSearch] = useState(false);
  const [searchType, setSearchType] = useState('movie');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showReview, setShowReview] = useState(null);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [showBookNotes, setShowBookNotes] = useState(null);

  var loadContents = useCallback(async function() {
    if (!couple) return;
    try {
      var ref = collection(db, 'couples', couple.id, 'contents');
      var q = query(ref, orderBy('createdAt', 'desc'));
      var snap = await getDocs(q);
      var list = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
      setContents(list);
    } catch (e) { console.error(e); }
  }, [couple]);

  useEffect(function() {
    loadContents();
  }, [loadContents]);

  var handleSearch = async function() {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchResults([]);
    try {
      if (searchType === 'movie') {
        var movieRes = await fetch('/api/movies?query=' + encodeURIComponent(searchQuery));
        var movieData = await movieRes.json();
        var stripTagsMov = function(str) { return str ? str.replace(/<[^>]*>/g, '') : ''; };
        var movieResults = (movieData.items || []).map(function(m) {
          var dir = stripTagsMov(m.director || '').replace(/\|\s*$/, '').replace(/\|/g, ', ');
          return {
            type: 'movie',
            title: stripTagsMov(m.title),
            thumbnail: m.image || null,
            director: dir,
            description: '',
            year: m.pubDate || '',
            apiId: m.link || '',
          };
        });
        setSearchResults(movieResults);
      } else {
        var bookRes = await fetch('/api/books?query=' + encodeURIComponent(searchQuery));
        var bookData = await bookRes.json();
        var bookResults = (bookData.items || []).map(function(b) {
          var stripTags = function(str) { return str ? str.replace(/<[^>]*>/g, '') : ''; };
          return {
            type: 'book',
            title: stripTags(b.title),
            thumbnail: b.image || null,
            director: stripTags(b.author),
            description: stripTags(b.description) || '',
            year: b.pubdate ? b.pubdate.substring(0, 4) : '',
            apiId: b.isbn,
          };
        });
        setSearchResults(bookResults);
      }
    } catch (e) { console.error(e); }
    finally { setSearchLoading(false); }
  };

  var handleAddContent = async function(item) {
    if (!couple || !user) return;
    try {
      var ref = collection(db, 'couples', couple.id, 'contents');
      await addDoc(ref, Object.assign({}, item, {
        status: 'wish',
        addedBy: user.uid,
        reviews: {},
        reviewCount: 0,
        createdAt: serverTimestamp(),
      }));
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
      await loadContents();
    } catch (e) { console.error(e); }
  };

  var handleStatusChange = async function(contentId, newStatus) {
    if (!couple) return;
    try {
      await updateDoc(doc(db, 'couples', couple.id, 'contents', contentId), { status: newStatus });
      await loadContents();
    } catch (e) { console.error(e); }
  };

  var handleSaveReview = async function(contentId) {
    if (!couple || !user || !myRating) return;
    setSaving(true);
    try {
      var ref = doc(db, 'couples', couple.id, 'contents', contentId);
      var content = contents.find(function(c) { return c.id === contentId; });
      var reviews = Object.assign({}, (content && content.reviews) || {});
      reviews[user.uid] = { rating: myRating, comment: myComment, createdAt: new Date().toISOString() };
      var reviewCount = Object.keys(reviews).length;
      await updateDoc(ref, { reviews: reviews, reviewCount: reviewCount });
      setShowReview(null);
      setMyRating(0);
      setMyComment('');
      await loadContents();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  var getFilteredContents = function() {
    return contents.filter(function(c) {
      if (typeFilter !== 'all' && c.type !== typeFilter) return false;
      if (c.status !== statusFilter) return false;
      if (statusFilter === 'done') {
        if (reviewFilter === 'both' && c.reviewCount !== 2) return false;
        if (reviewFilter === 'one' && c.reviewCount !== 1) return false;
      }
      return true;
    }).sort(function(a, b) {
      if (sortBy === 'rating') {
        var aReviews = a.reviews || {};
        var bReviews = b.reviews || {};
        var aMyRating = (aReviews[user.uid] && aReviews[user.uid].rating) || 0;
        var aPartnerRating = (aReviews[partnerUid] && aReviews[partnerUid].rating) || 0;
        var bMyRating = (bReviews[user.uid] && bReviews[user.uid].rating) || 0;
        var bPartnerRating = (bReviews[partnerUid] && bReviews[partnerUid].rating) || 0;
        var aAvg = a.reviewCount === 2 ? (aMyRating + aPartnerRating) / 2 : 0;
        var bAvg = b.reviewCount === 2 ? (bMyRating + bPartnerRating) / 2 : 0;
        return bAvg - aAvg;
      }
      return 0;
    });
  };

  var renderStars = function(rating, onSelect) {
    var stars = [];
    for (var i = 1; i <= 5; i++) {
      var halfVal = i - 0.5;
      var fullVal = i;
      var isFull = rating >= fullVal;
      var isHalf = !isFull && rating >= halfVal;
      stars.push(
        <div key={i} style={styles.starWrap}>
          <span style={styles.starEmpty}>★</span>
          {(isFull || isHalf) ? (
            <span style={Object.assign({}, styles.starFilled, isHalf ? styles.starHalf : {})}>★</span>
          ) : null}
          {onSelect ? (
            <div style={styles.starClickLayer}>
              <button
                style={styles.starHalfBtn}
                onClick={(function(v) { return function() { onSelect(v); }; })(halfVal)}
              />
              <button
                style={styles.starHalfBtn}
                onClick={(function(v) { return function() { onSelect(v); }; })(fullVal)}
              />
            </div>
          ) : null}
        </div>
      );
    }
    return <div style={styles.stars}>{stars}</div>;
  };

  var filtered = getFilteredContents();

  if (showBookNotes) {
    return (
      <BookNotes
        content={showBookNotes}
        coupleId={couple.id}
        user={user}
        partnerUid={partnerUid}
        onBack={function() { setShowBookNotes(null); }}
      />
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerRow}>
          <div>
            <h2 style={styles.title}>콘텐츠</h2>
            <p style={styles.subcopy}>함께 보고 싶은, 나누고 싶은 이야기들</p>
          </div>
          <button style={styles.addBtn} onClick={function() { setShowSearch(true); }}>+ 추가</button>
        </div>
        <div style={styles.guideCard}>
          <span style={styles.guideText}>둘 다 별점을 남기면 점수가 공개돼요 ⭐</span>
        </div>
      </div>

      {showSearch ? (
        <div style={styles.modal}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>컨텐츠 추가</span>
              <button style={styles.closeBtn} onClick={function() { setShowSearch(false); setSearchResults([]); setSearchQuery(''); }}>✕</button>
            </div>
            <div style={styles.typeRow}>
              <button
                style={searchType === 'movie' ? styles.typeActive : styles.typeBtn}
                onClick={function() { setSearchType('movie'); setSearchResults([]); }}
              >🎬 영화</button>
              <button
                style={searchType === 'book' ? styles.typeActive : styles.typeBtn}
                onClick={function() { setSearchType('book'); setSearchResults([]); }}
              >📖 책</button>
            </div>
            <div style={styles.searchRow}>
              <input
                style={styles.searchInput}
                placeholder={searchType === 'movie' ? '영화 제목 검색' : '책 제목 검색'}
                value={searchQuery}
                onChange={function(e) { setSearchQuery(e.target.value); }}
                onKeyDown={function(e) { if (e.key === 'Enter') handleSearch(); }}
              />
              <button style={styles.searchBtn} onClick={handleSearch} disabled={searchLoading}>
                {searchLoading ? '...' : '검색'}
              </button>
            </div>
            <div style={styles.resultList}>
              {searchResults.map(function(item, i) {
                return (
                  <div key={i} style={styles.resultItem}>
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt={item.title} style={styles.thumbnail} />
                    ) : (
                      <div style={styles.noThumb}>{item.type === 'movie' ? '🎬' : '📖'}</div>
                    )}
                    <div style={styles.resultInfo}>
                      <p style={styles.resultTitle}>{item.title}</p>
                      <p style={styles.resultSub}>{item.director}{item.year ? ' · ' + item.year : ''}</p>
                    </div>
                    <button style={styles.wishBtn} onClick={(function(it) { return function() { handleAddContent(it); }; })(item)}>추가</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div style={styles.filterRow}>
        {['all', 'movie', 'book'].map(function(t) {
          return (
            <button
              key={t}
              style={typeFilter === t ? styles.filterActive : styles.filterBtn}
              onClick={function() { setTypeFilter(t); }}
            >
              {t === 'all' ? '전체' : t === 'movie' ? '🎬 영화' : '📖 책'}
            </button>
          );
        })}
      </div>

      <div style={styles.statusRow}>
        {[
          { id: 'wish', label: '🎯 위시' },
          { id: 'ongoing', label: '▶️ 진행중' },
          { id: 'done', label: '✅ 완료' },
        ].map(function(s) {
          return (
            <button
              key={s.id}
              style={statusFilter === s.id ? styles.statusActive : styles.statusBtn}
              onClick={function() { setStatusFilter(s.id); }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {statusFilter === 'done' ? (
        <div style={styles.subFilterRow}>
          <div style={styles.reviewFilterRow}>
            {[
              { id: 'all', label: '전체' },
              { id: 'both', label: '둘 다' },
              { id: 'one', label: '한 명만' },
            ].map(function(r) {
              return (
                <button
                  key={r.id}
                  style={reviewFilter === r.id ? styles.filterActive : styles.filterBtn}
                  onClick={function() { setReviewFilter(r.id); }}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
          <button
            style={styles.sortBtn}
            onClick={function() { setSortBy(function(p) { return p === 'latest' ? 'rating' : 'latest'; }); }}
          >
            {sortBy === 'latest' ? '최신순' : '평점순'}
          </button>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div style={styles.emptyCard}>
          <p style={styles.emptyEmoji}>🎬</p>
          <p style={styles.emptyTitle}>아직 추가된 콘텐츠가 없어요</p>
          <p style={styles.emptyDesc}>함께 보고 싶은 영화나 책을 추가해봐요</p>
          <button style={styles.emptyAddBtn} onClick={function() { setShowSearch(true); }}>+ 추가하기</button>
        </div>
      ) : (
        <div>
          <div style={styles.gridContainer}>
            {filtered.map(function(content) {
              var myReview = (content.reviews && content.reviews[user.uid]) || null;
              var partnerReview = (content.reviews && partnerUid && content.reviews[partnerUid]) || null;
              var bothDone = content.reviewCount === 2;
              return (
                <div key={content.id} style={styles.gridCard}>
                  <div style={styles.gridThumbWrap}>
                    {content.thumbnail ? (
                      <img src={content.thumbnail} alt={content.title} style={styles.gridThumb} />
                    ) : (
                      <div style={styles.gridNoThumb}>
                    {content.type === 'movie'
                      ? <Clapperboard size={36} color="#B0A69D" strokeWidth={1.2} />
                      : <BookOpen size={36} color="#B0A69D" strokeWidth={1.2} />}
                  </div>
                    )}
                    <span style={content.type === 'movie' ? styles.typeBadgeMovie : styles.typeBadgeBook}>
                      {content.type === 'movie' ? 'MOVIE' : 'BOOK'}
                    </span>
                  </div>
                  <div style={styles.gridBody}>
                    <p style={styles.gridTitle}>{content.title}</p>
                    {content.year ? <p style={styles.gridSub}>{content.year}</p> : null}
                    <div style={styles.statusBtnRow}>
                      {content.status !== 'ongoing' ? (
                        <button style={styles.smallBtn} onClick={(function(id) { return function() { handleStatusChange(id, 'ongoing'); }; })(content.id)}>
                          {content.status === 'wish' ? '▶ 시작' : '↩ 진행중'}
                        </button>
                      ) : null}
                      {content.status !== 'done' ? (
                        <button style={styles.smallBtn} onClick={(function(id) { return function() { handleStatusChange(id, 'done'); }; })(content.id)}>✅</button>
                      ) : null}
                    </div>
                    {content.type === 'book' && (content.status === 'ongoing' || content.status === 'done') ? (
                      <button
                        style={styles.bookNoteBtn}
                        onClick={(function(c) { return function() { setShowBookNotes(c); }; })(content)}
                      >
                        <div style={styles.bookNoteBtnIcon}>
                          <BookMarked size={16} color="#3949AB" strokeWidth={1.5} />
                        </div>
                        <span style={styles.bookNoteBtnText}>독서 기록</span>
                      </button>
                    ) : null}
                    {content.status === 'done' ? (
                      <div style={styles.ratingArea}>
                        <div style={styles.ratingRow}>
                          <span style={styles.ratingLabel}>나</span>
                          {myReview ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={styles.ratingValue}>★ {myReview.rating}</span>
                              <button style={styles.editBtn}
                                onClick={(function(id, rev) { return function() { setShowReview(id); setMyRating(rev.rating); setMyComment(rev.comment || ''); }; })(content.id, myReview)}
                              >수정</button>
                            </div>
                          ) : (
                            <button style={styles.writeBtn}
                              onClick={(function(id) { return function() { setShowReview(id); setMyRating(0); setMyComment(''); }; })(content.id)}
                            >평가</button>
                          )}
                        </div>
                        <div style={styles.ratingRow}>
                          <span style={styles.ratingLabel}>파트너</span>
                          {bothDone ? (
                            <span style={styles.ratingValue}>★ {partnerReview && partnerReview.rating}</span>
                          ) : (
                            <span style={styles.blindText}>작성 전</span>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {showReview === content.id ? (
                    <div style={styles.reviewBox}>
                      <p style={styles.reviewLabel}>별점 선택</p>
                      {renderStars(myRating, setMyRating)}
                      <p style={styles.ratingDisplay}>
                        {myRating > 0 ? '★ ' + myRating + ' / 5' : '별점을 선택해주세요'}
                      </p>
                      <input
                        style={styles.commentInput}
                        placeholder="한줄평 (선택)"
                        value={myComment}
                        onChange={function(e) { setMyComment(e.target.value); }}
                      />
                      <div style={styles.reviewBtnRow}>
                        <button style={styles.cancelReviewBtn} onClick={function() { setShowReview(null); }}>취소</button>
                        <button
                          style={styles.saveReviewBtn}
                          onClick={(function(id) { return function() { handleSaveReview(id); }; })(content.id)}
                          disabled={saving || !myRating}
                        >
                          {saving ? '저장중...' : '저장'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
            <button style={styles.gridAddCard} onClick={function() { setShowSearch(true); }}>
              <div style={styles.gridAddIcon}><Plus size={36} strokeWidth={1.5} color="#C4BAB1" /></div>
              <span style={styles.gridAddText}>추가하기</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: 20, paddingBottom: 40 },
  header: { padding: '20px 0 4px' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 32, fontWeight: 800, margin: 0, color: '#2D2D2D', letterSpacing: -0.5 },
  subcopy: { fontSize: 13, color: '#B0A69D', margin: '4px 0 0', fontWeight: 400 },
  guideCard: {
    background: '#FFF8F0', border: '1px solid #FFE0CC',
    borderRadius: 12, padding: '10px 14px', margin: '12px 0',
  },
  guideText: { fontSize: 13, color: '#FF6B6B', fontWeight: 600 },
  addBtn: {
    padding: '8px 16px', background: '#FF6B6B', color: 'white',
    border: 'none', borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: 'pointer',
    marginTop: 4, flexShrink: 0,
  },
  filterRow: { display: 'flex', gap: 8, marginBottom: 12 },
  filterBtn: {
    padding: '6px 14px', border: '1px solid #DDD5CE',
    borderRadius: 20, background: '#FDFAF7', fontSize: 13, cursor: 'pointer', color: '#5C5049',
  },
  filterActive: {
    padding: '6px 14px', border: 'none', borderRadius: 20,
    background: '#FF6B6B', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  statusRow: { display: 'flex', gap: 8, marginBottom: 12 },
  statusBtn: {
    flex: 1, padding: '10px', border: '1px solid #DDD5CE',
    borderRadius: 12, background: '#FDFAF7', fontSize: 13, cursor: 'pointer', color: '#5C5049',
  },
  statusActive: {
    flex: 1, padding: '10px', border: 'none', borderRadius: 12,
    background: '#FFF0EE', color: '#FF6B6B', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  subFilterRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reviewFilterRow: { display: 'flex', gap: 8 },
  sortBtn: {
    padding: '6px 14px', border: '1px solid #DDD5CE',
    borderRadius: 20, background: '#FDFAF7', fontSize: 13, cursor: 'pointer', color: '#5C5049',
  },
  gridContainer: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
  },
  gridCard: {
    background: '#FDFAF7', borderRadius: 20,
    boxShadow: '0 2px 10px rgba(180,150,130,0.12)', overflow: 'hidden',
  },
  gridThumbWrap: { position: 'relative' },
  gridThumb: { width: '100%', height: 160, objectFit: 'cover', display: 'block' },
  gridNoThumb: {
    width: '100%', height: 160, background: '#EDE8E3',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
  },
  gridBody: { padding: '10px 12px 12px' },
  gridTitle: { fontSize: 13, fontWeight: 700, margin: '0 0 2px', lineHeight: 1.4, color: '#2D2D2D' },
  gridSub: { fontSize: 11, color: '#9E9083', margin: '0 0 6px' },
  gridAddCard: {
    background: '#FDFAF7', borderRadius: 20, border: '2px dashed #EDE8E3',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: 220, cursor: 'pointer', gap: 8,
  },
  gridAddIcon: { color: '#C4BAB1' },
  gridAddText: { fontSize: 13, color: '#B0A69D', fontWeight: 600 },
  typeBadgeMovie: {
    position: 'absolute', top: 8, left: 8,
    background: '#FF6B6B', color: 'white',
    fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 6,
    letterSpacing: 0.5,
  },
  typeBadgeBook: {
    position: 'absolute', top: 8, left: 8,
    background: '#5A8A6A', color: 'white',
    fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 6,
    letterSpacing: 0.5,
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: 700, margin: 0, lineHeight: 1.4, color: '#2D2D2D', flex: 1 },
  cardSub: { fontSize: 12, color: '#9E9083', margin: '0 0 8px' },
  statusBtnRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  smallBtn: {
    padding: '4px 10px', border: '1px solid #DDD5CE',
    borderRadius: 20, background: '#FDFAF7', fontSize: 12, cursor: 'pointer', color: '#5C5049',
  },
  ratingArea: { marginTop: 8 },
  ratingRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  ratingLabel: { fontSize: 12, color: '#9E9083', width: 40 },
  ratingValue: { fontSize: 14, fontWeight: 700, color: '#FF6B6B' },
  blindText: { fontSize: 12, color: '#C4BAB1' },
  writeBtn: {
    padding: '3px 10px', border: 'none', borderRadius: 20,
    background: '#FFF0EE', color: '#FF6B6B', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  editBtn: {
    padding: '2px 8px', border: '1px solid #DDD5CE', borderRadius: 20,
    background: '#FDFAF7', color: '#9E9083', fontSize: 11, cursor: 'pointer',
  },
  commentText: { fontSize: 13, color: '#5C5049', fontStyle: 'italic', margin: '4px 0 0' },
  reviewBox: { padding: '0 16px 16px', borderTop: '1px solid #EDE8E3', marginTop: 4 },
  reviewLabel: { fontSize: 13, fontWeight: 600, color: '#5C5049', margin: '12px 0 8px' },
  stars: { display: 'flex', gap: 4 },
  starWrap: { position: 'relative', display: 'inline-block', width: 36, height: 36, fontSize: 32, lineHeight: '36px', textAlign: 'center' },
  starEmpty: { color: '#DDD5CE', userSelect: 'none' },
  starFilled: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', color: '#FF6B6B', userSelect: 'none' },
  starHalf: { clipPath: 'inset(0 50% 0 0)' },
  starClickLayer: { position: 'absolute', inset: 0, display: 'flex' },
  starHalfBtn: { flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
  ratingDisplay: { fontSize: 13, color: '#FF6B6B', fontWeight: 600, margin: '8px 0' },
  commentInput: {
    width: '100%', padding: 12, border: '1px solid #EDE8E3', borderRadius: 12,
    fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 8, fontFamily: 'inherit', background: '#FDFAF7',
  },
  reviewBtnRow: { display: 'flex', gap: 8 },
  cancelReviewBtn: {
    flex: 1, padding: 10, background: '#EDE8E3', color: '#9E9083',
    border: 'none', borderRadius: 12, fontSize: 14, cursor: 'pointer',
  },
  saveReviewBtn: {
    flex: 1, padding: 10, background: '#FF6B6B', color: 'white',
    border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  modal: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(45,30,20,0.45)', zIndex: 200, display: 'flex', alignItems: 'flex-end',
  },
  modalCard: {
    background: '#FDFAF7', borderRadius: '20px 20px 0 0', padding: 20,
    width: '100%', maxHeight: '80vh', overflowY: 'auto',
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#2D2D2D' },
  closeBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9E9083' },
  typeRow: { display: 'flex', gap: 8, marginBottom: 12 },
  typeBtn: {
    flex: 1, padding: 10, border: '1px solid #DDD5CE',
    borderRadius: 12, background: '#FDFAF7', fontSize: 14, cursor: 'pointer', color: '#5C5049',
  },
  typeActive: {
    flex: 1, padding: 10, border: 'none', borderRadius: 12,
    background: '#FF6B6B', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  searchRow: { display: 'flex', gap: 8, marginBottom: 12 },
  searchInput: {
    flex: 1, padding: 12, border: '1px solid #DDD5CE',
    borderRadius: 12, fontSize: 14, outline: 'none', fontFamily: 'inherit', background: '#FDFAF7',
  },
  searchBtn: {
    padding: '12px 16px', background: '#FF6B6B', color: 'white',
    border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  resultList: { display: 'flex', flexDirection: 'column', gap: 10 },
  resultItem: { display: 'flex', alignItems: 'center', gap: 12 },
  thumbnail: { width: 44, height: 64, objectFit: 'cover', borderRadius: 6, flexShrink: 0 },
  noThumb: {
    width: 44, height: 64, background: '#EDE8E3', borderRadius: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
  },
  resultInfo: { flex: 1 },
  resultTitle: { fontSize: 14, fontWeight: 600, margin: 0, lineHeight: 1.4, color: '#2D2D2D' },
  resultSub: { fontSize: 12, color: '#9E9083', margin: '2px 0 0' },
  wishBtn: {
    padding: '6px 12px', background: '#FFF0EE', color: '#FF6B6B',
    border: 'none', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  bookNoteBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%', padding: '8px 10px',
    background: 'linear-gradient(135deg, #E8EAF6, #C5CAE9)',
    border: 'none', borderRadius: 10, cursor: 'pointer', marginTop: 8,
  },
  bookNoteBtnIcon: {
    width: 28, height: 28, borderRadius: 14,
    background: 'linear-gradient(135deg, #C5CAE9, #9FA8DA)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  bookNoteBtnText: { fontSize: 12, fontWeight: 600, color: '#3949AB' },
  emptyCard: {
    background: '#FDFAF7', borderRadius: 20, padding: 40,
    textAlign: 'center', boxShadow: '0 2px 8px rgba(180,150,130,0.10)',
  },
  emptyEmoji: { fontSize: 48, margin: '0 0 12px' },
  emptyTitle: { color: '#2D2D2D', fontSize: 16, fontWeight: 700, margin: '0 0 6px' },
  emptyDesc: { color: '#B0A69D', fontSize: 13, margin: '0 0 20px' },
  emptyText: { color: '#9E9083', fontSize: 14, marginBottom: 16 },
  emptyAddBtn: {
    padding: '12px 28px', background: '#FF6B6B', color: 'white',
    border: 'none', borderRadius: 25, fontSize: 14, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(255,107,107,0.35)',
  },
};
