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
        console.log(`📦 ${setupData.selectedProducts.length}件の商品を追加中...`);
        
        let successCount = 0;
        let errorCount = 0;

        for (const productData of setupData.selectedProducts) {
          try {
            const result = await addProduct({
              ...productData,
              isMaster: false,
              addedBy: user.email,
              createdAt: new Date()
            });

            if (result.success) {
              successCount++;
            } else {
              errorCount++;
              console.warn('商品追加失敗:', productData.name, result.error);
            }
          } catch (error) {
            errorCount++;
            console.error('商品追加エラー:', productData.name, error);
          }
        }

        console.log(`✅ 商品追加完了: 成功${successCount}件, 失敗${errorCount}件`);
        
        if (successCount > 0) {
          console.log(`${successCount}件の商品を追加しました`);
        }
        if (errorCount > 0) {
          console.log(`${errorCount}件の商品追加に失敗しました`);
        }
      }

      console.log('初期設定が完了しました');
      setShowInitialSetup(false);

    } catch (error) {
      console.error('初期設定エラー:', error);
      console.log('初期設定に失敗しました');
    }
  };

  // 認証中の表示
  if (authLoading) {
    return <LoadingScreen />;
  }

  // 未ログイン時の表示
  if (!user) {
    return <LoginScreen onLogin={signInWithGoogle} />;
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
        <ToastContainer 
          toasts={toasts}
          removeToast={removeToast}
        />
      </>
    );
  }

  // プロフィール読み込み中
  if (profileLoading) {
    return <LoadingScreen />;
  }

  // 管理者・顧客判定
  const isAdmin = user.email === ADMIN_EMAIL;

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
          profile={profile}
          logout={logout}
          addToast={addToast}
        />
      )}
      
      <ToastContainer 
        toasts={toasts}
        removeToast={removeToast}
      />
    </div>
  );
}

export default App;