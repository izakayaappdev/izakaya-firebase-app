import React, { useState } from 'react';
import { useProducts } from '../../hooks/useProducts';
import AddProductTab from './AddProductTab';
import InventoryTab from './InventoryTab';
import AnalyticsTab from './AnalyticsTab';
import NewsTab from './NewsTab';

// 顧客ヘッダー
function CustomerHeader({ user, logout, profile }) {
  return (
    <header className="app-header">
      <div className="header-content">
        <h1>🍻 在庫管理</h1>
        <div className="user-info">
          {profile?.shopName && (
            <span className="shop-name">{profile.shopName}</span>
          )}
          <img src={user.photoURL} alt="プロフィール" className="user-avatar" />
          <span>{user.displayName}</span>
          <button onClick={logout} className="logout-button">ログアウト</button>
        </div>
      </div>
    </header>
  );
}

// 顧客タブナビゲーション
function CustomerTabs({ activeTab, setActiveTab }) {
  return (
    <div className="customer-tabs">
      <button 
        className={`tab-button ${activeTab === 'add' ? 'active' : ''}`}
        onClick={() => setActiveTab('add')}
      >
        ➕ 新商品
      </button>
      <button 
        className={`tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
        onClick={() => setActiveTab('inventory')}
      >
        📦 在庫
      </button>
      <button 
        className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
        onClick={() => setActiveTab('analytics')}
      >
        📊 分析
      </button>
      <button 
        className={`tab-button ${activeTab === 'news' ? 'active' : ''}`}
        onClick={() => setActiveTab('news')}
      >
        🔔 お知らせ
      </button>
    </div>
  );
}

// メイン顧客アプリ
function CustomerApp({ user, logout, addToast, profile }) {
  const { products, loading, error, addProduct, updateProduct, updateStock, generateProductCode } = useProducts(user);
  const [activeTab, setActiveTab] = useState('inventory'); // デフォルトは在庫タブ

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>商品データを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <CustomerHeader user={user} logout={logout} profile={profile} />

      <main className="customer-main-content">
        {error && (
          <div className="error-message">
            エラーが発生しました: {error}
          </div>
        )}

        {activeTab === 'add' && (
          <AddProductTab 
            addProduct={addProduct}
            generateProductCode={generateProductCode}
            addToast={addToast}
            products={products}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryTab 
            products={products}
            updateStock={updateStock}
            updateProduct={updateProduct}
            addToast={addToast}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab 
            products={products}
            addToast={addToast}
          />
        )}

        {activeTab === 'news' && (
          <NewsTab />
        )}
      </main>

      <CustomerTabs activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default CustomerApp;