import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCouple } from '../contexts/CoupleContext';
import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

const TMDB_KEY = '932ddc5c9f9c6bc3d417360ff11f80b0';

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
        var movieRes = await fetch(
          'https://api.themoviedb.org/3/search/movie?api_key=' + TMDB_KEY + '&language=ko-KR&query=' + encodeURIComponent(searchQuery)
        );
        var movieData = await movieRes.json();
        var movieResults = (movieData.results || []).slice(0, 5).map(function(m) {
          return {
            type: 'movie',
            title: m.title,
            thumbnail: m.poster_path ? ('https://image.tmdb.org/t/p/w200' + m.poster_path) : null,
            director: '',
            description: m.overview,
            year: m.release_date ? m.release_date.substring(0, 4) : '',
            apiId: String(m.id),
          };
        });
        setSearchResults(movieResults);
      } else {
        var bookRes = await fetch(
          'https://www.googleapis.com/books/v1/volumes?q=' + encodeURIComponent(searchQuery) + '&maxResults=5&langRestrict=ko'
        );
        var bookData = await bookRes.json();
        var bookResults = (bookData.items || []).map(function(b) {
          var info = b.volumeInfo;
          return {
            type: 'book',
            title: info.title,
            thumbnail: (info.imageLinks && info.imageLinks.thumbnail) ? info.imageLinks.thumbnail : null,
            director: (info.authors || []).join(', '),
            description: info.description || '',
            year: info.publishedDate ? info.publishedDate.substring(0, 4) : '',
            apiId: b.id,
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
    for (var i = 1; i <= 10; i++) {
      var val = i * 0.5;
      stars.push(
        <button
          key={i}
          style={Object.assign({}, styles.starBtn, { color: val <= rating ? '#ff7043' : '#ddd' })}
          onClick={onSelect ? (function(v) { return function() { onSelect(v); }; })(val) : undefined}
        >
          {i % 2 === 1 ? '◐' : '★'}
        </button>
      );
    }
    return <div style={styles.stars}>{stars}</div>;
  };

  var filtered = getFilteredContents();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerRow}>
          <h2 style={styles.title}>컨텐츠 📚</h2>
          <button style={styles.addBtn} onClick={function() { setShowSearch(true); }}>+ 추가</button>
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
          <p style={styles.emptyText}>아직 추가된 컨텐츠가 없어요</p>
          <button style={styles.emptyAddBtn} onClick={function() { setShowSearch(true); }}>+ 추가하기</button>
        </div>
      ) : (
        filtered.map(function(content) {
          var myReview = (content.reviews && content.reviews[user.uid]) || null;
          var partnerReview = (content.reviews && partnerUid && content.reviews[partnerUid]) || null;
          var bothDone = content.reviewCount === 2;

          return (
            <div key={content.id} style={styles.card}>
              <div style={styles.cardInner}>
                {/* 사이드 썸네일 */}
                <div style={styles.cardThumbWrap}>
                  {content.thumbnail ? (
                    <img src={content.thumbnail} alt={content.title} style={styles.cardThumb} />
                  ) : (
                    <div style={styles.cardNoThumb}>{content.type === 'movie' ? '🎬' : '📖'}</div>
                  )}
                </div>

                {/* 정보 */}
                <div style={styles.cardBody}>
                  <div style={styles.cardTitleRow}>
                    <p style={styles.cardTitle}>{content.title}</p>
                    <span style={content.type === 'movie' ? styles.typeBadgeMovie : styles.typeBadgeBook}>
                      {content.type === 'movie' ? 'MOVIE' : 'BOOK'}
                    </span>
                  </div>
                  <p style={styles.cardSub}>{content.director}{content.year ? ' · ' + content.year : ''}</p>
                  <div style={styles.statusBtnRow}>
                    {content.status !== 'ongoing' ? (
                      <button style={styles.smallBtn} onClick={(function(id) { return function() { handleStatusChange(id, 'ongoing'); }; })(content.id)}>
                        {content.status === 'wish' ? '▶️ 시작' : '↩️ 진행중으로'}
                      </button>
                    ) : null}
                    {content.status !== 'done' ? (
                      <button style={styles.smallBtn} onClick={(function(id) { return function() { handleStatusChange(id, 'done'); }; })(content.id)}>
                        ✅ 완료
                      </button>
                    ) : null}
                    {content.status !== 'wish' ? (
                      <button style={styles.smallBtn} onClick={(function(id) { return function() { handleStatusChange(id, 'wish'); }; })(content.id)}>
                        🎯 위시로
                      </button>
                    ) : null}
                  </div>
                  {content.status === 'done' ? (
                    <div style={styles.ratingArea}>
                      <div style={styles.ratingRow}>
                        <span style={styles.ratingLabel}>나</span>
                        {myReview ? (
                          <span style={styles.ratingValue}>★ {myReview.rating}</span>
                        ) : (
                          <button
                            style={styles.writeBtn}
                            onClick={(function(id) { return function() { setShowReview(id); setMyRating(0); setMyComment(''); }; })(content.id)}
                          >
                            평가하기
                          </button>
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
                      {(bothDone && myReview && myReview.comment) ? (
                        <p style={styles.commentText}>"{myReview.comment}"</p>
                      ) : null}
                      {(bothDone && partnerReview && partnerReview.comment) ? (
                        <p style={styles.commentText}>💌 "{partnerReview.comment}"</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              {showReview === content.id ? (
                <div style={styles.reviewBox}>
                  <p style={styles.reviewLabel}>평점 선택 (0.5점 단위)</p>
                  {renderStars(myRating, setMyRating)}
                  <p style={styles.ratingDisplay}>
                    {myRating > 0 ? myRating + ' / 10' : '평점을 선택해주세요'}
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
        })
      )}
    </div>
  );
}

const styles = {
  container: { padding: 20, paddingBottom: 40 },
  header: { padding: '20px 0 12px' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 700, margin: 0, color: '#2D2D2D' },
  addBtn: {
    padding: '8px 16px', background: '#FF6B6B', color: 'white',
    border: 'none', borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: 'pointer',
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
  card: {
    background: '#FDFAF7', borderRadius: 20, marginBottom: 14,
    boxShadow: '0 2px 10px rgba(180,150,130,0.12)', overflow: 'hidden',
  },
  cardInner: { display: 'flex', alignItems: 'flex-start', padding: '14px 16px', gap: 12 },
  cardThumbWrap: { flexShrink: 0 },
  cardThumb: { width: 60, height: 90, objectFit: 'cover', borderRadius: 8 },
  cardNoThumb: {
    width: 60, height: 90, background: '#EDE8E3', borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
  },
  typeBadgeMovie: {
    background: '#FF6B6B', color: 'white',
    fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
    letterSpacing: 0.5, flexShrink: 0,
  },
  typeBadgeBook: {
    background: '#5A8A6A', color: 'white',
    fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
    letterSpacing: 0.5, flexShrink: 0,
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
  commentText: { fontSize: 13, color: '#5C5049', fontStyle: 'italic', margin: '4px 0 0' },
  reviewBox: { padding: '0 16px 16px', borderTop: '1px solid #EDE8E3', marginTop: 4 },
  reviewLabel: { fontSize: 13, fontWeight: 600, color: '#5C5049', margin: '12px 0 8px' },
  stars: { display: 'flex', gap: 2 },
  starBtn: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 2 },
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
  emptyCard: {
    background: '#FDFAF7', borderRadius: 16, padding: 40,
    textAlign: 'center', boxShadow: '0 2px 8px rgba(180,150,130,0.10)',
  },
  emptyText: { color: '#9E9083', fontSize: 14, marginBottom: 16 },
  emptyAddBtn: {
    padding: '10px 24px', background: '#FF6B6B', color: 'white',
    border: 'none', borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
};
