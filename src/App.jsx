import React from 'react';
import { useAuth } from './hooks/useAuth';
import { useToast } from './hooks/useToast';
import AdminDashboard from './components/admin/AdminDashboard';
import CustomerApp from './components/customer/CustomerApp';
import ToastContainer from './components/shared/ToastContainer';
import './styles/Layout.css';
import './App.css';

// 管理者判定
const ADMIN_EMAIL = 'izakaya.app.dev@gmail.com';

// ログイン画面コンポーネント
function LoginScreen({ onLogin }) {
  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🍻 飲み屋在庫管理システム</h1>
        <p>唐津市の飲み屋向け在庫管理システム</p>
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
  const { toasts, addToast, removeToast } = useToast();

// ログインしていない場合
if (!user) {
  return (
    <>
      <LoginScreen onLogin={signInWithGoogle} addToast={addToast} />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
}

  // ローディング中
  if (authLoading) {
    return (
      <>
        <LoadingScreen />
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
        />
      )}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default App;