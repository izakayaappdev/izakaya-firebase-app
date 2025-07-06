import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useToast } from './hooks/useToast';
import { useProfile } from './hooks/useProfile';
import { useProducts } from './hooks/useProducts';
import AdminDashboard from './components/admin/AdminDashboard';
import CustomerApp from './components/customer/CustomerApp';
import InitialSetup from './components/setup/InitialSetup';
import ToastContainer from './components/shared/ToastContainer';
import './styles/InitialSetup.css';
import './App.css';
import './styles/Customer.css';

// 管理者判定
const ADMIN_EMAIL = 'izakaya.app.dev@gmail.com';

// ログイン画面コンポーネント
function LoginScreen({ onLogin }) {
  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🍻 在庫管理アプリ</h1>
        <p>飲み屋・居酒屋向けの在庫管理システム</p>
        <p>佐賀の地酒から九州焼酎・沖縄泡盛まで対応</p>
        <button onClick={onLogin} className="login-button">
          Googleでログイン
        </button>
      </div>
    </div>
  );
}

// ローディング画面コンポーネント
function LoadingScreen() {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>読み込み中...</p>
    </div>
  );
}

// メインAppコンポーネント
function App() {
  const { user, loading: authLoading, signInWithGoogle, logout } = useAuth();
  const { profile, loading: profileLoading, createProfile } = useProfile(user);
  const { addProduct } = useProducts(user);
  const { toasts, addToast, removeToast } = useToast();
  const [showInitialSetup, setShowInitialSetup] = useState(false);

  // 初期設定の必要性をチェック
  useEffect(() => {
    if (user && !profileLoading) {
      const isAdmin = user.email === ADMIN_EMAIL;
      
      if (!isAdmin && (!profile || !profile.setupCompleted)) {
        setShowInitialSetup(true);
      } else {
        setShowInitialSetup(false);
      }
    }
  }, [user, profile, profileLoading]);

  // 初期設定完了処理
  const handleSetupComplete = async (setupData) => {
    try {
      console.log('🎉 初期設定完了処理開始:', setupData);

      // プロフィール作成
      const profileResult = await createProfile({
        shopName: setupData.shopName,
        address: setupData.address,
        phone: setupData.phone,
        selectedCategories: setupData.selectedCategories,
        setupCompleted: true,
        createdAt: new Date()
      });

      if (!profileResult.success) {
        throw new Error(profileResult.error);
      }

      // 選択商品の追加
      if (setupData.selectedProducts && setupData.selectedProducts.length > 0) {
        console.log(`📦 ${setupData.selectedProducts.length}商品を追加中...`);
        
        for (const product of setupData.selectedProducts) {
          await addProduct(product);
        }
        
        addToast(`${setupData.selectedProducts.length}商品を追加しました！`, 'success');
      }

      setShowInitialSetup(false);
      addToast('初期設定が完了しました！', 'success');
      
    } catch (error) {
      console.error('初期設定完了エラー:', error);
      addToast('初期設定の保存に失敗しました', 'error');
    }
  };

  // ログインしていない場合
  if (!user) {
    return (
      <>
        <LoginScreen onLogin={signInWithGoogle} />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </>
    );
  }

  // ローディング中
  if (authLoading || profileLoading) {
    return (
      <>
        <LoadingScreen />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </>
    );
  }

  // 初期設定が必要な場合
  if (showInitialSetup) {
    return (
      <>
        <InitialSetup 
          user={user} 
          onComplete={handleSetupComplete} 
          addToast={addToast} 
        />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </>
    );
  }

  // 管理者判定
  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <div className="app">
      {isAdmin ? (
        <AdminDashboard 
          user={user} 
          logout={logout} 
          addToast={addToast} 
        />
      ) : (
        <CustomerApp 
          user={user} 
          logout={logout} 
          addToast={addToast}
          profile={profile}
        />
      )}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default App;