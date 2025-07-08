import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useProducts } from '../../hooks/useProducts';
import '../../styles/InitialSetup.css';

function InitialSetup({ onComplete }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { addProduct } = useProducts(user); // ✅ user を渡すように修正
  
  const [currentStep, setCurrentStep] = useState(1);
  const [shopInfo, setShopInfo] = useState({
    shopName: ''
  });
  
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [masterProducts, setMasterProducts] = useState({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // ビール関連
  const [selectedBeerContainers, setSelectedBeerContainers] = useState([]);
  const [currentBeerContainerIndex, setCurrentBeerContainerIndex] = useState(0);
  
  // 他のカテゴリー関連
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);

  const categories = [
    { name: 'ビール', emoji: '🍺' },
    { name: 'カクテル・チューハイ', emoji: '🍹' },
    { name: '日本酒', emoji: '🍶' },
    { name: '焼酎', emoji: '🥃' },
    { name: 'ウイスキー・ブランデー', emoji: '🥃' },
    { name: 'ワイン', emoji: '🍷' },
    { name: 'シャンパン・スパークリング', emoji: '🥂' },
    { name: '泡盛', emoji: '🍶' },
    { name: 'ソフトドリンク', emoji: '🥤' },
    { name: 'ノンアルコール', emoji: '🚫' }
  ];

  const fetchMasterProducts = async () => {
    try {
      setLoadingProducts(true);
      const ADMIN_UID = 'slK7PLeu3lMnP5vE2MqytkKhiW13';
      
      const allQuery = query(collection(db, 'users', ADMIN_UID, 'products'));
      const allSnapshot = await getDocs(allQuery);
      
      const products = {};
      let totalFound = 0;
      
      allSnapshot.forEach((doc) => {
        const productData = doc.data();
        if (productData.isMaster === true && productData.isPopular === true) {
          const category = productData.category;
          
          if (!products[category]) {
            products[category] = [];
          }
          products[category].push(productData);
          totalFound++;
        }
      });
      
      setMasterProducts(products);
      addToast(`${totalFound}個の定番商品を読み込みました`, 'success');
      
    } catch (error) {
      console.error('商品取得エラー:', error);
      addToast('商品データの読み込みに失敗しました', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMasterProducts();
    }
  }, [user]);

  // ① 店舗名入力
  const handleShopInfoSubmit = (e) => {
    e.preventDefault();
    if (!shopInfo.shopName.trim()) {
      addToast('店名は必須です', 'error');
      return;
    }
    setCurrentStep(2); // ② ビールの質問へ
    addToast('お店情報を保存しました', 'success');
  };

  // ② ビールの質問：はい/いいえ
  const handleBeerDecision = (takesBeer) => {
    if (takesBeer) {
      setCurrentStep(3); // ③ ビール容器選択へ
      addToast('ビール容器を選択してください', 'info');
    } else {
      setCurrentStep(5); // ⑤ 他の取扱商品質問へ
      addToast('他の商品について確認します', 'info');
    }
  };

  // ③ ビール容器選択（複数選択）
  const handleBeerContainerToggle = (container) => {
    setSelectedBeerContainers(prev => {
      if (prev.includes(container)) {
        return prev.filter(c => c !== container);
      } else {
        return [...prev, container];
      }
    });
  };

  const handleBeerContainerSubmit = () => {
    if (selectedBeerContainers.length === 0) {
      addToast('容器を最低1つ選択してください', 'error');
      return;
    }
    setCurrentBeerContainerIndex(0);
    setCurrentStep(4); // ④ ビール商品選択へ
    addToast(`${selectedBeerContainers.length}種類の容器を選択しました`, 'success');
  };

  // ④ ビール商品選択
  const handleBeerProductToggle = (productIndex) => {
    const currentContainer = selectedBeerContainers[currentBeerContainerIndex];
    const categoryKey = `ビール_${currentContainer}`;
    
    setSelectedProducts(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        [productIndex]: !prev[categoryKey]?.[productIndex]
      }
    }));
  };

  const handleNextBeerContainer = () => {
    if (currentBeerContainerIndex < selectedBeerContainers.length - 1) {
      setCurrentBeerContainerIndex(prev => prev + 1);
    } else {
      // 全ビール容器完了
      setCurrentStep(5); // ⑤ 他の取扱商品質問へ
      addToast('ビール選択が完了しました', 'success');
    }
  };

  // ⑤⑥ 他の取扱商品質問：はい/とりあえず使ってみる
  const handleOtherProductsDecision = (choice) => {
    if (choice === 'yes') {
      setCurrentStep(7); // ⑦ 他のカテゴリー選択へ
      addToast('カテゴリーを選択してください', 'info');
    } else if (choice === 'tryout') {
      // とりあえず使ってみる
      handleSetupComplete(); // ⑥⑨ 初期登録完了
    }
  };

  // ⑦ 他のカテゴリー選択
  const handleCategoryToggle = (categoryName) => {
    setSelectedCategories(prev => 
      prev.includes(categoryName) 
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const handleCategorySubmit = () => {
    if (selectedCategories.length === 0) {
      addToast('カテゴリーを選択してください', 'error');
      return;
    }
    setCurrentCategoryIndex(0);
    setCurrentStep(8); // ⑧ 他の商品選択へ
    addToast(`${selectedCategories.length}カテゴリーを選択しました`, 'success');
  };

  // ⑧ 他の商品選択
  const handleProductToggle = (productIndex) => {
    const currentCategory = selectedCategories[currentCategoryIndex];
    
    setSelectedProducts(prev => ({
      ...prev,
      [currentCategory]: {
        ...prev[currentCategory],
        [productIndex]: !prev[currentCategory]?.[productIndex]
      }
    }));
  };

  const handleNextCategory = () => {
    if (currentCategoryIndex < selectedCategories.length - 1) {
      setCurrentCategoryIndex(prev => prev + 1);
    } else {
      // 全カテゴリー完了
      handleSetupComplete(); // ⑨ 最後の商品登録（初期登録完了）
    }
  };

  // ⑥⑨ 初期登録完了
  const handleSetupComplete = async () => {
    try {
      setLoading(true);
      let totalSelected = 0;
      
      console.log('設定完了処理開始');
      console.log('selectedProducts:', selectedProducts);
      
      // 各カテゴリーの商品を処理
      for (const [categoryKey, products] of Object.entries(selectedProducts)) {
        for (const [productIndex, isSelected] of Object.entries(products)) {
          if (isSelected) {
            let productData = null;
            
            if (categoryKey.startsWith('ビール_')) {
              const container = categoryKey.replace('ビール_', '');
              const beerProducts = masterProducts['ビール'] || [];
              productData = beerProducts.find(p => p.container === container && beerProducts.indexOf(p) == productIndex);
            } else {
              const categoryProducts = masterProducts[categoryKey] || [];
              productData = categoryProducts[parseInt(productIndex)];
            }
            
            if (productData && productData.name) {
              try {
                // 一時的に手動で最小限のデータで試してみる
                const minimalProduct = {
                  name: productData.name,
                  manufacturer: productData.manufacturer || '',
                  category: productData.category,
                  cost: Number(productData.cost || 0),
                  price: Number(productData.price || 0),
                  stock: 0, // 在庫0からスタート
                  minStock: Number(productData.minStock || 0),
                  description: productData.description || '',
                  productCode: productData.productCode || '',
                  volume: Number(productData.volume || 0),
                  volumeUnit: productData.volumeUnit || 'ml',
                  container: productData.container || '',
                  isNomihodai: Boolean(productData.isNomihodai),
                  profit: Number(productData.price || 0) - Number(productData.cost || 0),
                  profitRate: Number(productData.price || 0) > 0 ? 
                    ((Number(productData.price || 0) - Number(productData.cost || 0)) / Number(productData.price || 0) * 100) : 0,
                  isMaster: true,
                  isPopular: Boolean(productData.isPopular),
                  isActive: true,
                  isVisible: true, // ✅ 在庫画面で表示するためのフラグ
                  addedBy: user?.email || 'unknown'
                  // createdAt, updatedAt は useProducts で serverTimestamp() が設定される
                };
                
                console.log('商品追加開始:', minimalProduct.name);
                const result = await addProduct(minimalProduct);
                
                if (result.success) {
                  totalSelected++;
                  console.log('商品追加成功:', minimalProduct.name);
                } else {
                  console.error('商品追加失敗:', result.error);
                  addToast(`${minimalProduct.name}の追加に失敗: ${result.error}`, 'error');
                }
                
              } catch (productError) {
                console.error('商品追加エラー:', productError);
                console.error('問題のある商品データ:', productData);
                addToast(`商品追加エラー: ${productError.message}`, 'error');
              }
            } else {
              console.error('商品データが無効:', categoryKey, productIndex, productData);
            }
          }
        }
      }
      
      console.log('追加完了:', totalSelected, '商品');
      addToast(`初期設定が完了しました！${totalSelected}商品を追加しました`, 'success');
      
      // プロフィール保存を try-catch で個別処理
      try {
        // App.jsxが期待する形式でデータを作成
        const setupData = {
          setupCompleted: true,
          shopName: shopInfo?.shopName?.trim() || '',
          address: '',
          phone: '',
          selectedCategories: [], // 空配列で初期化
          selectedProducts: []    // 空配列で初期化（商品は既に追加済み）
        };
        
        console.log('=== 初期設定完了データ ===');
        console.log('setupData:', setupData);
        console.log('商品は既に', totalSelected, '個追加済み');
        console.log('onComplete関数呼び出し開始...');
        
        onComplete(setupData);
        console.log('onComplete関数呼び出し完了');
        
      } catch (profileError) {
        console.error('プロフィール保存エラー:', profileError);
        // 最小限の設定で強制完了
        console.log('フォールバック: 最小設定で完了');
        onComplete({ 
          setupCompleted: true,
          shopName: '',
          address: '',
          phone: '',
          selectedCategories: [],
          selectedProducts: []
        });
      }
      
    } catch (error) {
      console.error('設定エラー詳細:', error);
      addToast(`設定の保存に失敗しました: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loadingProducts) {
    return (
      <div className="initial-setup">
        <div className="setup-container">
          <div className="setup-header">
            <h1>🔄 商品データを読み込み中...</h1>
            <p>管理者が設定した定番商品を取得しています</p>
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  // ① 店舗名入力
  if (currentStep === 1) {
    return (
      <div className="initial-setup">
        <div className="setup-container">
          <div className="setup-header">
            <h1>🏪 店舗名を教えてください</h1>
            <p>お店の名前を入力してください</p>
            <div className="progress-bar">
              <div className="progress" style={{width: '11%'}}></div>
            </div>
          </div>

          <form onSubmit={handleShopInfoSubmit} className="setup-form">
            <div className="form-group">
              <label>店名 <span className="required">*</span></label>
              <input
                type="text"
                value={shopInfo.shopName}
                onChange={(e) => setShopInfo(prev => ({...prev, shopName: e.target.value}))}
                placeholder="例：居酒屋○○"
                required
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}
              />
            </div>

            <div className="step-actions">
              <button type="submit" className="next-button" style={{
                width: '100%',
                padding: '1rem 2rem',
                fontSize: '1.1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                次へ
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ② ビールの質問：はい/いいえ
  if (currentStep === 2) {
    return (
      <div className="initial-setup">
        <div className="setup-container">
          <div className="setup-header">
            <h1>🍺 ビールを取り扱っていますか？</h1>
            <p>お店でビールを提供するかお聞かせください</p>
            <div className="progress-bar">
              <div className="progress" style={{width: '22%'}}></div>
            </div>
          </div>

          <div style={{padding: '2rem', textAlign: 'center'}}>
            <div style={{display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap'}}>
              <button
                onClick={() => handleBeerDecision(true)}
                style={{
                  padding: '2rem 3rem',
                  fontSize: '1.2rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  minWidth: '150px'
                }}
              >
                <span style={{fontSize: '2rem'}}>🍺</span>
                <span>はい</span>
                <span style={{fontSize: '0.9rem'}}>取り扱っています</span>
              </button>

              <button
                onClick={() => handleBeerDecision(false)}
                style={{
                  padding: '2rem 3rem',
                  fontSize: '1.2rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  minWidth: '150px'
                }}
              >
                <span style={{fontSize: '2rem'}}>🚫</span>
                <span>いいえ</span>
                <span style={{fontSize: '0.9rem'}}>取り扱っていません</span>
              </button>
            </div>

            <div style={{marginTop: '2rem'}}>
              <button
                onClick={() => setCurrentStep(1)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ③ ビール容器選択
  if (currentStep === 3) {
    const containers = [
      { name: '生樽', emoji: '🍺', description: '生ビールサーバー用', detail: '10L・19L樽' },
      { name: '瓶', emoji: '🍾', description: '瓶ビール', detail: '中瓶・大瓶' },
      { name: '缶', emoji: '🥤', description: '缶ビール', detail: '350ml・500ml' }
    ];

    return (
      <div className="initial-setup">
        <div className="setup-container">
          <div className="setup-header">
            <h1>🍺 ビール容器選択</h1>
            <p>お店で提供するビールの形態を選択してください（複数選択可）</p>
            <div className="progress-bar">
              <div className="progress" style={{width: '33%'}}></div>
            </div>
          </div>

          <div className="beer-container-selection">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              padding: '1rem'
            }}>
              {containers.map(container => (
                <div 
                  key={container.name}
                  onClick={() => handleBeerContainerToggle(container.name)}
                  style={{
                    padding: '1.5rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                    backgroundColor: selectedBeerContainers.includes(container.name) ? '#f0f9ff' : 'white',
                    borderColor: selectedBeerContainers.includes(container.name) ? '#3b82f6' : '#e5e7eb'
                  }}
                >
                  <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>{container.emoji}</div>
                  <div style={{fontWeight: 'bold', marginBottom: '0.5rem'}}>{container.name}</div>
                  <div style={{color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.25rem'}}>{container.description}</div>
                  <div style={{color: '#9ca3af', fontSize: '0.8rem'}}>{container.detail}</div>
                  {selectedBeerContainers.includes(container.name) && (
                    <div style={{marginTop: '0.5rem', fontSize: '1.2rem'}}>✅</div>
                  )}
                </div>
              ))}
            </div>
            
            <div style={{textAlign: 'center', margin: '1rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px'}}>
              <p><strong>選択中の容器:</strong></p>
              <p style={{fontSize: '1.1rem', color: '#3b82f6'}}>
                {selectedBeerContainers.length > 0 ? selectedBeerContainers.join('、') : 'まだ選択されていません'}
              </p>
              <p style={{fontSize: '0.9rem', color: '#6b7280'}}>
                複数選択可能です。クリックで選択/解除できます。
              </p>
            </div>
          </div>

          <div className="step-actions">
            <button onClick={() => setCurrentStep(2)} style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer'
            }}>
              戻る
            </button>
            
            <button 
              onClick={handleBeerContainerSubmit}
              disabled={selectedBeerContainers.length === 0}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: selectedBeerContainers.length === 0 ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: selectedBeerContainers.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              次へ：商品選択 ({selectedBeerContainers.length}種類)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ④ ビール商品選択
  if (currentStep === 4) {
    const currentContainer = selectedBeerContainers[currentBeerContainerIndex];
    const allBeerProducts = masterProducts['ビール'] || [];
    const currentProducts = allBeerProducts.filter(product => 
      product.container === currentContainer
    );
    const categoryKey = `ビール_${currentContainer}`;
    const isLastContainer = currentBeerContainerIndex === selectedBeerContainers.length - 1;

    return (
      <div className="initial-setup">
        <div className="setup-container">
          <div className="setup-header">
            <h1>🍺 {currentContainer}ビール選択 ({currentBeerContainerIndex + 1}/{selectedBeerContainers.length})</h1>
            <p>{currentContainer}で提供するビールを選択してください</p>
            <div className="progress-bar">
              <div className="progress" style={{width: '44%'}}></div>
            </div>
          </div>

          <div className="product-selection">
            {currentProducts.length === 0 ? (
              <div style={{textAlign: 'center', padding: '2rem'}}>
                <p>📦 {currentContainer}ビールの定番商品がありません</p>
              </div>
            ) : (
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', padding: '1rem'}}>
                {currentProducts.map((product, index) => {
                  const originalIndex = allBeerProducts.findIndex(p => 
                    p.name === product.name && p.container === product.container
                  );
                  
                  return (
                    <div 
                      key={`${product.name}-${originalIndex}`}
                      onClick={() => handleBeerProductToggle(originalIndex)}
                      style={{
                        padding: '1rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: selectedProducts[categoryKey]?.[originalIndex] ? '#f0f9ff' : 'white',
                        borderColor: selectedProducts[categoryKey]?.[originalIndex] ? '#3b82f6' : '#e5e7eb'
                      }}
                    >
                      <div style={{fontWeight: 'bold', marginBottom: '0.5rem'}}>{product.name}</div>
                      <div style={{fontSize: '0.9rem', color: '#6b7280'}}>
                        <div>メーカー: {product.manufacturer}</div>
                        {product.description && <div>{product.description}</div>}
                        <div>容器: {product.container}</div>
                      </div>
                      {selectedProducts[categoryKey]?.[originalIndex] && (
                        <div style={{marginTop: '0.5rem', textAlign: 'right'}}>✅</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="step-actions">
            <button 
              onClick={handleNextBeerContainer} 
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {loading ? '設定中...' : (isLastContainer ? '他の商品について確認' : '次の容器')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ⑤⑥ 他の取扱商品質問：はい/とりあえず使ってみる
  if (currentStep === 5) {
    return (
      <div className="initial-setup">
        <div className="setup-container">
          <div className="setup-header">
            <h1>🍶 他にも取り扱い商品はありますか？</h1>
            <p>ビール以外の商品について教えてください</p>
            <div className="progress-bar">
              <div className="progress" style={{width: '55%'}}></div>
            </div>
          </div>

          <div style={{padding: '2rem', textAlign: 'center'}}>
            <div style={{display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center'}}>
              <button
                onClick={() => handleOtherProductsDecision('yes')}
                style={{
                  padding: '2rem 3rem',
                  fontSize: '1.2rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  width: '100%',
                  maxWidth: '350px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span style={{fontSize: '2rem'}}>📋</span>
                <span>はい、他の商品も選択したい</span>
                <span style={{fontSize: '0.9rem'}}>日本酒・焼酎・ワインなど</span>
              </button>

              <button
                onClick={() => handleOtherProductsDecision('tryout')}
                style={{
                  padding: '2rem 3rem',
                  fontSize: '1.2rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  width: '100%',
                  maxWidth: '350px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span style={{fontSize: '2rem'}}>🚀</span>
                <span>とりあえず使ってみる</span>
                <span style={{fontSize: '0.9rem'}}>ビールだけで開始</span>
              </button>
            </div>

            <div style={{marginTop: '2rem'}}>
              <button
                onClick={() => setCurrentStep(2)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ⑦ 他のカテゴリー選択
  if (currentStep === 7) {
    return (
      <div className="initial-setup">
        <div className="setup-container">
          <div className="setup-header">
            <h1>📋 カテゴリー選択</h1>
            <p>お店で扱う商品カテゴリーを選択してください（複数選択可）</p>
            <div className="progress-bar">
              <div className="progress" style={{width: '77%'}}></div>
            </div>
          </div>

          <div className="category-selection">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              padding: '1rem'
            }}>
              {categories.filter(cat => cat.name !== 'ビール').map(category => {
                const productCount = masterProducts[category.name]?.length || 0;
                const isSelected = selectedCategories.includes(category.name);
                
                return (
                  <div 
                    key={category.name}
                    onClick={() => productCount > 0 && handleCategoryToggle(category.name)}
                    style={{
                      padding: '1.5rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      cursor: productCount > 0 ? 'pointer' : 'not-allowed',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                      backgroundColor: isSelected ? '#f0f9ff' : (productCount === 0 ? '#f9fafb' : 'white'),
                      borderColor: isSelected ? '#3b82f6' : '#e5e7eb',
                      opacity: productCount === 0 ? 0.5 : 1
                    }}
                  >
                    <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>{category.emoji}</div>
                    <div style={{fontWeight: 'bold', marginBottom: '0.5rem'}}>{category.name}</div>
                    <div style={{fontSize: '0.9rem', color: '#6b7280'}}>
                      {productCount === 0 ? '商品なし' : `${productCount}商品`}
                    </div>
                    {isSelected && (
                      <div style={{marginTop: '0.5rem', fontSize: '1.2rem'}}>✅</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="step-actions">
            <button onClick={() => setCurrentStep(5)} style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer'
            }}>
              戻る
            </button>
            
            <button 
              onClick={handleCategorySubmit}
              disabled={selectedCategories.length === 0}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: selectedCategories.length === 0 ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: selectedCategories.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              次へ：商品選択 ({selectedCategories.length}カテゴリー)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ⑧ 他の商品選択
  if (currentStep === 8) {
    if (currentCategoryIndex >= selectedCategories.length) {
      handleSetupComplete();
      return null;
    }

    const currentCategory = selectedCategories[currentCategoryIndex];
    const isLastCategory = currentCategoryIndex === selectedCategories.length - 1;
    const currentProducts = masterProducts[currentCategory] || [];

    return (
      <div className="initial-setup">
        <div className="setup-container">
          <div className="setup-header">
            <h1>🍶 {currentCategory}選択 ({currentCategoryIndex + 1}/{selectedCategories.length})</h1>
            <p>{currentCategory}から必要な商品を選択してください</p>
            <div className="progress-bar">
              <div className="progress" style={{width: '88%'}}></div>
            </div>
          </div>

          <div className="product-selection">
            {currentProducts.length === 0 ? (
              <div style={{textAlign: 'center', padding: '2rem'}}>
                <p>📦 {currentCategory}の定番商品がありません</p>
              </div>
            ) : (
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', padding: '1rem'}}>
                {currentProducts.map((product, index) => (
                  <div 
                    key={`${product.name}-${index}`}
                    onClick={() => handleProductToggle(index)}
                    style={{
                      padding: '1rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: selectedProducts[currentCategory]?.[index] ? '#f0f9ff' : 'white',
                      borderColor: selectedProducts[currentCategory]?.[index] ? '#3b82f6' : '#e5e7eb'
                    }}
                  >
                    <div style={{fontWeight: 'bold', marginBottom: '0.5rem'}}>{product.name}</div>
                    <div style={{fontSize: '0.9rem', color: '#6b7280'}}>
                      <div>メーカー: {product.manufacturer}</div>
                      {product.description && <div>{product.description}</div>}
                      {product.container && <div>容器: {product.container}</div>}
                    </div>
                    {selectedProducts[currentCategory]?.[index] && (
                      <div style={{marginTop: '0.5rem', textAlign: 'right'}}>✅</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="step-actions">
            <button 
              onClick={handleNextCategory} 
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {loading ? '設定中...' : (isLastCategory ? '設定完了' : '次のカテゴリー')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default InitialSetup;