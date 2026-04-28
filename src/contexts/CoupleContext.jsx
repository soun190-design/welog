import { createContext, useContext, useEffect, useState } from 'react';
import { getCoupleDoc } from '../firebase/firestore';
import { useAuth } from './AuthContext';

const CoupleContext = createContext(null);

export const CoupleProvider = ({ children }) => {
  const { userDoc } = useAuth();
  const [couple, setCouple] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (userDoc?.coupleId) {
        const coupleData = await getCoupleDoc(userDoc.coupleId);
        setCouple(coupleData);
      } else {
        setCouple(null);
      }
      setLoading(false);
    };
    load();
  }, [userDoc]);

  const refreshCouple = async () => {
    if (userDoc?.coupleId) {
      const coupleData = await getCoupleDoc(userDoc.coupleId);
      setCouple(coupleData);
    }
  };

  const isConnected = couple?.members?.length === 2;

  return (
    <CoupleContext.Provider value={{ couple, loading, isConnected, refreshCouple }}>
      {children}
    </CoupleContext.Provider>
  );
};

export const useCouple = () => {
  const ctx = useContext(CoupleContext);
  if (!ctx) throw new Error('useCouple must be used within CoupleProvider');
  return ctx;
};
