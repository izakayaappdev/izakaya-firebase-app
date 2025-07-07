import React, { useState, useEffect } from 'react';

// 月末在庫管理コンポーネント
function MonthlyInventoryManager({ products, addToast }) {
  const [currentDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [inventoryData, setInventoryData] = useState(null);
  const [showStockTaking, setShowStockTaking] = useState(false);
  const [stockTakingData, setStockTakingData] = useState({});
  const [loading, setLoading] = useState(false);

  // 月末在庫計算
  const calculateMonthlyInventory = () => {
    if (!products || products.length === 0) return null;

    const activeProducts = products.filter(p => p.isActive !== false);
    
    // 基本統計
    const totalItems = activeProducts.length;
    const totalStock = activeProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
    const totalValue = activeProducts.reduce((sum, p) => sum + ((p.cost || 0) * (p.stock || 0)), 0);
    const totalPotentialProfit = activeProducts.reduce((sum, p) => sum + ((p.profit || 0) * (p.stock || 0)), 0);
    
    // カテゴリ別分析
    const categoryAnalysis = {};
    activeProducts.forEach(product => {
      const category = product.category;
      if (!categoryAnalysis[category]) {
        categoryAnalysis[category] = {
          items: 0,
          stock: 0,
          value: 0,
          profit: 0
        };
      }
      categoryAnalysis[category].items += 1;
      categoryAnalysis[category].stock += product.stock || 0;
      categoryAnalysis[category].value += (product.cost || 0) * (product.stock || 0);
      categoryAnalysis[category].profit += (product.profit || 0) * (product.stock || 0);
    });

    // 在庫分析
    const zeroStockItems = activeProducts.filter(p => (p.stock || 0) === 0).length;
    const lowStockItems = activeProducts.filter(p => 
      (p.stock || 0) > 0 && (p.stock || 0) <= (p.minStock || 0)
    ).length;
    const overStockItems = activeProducts.filter(p => 
      (p.stock || 0) > (p.minStock || 0) * 3 // 最小在庫の3倍以上を過剰在庫とみなす
    ).length;

    // デッドストック（在庫あるが長期間動きがない想定）
    const deadStockItems = activeProducts.filter(p => 
      (p.stock || 0) > 0 && (p.cost || 0) > 0 && !p.updatedAt
    );

    return {
      totalItems,
      totalStock,
      totalValue,
      totalPotentialProfit,
      categoryAnalysis,
      stockAnalysis: {
        zeroStock: zeroStockItems,
        lowStock: lowStockItems,
        overStock: overStockItems,
        deadStock: deadStockItems.length
      },
      products: activeProducts
    };
  };

  // 棚卸し開始
  const startStockTaking = () => {
    const activeProducts = products.filter(p => p.isActive !== false);
    const initialData = {};
    activeProducts.forEach(product => {
      initialData[product.id] = {
        systemStock: product.stock || 0,
        actualStock: product.stock || 0, // 初期値はシステム在庫
        difference: 0,
        checked: false
      };
    });
    setStockTakingData(initialData);
    setShowStockTaking(true);
    addToast('棚卸しを開始しました', 'info');
  };

  // 実地在庫入力
  const updateActualStock = (productId, actualStock) => {
    setStockTakingData(prev => {
      const systemStock = prev[productId].systemStock;
      const difference = actualStock - systemStock;
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          actualStock: parseInt(actualStock) || 0,
          difference,
          checked: true
        }
      };
    });
  };

  // 棚卸し完了
  const completeStockTaking = () => {
    const differences = Object.values(stockTakingData).filter(item => item.difference !== 0);
    
    if (differences.length === 0) {
      addToast('差異はありませんでした', 'success');
    } else {
      addToast(`${differences.length}品目で差異が発見されました`, 'warning');
    }
    
    setShowStockTaking(false);
  };

  // データ計算
  useEffect(() => {
    const data = calculateMonthlyInventory();
    setInventoryData(data);
  }, [products, selectedMonth, selectedYear]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>月末在庫データを計算中...</p>
      </div>
    );
  }

  if (!inventoryData) {
    return (
      <div className="monthly-inventory-manager">
        <h2>📊 月末在庫管理</h2>
        <p>在庫データがありません</p>
      </div>
    );
  }

  return (
    <div className="monthly-inventory-manager">
      <div className="monthly-header">
        <h2>📊 月末在庫管理</h2>
        <div className="date-selector">
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {[2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}年</option>
            ))}
          </select>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {Array.from({length: 12}, (_, i) => (
              <option key={i} value={i}>{i + 1}月</option>
            ))}
          </select>
        </div>
      </div>

      {/* 基本統計 */}
      <div className="monthly-stats">
        <div className="stats-grid">
          <div className="stat-card highlight">
            <h3>総在庫金額</h3>
            <p className="large-value">¥{inventoryData.totalValue.toLocaleString()}</p>
          </div>
          <div className="stat-card highlight">
            <h3>想定利益</h3>
            <p className="large-value">¥{inventoryData.totalPotentialProfit.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <h3>在庫品目数</h3>
            <p>{inventoryData.totalItems}品目</p>
          </div>
          <div className="stat-card">
            <h3>総在庫数</h3>
            <p>{inventoryData.totalStock}個</p>
          </div>
        </div>
      </div>

      {/* 在庫状況分析 */}
      <div className="inventory-analysis">
        <h3>📈 在庫状況分析</h3>
        <div className="analysis-grid">
          <div className="analysis-card good">
            <div className="analysis-header">
              <span className="icon">✅</span>
              <span className="title">適正在庫</span>
            </div>
            <div className="analysis-value">
              {inventoryData.totalItems - inventoryData.stockAnalysis.zeroStock - 
               inventoryData.stockAnalysis.lowStock - inventoryData.stockAnalysis.overStock}品目
            </div>
          </div>

          <div className="analysis-card warning">
            <div className="analysis-header">
              <span className="icon">⚠️</span>
              <span className="title">在庫少</span>
            </div>
            <div className="analysis-value">{inventoryData.stockAnalysis.lowStock}品目</div>
          </div>

          <div className="analysis-card danger">
            <div className="analysis-header">
              <span className="icon">🚫</span>
              <span className="title">在庫なし</span>
            </div>
            <div className="analysis-value">{inventoryData.stockAnalysis.zeroStock}品目</div>
          </div>

          <div className="analysis-card info">
            <div className="analysis-header">
              <span className="icon">📦</span>
              <span className="title">過剰在庫</span>
            </div>
            <div className="analysis-value">{inventoryData.stockAnalysis.overStock}品目</div>
          </div>
        </div>
      </div>

      {/* カテゴリ別分析 */}
      <div className="category-monthly-analysis">
        <h3>🏷️ カテゴリ別月末在庫</h3>
        <div className="category-table">
          <div className="table-header">
            <div>カテゴリ</div>
            <div>品目数</div>
            <div>在庫数</div>
            <div>在庫金額</div>
            <div>想定利益</div>
          </div>
          {Object.entries(inventoryData.categoryAnalysis)
            .sort(([,a], [,b]) => b.value - a.value)
            .map(([category, data]) => (
            <div key={category} className="table-row">
              <div className="category-name">{category}</div>
              <div>{data.items}品目</div>
              <div>{data.stock}個</div>
              <div>¥{data.value.toLocaleString()}</div>
              <div>¥{data.profit.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 棚卸し機能 */}
      <div className="stock-taking-section">
        <div className="section-header">
          <h3>📋 棚卸し機能</h3>
          {!showStockTaking && (
            <button onClick={startStockTaking} className="start-stocktaking-button">
              棚卸し開始
            </button>
          )}
        </div>

        {showStockTaking && (
          <div className="stock-taking-interface">
            <div className="stocktaking-header">
              <h4>実地棚卸し進行中</h4>
              <div className="stocktaking-progress">
                進捗: {Object.values(stockTakingData).filter(item => item.checked).length} / {Object.keys(stockTakingData).length}
              </div>
            </div>

            <div className="stocktaking-list">
              {inventoryData.products.map(product => {
                const takingData = stockTakingData[product.id];
                if (!takingData) return null;

                return (
                  <div key={product.id} className={`stocktaking-item ${takingData.checked ? 'checked' : ''}`}>
                    <div className="product-info">
                      <div className="product-name">{product.name}</div>
                      <div className="product-details">
                        {product.manufacturer && <span>{product.manufacturer}</span>}
                        <span className="category">{product.category}</span>
                      </div>
                    </div>

                    <div className="stock-comparison">
                      <div className="stock-item">
                        <label>システム在庫</label>
                        <span className="system-stock">{takingData.systemStock}</span>
                      </div>

                      <div className="stock-item">
                        <label>実地在庫</label>
                        <input
                          type="number"
                          value={takingData.actualStock}
                          onChange={(e) => updateActualStock(product.id, e.target.value)}
                          className="actual-stock-input"
                          min="0"
                        />
                      </div>

                      <div className="stock-item">
                        <label>差異</label>
                        <span className={`difference ${takingData.difference > 0 ? 'positive' : takingData.difference < 0 ? 'negative' : ''}`}>
                          {takingData.difference > 0 ? '+' : ''}{takingData.difference}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="stocktaking-actions">
              <button onClick={completeStockTaking} className="complete-button">
                棚卸し完了
              </button>
              <button onClick={() => setShowStockTaking(false)} className="cancel-button">
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 月末レポート要約 */}
      <div className="monthly-summary">
        <h3>📋 月末レポート要約</h3>
        <div className="summary-content">
          <div className="summary-item">
            <strong>総在庫評価額:</strong> ¥{inventoryData.totalValue.toLocaleString()}
          </div>
          <div className="summary-item">
            <strong>在庫回転の目安:</strong> 
            {inventoryData.stockAnalysis.deadStock > 0 
              ? `${inventoryData.stockAnalysis.deadStock}品目のデッドストックあり` 
              : '良好'
            }
          </div>
          <div className="summary-item">
            <strong>要注意品目:</strong> 
            在庫切れ{inventoryData.stockAnalysis.zeroStock}品目、
            在庫少{inventoryData.stockAnalysis.lowStock}品目
          </div>
          <div className="summary-item">
            <strong>最大カテゴリ:</strong> 
            {Object.entries(inventoryData.categoryAnalysis)
              .sort(([,a], [,b]) => b.value - a.value)[0]?.[0] || 'なし'} 
            (¥{Object.entries(inventoryData.categoryAnalysis)
              .sort(([,a], [,b]) => b.value - a.value)[0]?.[1].value.toLocaleString() || '0'})
          </div>
        </div>
      </div>

      <style jsx>{`
        .monthly-inventory-manager {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .monthly-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .date-selector {
          display: flex;
          gap: 1rem;
        }

        .date-selector select {
          padding: 0.5rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
        }

        .monthly-stats {
          margin-bottom: 3rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          text-align: center;
          border: 1px solid #e5e7eb;
        }

        .stat-card.highlight {
          background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
          border-color: #bbf7d0;
        }

        .stat-card h3 {
          color: #374151;
          margin: 0 0 1rem 0;
          font-size: 1rem;
        }

        .stat-card p {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #374151;
        }

        .large-value {
          font-size: 2rem !important;
          color: #059669 !important;
        }

        .inventory-analysis {
          margin-bottom: 3rem;
        }

        .analysis-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .analysis-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border-left: 4px solid;
        }

        .analysis-card.good { border-left-color: #10b981; }
        .analysis-card.warning { border-left-color: #f59e0b; }
        .analysis-card.danger { border-left-color: #ef4444; }
        .analysis-card.info { border-left-color: #3b82f6; }

        .analysis-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .analysis-header .icon {
          font-size: 1.2rem;
        }

        .analysis-header .title {
          font-weight: 600;
          color: #374151;
        }

        .analysis-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #374151;
        }

        .category-monthly-analysis {
          margin-bottom: 3rem;
        }

        .category-table {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-top: 1rem;
        }

        .table-header,
        .table-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.5fr 1.5fr;
          gap: 1rem;
          padding: 1rem;
          align-items: center;
        }

        .table-header {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
        }

        .table-row {
          border-bottom: 1px solid #f3f4f6;
        }

        .table-row:last-child {
          border-bottom: none;
        }

        .category-name {
          font-weight: 500;
          color: #374151;
        }

        .stock-taking-section {
          margin-bottom: 3rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .start-stocktaking-button {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .start-stocktaking-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .stock-taking-interface {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .stocktaking-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .stocktaking-progress {
          color: #6b7280;
          font-weight: 500;
        }

        .stocktaking-list {
          max-height: 400px;
          overflow-y: auto;
          margin-bottom: 1.5rem;
        }

        .stocktaking-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 0.5rem;
          transition: all 0.2s ease;
        }

        .stocktaking-item.checked {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        .product-info {
          flex: 1;
        }

        .product-name {
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .product-details {
          font-size: 0.9rem;
          color: #6b7280;
        }

        .product-details .category {
          margin-left: 0.5rem;
          padding: 0.125rem 0.5rem;
          background: #f3f4f6;
          border-radius: 4px;
        }

        .stock-comparison {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .stock-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }

        .stock-item label {
          font-size: 0.8rem;
          color: #6b7280;
          font-weight: 500;
        }

        .system-stock,
        .difference {
          font-weight: 600;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          min-width: 3rem;
          text-align: center;
        }

        .system-stock {
          background: #f3f4f6;
          color: #374151;
        }

        .actual-stock-input {
          width: 4rem;
          padding: 0.25rem 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          text-align: center;
        }

        .difference.positive {
          background: #dcfce7;
          color: #166534;
        }

        .difference.negative {
          background: #fee2e2;
          color: #dc2626;
        }

        .stocktaking-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .complete-button {
          padding: 0.75rem 2rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }

        .cancel-button {
          padding: 0.75rem 2rem;
          background: #6b7280;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }

        .monthly-summary {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 2rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .summary-content {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .summary-item {
          padding: 1rem;
          background: white;
          border-radius: 8px;
          color: #374151;
        }

        @media (max-width: 768px) {
          .monthly-inventory-manager {
            padding: 1rem;
          }

          .monthly-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .stock-comparison {
            flex-direction: column;
            gap: 0.5rem;
          }

          .stocktaking-item {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .table-header,
          .table-row {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }

          .table-header > div,
          .table-row > div {
            display: flex;
            justify-content: space-between;
          }

          .table-header > div::before,
          .table-row > div::before {
            content: attr(data-label);
            font-weight: 600;
          }
        }
      `}</style>
    </div>
  );
}

export default MonthlyInventoryManager;