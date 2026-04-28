import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from './config';
import { createUserDoc } from './firestore';

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  await createUserDoc(user);
  return user;
};

export const signOutUser = () => signOut(auth);

