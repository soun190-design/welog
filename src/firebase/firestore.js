import {
  doc, getDoc, setDoc, updateDoc,
  collection, addDoc, query, where, getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

export const createUserDoc = async (user) => {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      coupleId: null,
      createdAt: serverTimestamp(),
    });
  }
};

export const getUserDoc = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

const generateInviteCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

export const createCouple = async (uid) => {
  // 이미 커플이 있으면 기존 코드 반환
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data();
  
  if (userData?.coupleId) {
    const existing = await getCoupleDoc(userData.coupleId);
    if (existing) return { coupleId: existing.id, inviteCode: existing.inviteCode };
  }

  // 없을 때만 새로 생성
  const inviteCode = generateInviteCode();
  const coupleRef = await addDoc(collection(db, 'couples'), {
    members: [uid],
    inviteCode,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'users', uid), { coupleId: coupleRef.id });
  return { coupleId: coupleRef.id, inviteCode };
};

export const joinCouple = async (uid, inviteCode) => {
  const q = query(
    collection(db, 'couples'),
    where('inviteCode', '==', inviteCode.toUpperCase())
  );
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('유효하지 않은 초대 코드예요.');
  const coupleDoc = snap.docs[0];
  const coupleData = coupleDoc.data();
  if (coupleData.members.length >= 2) throw new Error('이미 2명이 연결된 코드예요.');
  if (coupleData.members.includes(uid)) throw new Error('이미 연결된 코드예요.');
  await updateDoc(doc(db, 'couples', coupleDoc.id), {
    members: [...coupleData.members, uid],
  });
  await updateDoc(doc(db, 'users', uid), { coupleId: coupleDoc.id });
  return { coupleId: coupleDoc.id };
};

export const getCoupleDoc = async (coupleId) => {
  const snap = await getDoc(doc(db, 'couples', coupleId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

