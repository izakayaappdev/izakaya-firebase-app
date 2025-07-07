import React, { useState, useEffect } from 'react';

// 月末在庫管理コンポーネント（エラー修正完全版）
function MonthlyInventory({ user, products, addToast }) {
  const [activeSection, setActiveSection] = useState('current');
  const [inventoryDate, setInventoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [actualStock, setActualStock] = useState({});
  const [inventoryHistory, setInventoryHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // プロップスの安全性確保
  const safeProducts = Array.isArray(products) ? products : [];
  const safeAddToast = typeof addToast === 'function' ? addToast : () => {};
  const safeUser = user || {};

  // 棚卸し履歴の取得
  useEffect(() => {
    if (safeUser.uid || safeUser.email) {
      fetchInventoryHistory();
    }
  }, [safeUser]);

  const fetchInventoryHistory = () => {
    try {
      const userId = safeUser.uid || safeUser.email || 'default_user';
      const historyKey = `inventory_history_${userId}`;
      const storedHistory = localStorage.getItem(historyKey);
      
      if (storedHistory) {
        const history = JSON.parse(storedHistory);
        if (Array.isArray(history)) {
          setInventoryHistory(history.slice(0, 10));
        }
      }
    } catch (error) {
      console.error('履歴取得エラー:', error);
      safeAddToast('履歴の読み込みに失敗しました', 'error');
    }
  };

  // 実地在庫数の更新
  const handleActualStockChange = (productId, value) => {
    const numValue = parseInt(value) || 0;
    setActualStock(prev => ({
      ...prev,
      [productId]: numValue
    }));
  };

  // 差異計算
  const calculateDifferences = () => {
    return safeProducts.filter(product => product.isActive !== false).map(product => {
      const systemStock = product.stock || 0;
      const actual = actualStock[product.id] || 0;
      const difference = actual - systemStock;
      const differenceRate = systemStock > 0 ? ((difference / systemStock) * 100).toFixed(1) : 0;
      
      return {
        ...product,
        systemStock,
        actualStock: actual,
        difference,
        differenceRate,
        status: difference === 0 ? 'match' : difference > 0 ? 'surplus' : 'shortage'
      };
    });
  };

  // 在庫状況分析
  const analyzeInventoryStatus = () => {
    const totalProducts = safeProducts.filter(p => p.isActive !== false).length;
    const lowStockProducts = safeProducts.filter(p => 
      p.isActive !== false && p.stock <= (p.minStock || 0)
    ).length;
    const outOfStockProducts = safeProducts.filter(p => 
      p.isActive !== false && p.stock === 0
    ).length;
    const totalValue = safeProducts
      .filter(p => p.isActive !== false)
      .reduce((sum, p) => sum + (p.stock * (p.cost || 0)), 0);

    return {
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      totalValue,
      lowStockRate: totalProducts > 0 ? ((lowStockProducts / totalProducts) * 100).toFixed(1) : 0
    };
  };

  // 棚卸し記録の保存
  const saveInventoryRecord = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      const differences = calculateDifferences();
      const analysis = analyzeInventoryStatus();
      
      const inventoryRecord = {
        id: Date.now().toString(),
        date: inventoryDate,
        differences,
        analysis,
        timestamp: new Date().toISOString()
      };

      const userId = safeUser.uid || safeUser.email || 'default_user';
      const historyKey = `inventory_history_${userId}`;
      const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
      const updatedHistory = [inventoryRecord, ...existingHistory].slice(0, 50);
      
      localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
      
      safeAddToast('棚卸し記録を保存しました', 'success');
      setActualStock({});
      fetchInventoryHistory();
      
    } catch (error) {
      console.error('保存エラー:', error);
      safeAddToast('保存に失敗しました', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 改善提案の生成
  const generateRecommendations = (analysis) => {
    const recommendations = [];
    
    if (analysis.lowStockRate > 20) {
      recommendations.push({
        type: 'warning',
        title: '低在庫商品が多数発生',
        content: `全体の${analysis.lowStockRate}%が低在庫状態です。発注計画の見直しをお勧めします。`
      });
    }
    
    if (analysis.outOfStockProducts > 0) {
      recommendations.push({
        type: 'error',
        title: '欠品商品あり',
        content: `${analysis.outOfStockProducts}商品が欠品状態です。早急な補充が必要です。`
      });
    }
    
    if (analysis.totalValue > 500000) {
      recommendations.push({
        type: 'info',
        title: '在庫金額が高額',
        content: '在庫金額が50万円を超えています。回転率の改善を検討してください。'
      });
    }
    
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'success',
        title: '良好な在庫状況',
        content: '現在の在庫状況は良好です。このまま適切な管理を継続してください。'
      });
    }
    
    return recommendations;
  };

  // 月次レポート生成
  const generateMonthlyReport = () => {
    if (!Array.isArray(inventoryHistory) || inventoryHistory.length === 0) {
      safeAddToast('棚卸し履歴がありません', 'warning');
      return;
    }
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyRecords = inventoryHistory.filter(record => 
      record && record.date && record.date.startsWith(currentMonth)
    );
    
    if (monthlyRecords.length === 0) {
      safeAddToast('今月の棚卸し記録がありません', 'warning');
      return;
    }
    
    const latestRecord = monthlyRecords[0];
    const analysis = analyzeInventoryStatus();
    
    const report = {
      month: currentMonth,
      recordsCount: monthlyRecords.length,
      latestInventory: latestRecord,
      currentAnalysis: analysis,
      recommendations: generateRecommendations(analysis)
    };
    
    setSelectedReport(report);
    setActiveSection('reports');
    safeAddToast('月次レポートを生成しました', 'success');
  };

  // セクションボタンのスタイル
  const getSectionButtonStyle = (section) => ({
    padding: '0.75rem 1.5rem',
    background: activeSection === section ? '#2563eb' : '#f3f4f6',
    color: activeSection === section ? 'white' : '#374151',
    border: 'none',
    borderRadius: '0.5rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '0.9rem'
  });

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '1rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* ヘッダー */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ 
          fontSize: '1.8rem', 
          fontWeight: 'bold', 
          color: '#1f2937',
          margin: '0 0 0.5rem 0'
        }}>
          📊 月末在庫管理
        </h2>
        <p style={{ color: '#6b7280', margin: 0 }}>
          棚卸し・在庫確認・月次レポート機能
        </p>
      </div>

      {/* ナビゲーション */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center',
        gap: '0.5rem',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        <button 
          onClick={() => setActiveSection('current')}
          style={getSectionButtonStyle('current')}
        >
          📋 棚卸し入力
        </button>
        <button 
          onClick={() => setActiveSection('history')}
          style={getSectionButtonStyle('history')}
        >
          📈 履歴確認
        </button>
        <button 
          onClick={() => setActiveSection('reports')}
          style={getSectionButtonStyle('reports')}
        >
          📊 月次レポート
        </button>
      </div>

      {/* 棚卸し入力セクション */}
      {activeSection === 'current' && (
        <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {/* 日付選択 */}
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <label style={{ display: 'block', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
              棚卸し日付
            </label>
            <input
              type="date"
              value={inventoryDate}
              onChange={(e) => setInventoryDate(e.target.value)}
              style={{
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                maxWidth: '200px'
              }}
            />
          </div>

          {/* 商品一覧 */}
          {safeProducts.length > 0 ? (
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
                実地在庫数入力
              </h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {safeProducts.filter(product => product.isActive !== false).map(product => (
                  <div key={product.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    background: '#f9fafb',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', color: '#1f2937' }}>
                        {product.name}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        システム在庫: {product.stock || 0}個
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <label style={{ fontSize: '0.875rem', color: '#374151' }}>
                        実地在庫:
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={actualStock[product.id] || ''}
                        onChange={(e) => handleActualStockChange(product.id, e.target.value)}
                        style={{
                          width: '80px',
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.25rem',
                          textAlign: 'center'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 差異表示 */}
              {Object.keys(actualStock).length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
                    差異確認
                  </h3>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {calculateDifferences()
                      .filter(item => actualStock[item.id] !== undefined)
                      .map(item => (
                      <div key={item.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem',
                        background: item.status === 'match' ? '#f0f9ff' : 
                                   item.status === 'surplus' ? '#f0fdf4' : '#fef2f2',
                        borderRadius: '0.5rem',
                        border: `1px solid ${
                          item.status === 'match' ? '#bfdbfe' : 
                          item.status === 'surplus' ? '#bbf7d0' : '#fecaca'
                        }`
                      }}>
                        <span style={{ fontWeight: '500' }}>{item.name}</span>
                        <span style={{
                          color: item.status === 'match' ? '#1d4ed8' : 
                                 item.status === 'surplus' ? '#059669' : '#dc2626',
                          fontWeight: '600'
                        }}>
                          {item.difference > 0 ? '+' : ''}{item.difference}
                          {item.status !== 'match' && ` (${item.differenceRate}%)`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 保存ボタン */}
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button
                  onClick={saveInventoryRecord}
                  disabled={isProcessing || Object.keys(actualStock).length === 0}
                  style={{
                    padding: '1rem 2rem',
                    background: isProcessing || Object.keys(actualStock).length === 0 ? '#d1d5db' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: '600',
                    fontSize: '1rem',
                    cursor: isProcessing || Object.keys(actualStock).length === 0 ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  {isProcessing ? '保存中...' : '棚卸し記録を保存'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
              <p>商品データが見つかりません</p>
            </div>
          )}
        </div>
      )}

      {/* 履歴確認セクション */}
      {activeSection === 'history' && (
        <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              棚卸し履歴
            </h3>
            <button
              onClick={generateMonthlyReport}
              style={{
                padding: '0.5rem 1rem',
                background: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '500',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              月次レポート生成
            </button>
          </div>

          {inventoryHistory.length > 0 ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {inventoryHistory.map(record => (
                <div key={record.id} style={{
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: '600', color: '#1f2937' }}>
                      {new Date(record.date).toLocaleDateString('ja-JP')}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {record.differences?.length || 0}商品
                    </span>
                  </div>
                  {record.analysis && (
                    <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                      総在庫価値: ¥{(record.analysis.totalValue || 0).toLocaleString()}
                      {record.analysis.lowStockProducts > 0 && (
                        <span style={{ color: '#dc2626', marginLeft: '1rem' }}>
                          低在庫: {record.analysis.lowStockProducts}商品
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
              <p>棚卸し履歴がありません</p>
            </div>
          )}
        </div>
      )}

      {/* 月次レポートセクション */}
      {activeSection === 'reports' && (
        <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#1f2937', marginBottom: '1.5rem' }}>
            月次レポート
          </h3>
          
          {selectedReport ? (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
                  {new Date(selectedReport.month).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}レポート
                </h4>
                
                {/* 基本統計 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1d4ed8' }}>
                      {selectedReport.recordsCount}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>棚卸し回数</div>
                  </div>
                  <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
                      ¥{(selectedReport.currentAnalysis.totalValue || 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>総在庫価値</div>
                  </div>
                  <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#d97706' }}>
                      {selectedReport.currentAnalysis.lowStockProducts || 0}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>低在庫商品</div>
                  </div>
                </div>
                
                {/* 改善提案 */}
                <div>
                  <h5 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
                    改善提案
                  </h5>
                  {selectedReport.recommendations?.map((rec, index) => (
                    <div key={index} style={{
                      padding: '1rem',
                      marginBottom: '0.5rem',
                      borderRadius: '0.5rem',
                      border: `1px solid ${
                        rec.type === 'warning' ? '#f59e0b' : 
                        rec.type === 'error' ? '#ef4444' : '#3b82f6'
                      }`,
                      background: rec.type === 'warning' ? '#fefbf3' : 
                                 rec.type === 'error' ? '#fef2f2' : '#f0f9ff'
                    }}>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong>{rec.title}</strong>
                      </div>
                      <p style={{ margin: 0, color: '#374151', lineHeight: '1.5' }}>{rec.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
              <p>月次レポートを生成するには、「月次レポート生成」ボタンをクリックしてください</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MonthlyInventory;