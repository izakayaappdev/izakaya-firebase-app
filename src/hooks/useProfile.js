import { useState, useEffect } from 'react';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

export const useProfile = (user) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // プロフィール取得
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const profileDoc = doc(db, 'users', user.uid, 'profile', 'main');
        const profileSnap = await getDoc(profileDoc);
        
        if (profileSnap.exists()) {
          setProfile({
            id: profileSnap.id,
            ...profileSnap.data()
          });
        } else {
          setProfile(null);
        }
        
        setError(null);
      } catch (error) {
        console.error('プロフィール取得エラー:', error);
        setError(error.message);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.uid]);

  // プロフィール作成
  const createProfile = async (profileData) => {
    if (!user) {
      return { success: false, error: 'ユーザーがログインしていません' };
    }

    try {
      const profileDoc = doc(db, 'users', user.uid, 'profile', 'main');
      const newProfile = {
        ...profileData,
        userId: user.uid,
        userEmail: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(profileDoc, newProfile);
      
      setProfile({
        id: 'main',
        ...newProfile
      });
      
      return { success: true };
    } catch (error) {
      console.error('プロフィール作成エラー:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // プロフィール更新
  const updateProfile = async (updateData) => {
    if (!user || !profile) {
      return { success: false, error: 'プロフィールが存在しません' };
    }

    try {
      const profileDoc = doc(db, 'users', user.uid, 'profile', 'main');
      const updatedData = {
        ...updateData,
        updatedAt: serverTimestamp()
      };

      await updateDoc(profileDoc, updatedData);
      
      setProfile(prev => ({
        ...prev,
        ...updatedData
      }));
      
      return { success: true };
    } catch (error) {
      console.error('プロフィール更新エラー:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // 初期設定完了チェック
  const isSetupCompleted = () => {
    return profile && profile.setupCompleted === true;
  };

  // 選択カテゴリーチェック
  const getSelectedCategories = () => {
    return profile?.selectedCategories || [];
  };

  // お店情報取得
  const getShopInfo = () => {
    return {
      shopName: profile?.shopName || '',
      address: profile?.address || '',
      phone: profile?.phone || ''
    };
  };

  return {
    profile,
    loading,
    error,
    createProfile,
    updateProfile,
    isSetupCompleted,
    getSelectedCategories,
    getShopInfo
  };
};