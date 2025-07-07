import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

// 管理者UID（固定）
const ADMIN_UID = 'slK7PLeu3lMnP5vE2MqytkKhiW13';

// カテゴリー順序（人気・需要順・10カテゴリー完全版）
const categories = [
  'ビール',
  'カクテル・チューハイ', 
  '日本酒',
  '焼酎',
  'ウイスキー・ブランデー',
  'ワイン',
  'シャンパン・スパークリング',
  '泡盛',
  'ソフトドリンク',
  'ノンアルコール'
];

// 初期設定フローコンポーネント
function InitialSetup({ user, onComplete, addToast }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [masterProducts, setMasterProducts] = useState({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Step 1: お店情報
  const [shopInfo, setShopInfo] = useState({
    shopName: '',
    address: '',
    phone: ''
  });
  
  // Step 2: カテゴリー選択
  const [selectedCategories, setSelectedCategories] = useState([]);
  
  // Step 3: 商品選択（新フロー）
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [showBeerContainerSelection, setShowBeerContainerSelection] = useState(false);
  const [selectedBeerContainers, setSelectedBeerContainers] = useState([]);
  const [currentBeerContainerIndex, setCurrentBeerContainerIndex] = useState(0);

  // 管理者マスター商品を取得（コンソールログのみ）
  const fetchMasterProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      console.log('📦 管理者のマスター商品を取得中...');
      console.log('🔑 使用中の管理者UID:', ADMIN_UID);
      
      // 管理者の商品コレクションから取得
      const masterProductsRef = collection(db, 'users', ADMIN_UID, 'products');
      console.log('📂 参照パス:', `users/${ADMIN_UID}/products`);
      
      // まずは全商品を取得（isMasterプロパティがない可能性があるため）
      const querySnapshot = await getDocs(masterProductsRef);
      console.log('📊 管理者の全商品数:', querySnapshot.size);
      
      const products = {};
      let totalProducts = 0;
      
      querySnapshot.forEach((doc) => {
        const product = { id: doc.id, ...doc.data() };
        const category = product.category;
        
        // 定番商品フラグとマスターフラグの確認
        console.log(`商品: ${product.name}, isMaster: ${product.isMaster}, isPopular: ${product.isPopular}, カテゴリー: ${category}, 容器: ${product.container}`);
        
        // 初期設定では定番商品 (isPopular: true) のみ表示
        if (category && product.name && product.isPopular === true) {
          if (!products[category]) {
            products[category] = [];
          }
          products[category].push(product);
          totalProducts++;
        }
      });
      
      setMasterProducts(products);
      console.log('✅ マスター商品取得完了:', Object.keys(products).length, 'カテゴリー');
      console.log('📋 取得カテゴリー:', Object.keys(products));
      console.log('📦 総商品数:', totalProducts);
      
      // 各カテゴリーの商品数をログ出力
      Object.entries(products).forEach(([category, items]) => {
        console.log(`  - ${category}: ${items.length}商品`);
        
        // ビールの場合は容器別の内訳も表示
        if (category === 'ビール') {
          const containerCounts = {};
          items.forEach(item => {
            const container = item.container || '容器未設定';
            containerCounts[container] = (containerCounts[container] || 0) + 1;
          });
          console.log('🍺 ビール容器別内訳:', containerCounts);
        }
      });
      
      if (Object.keys(products).length === 0) {
        console.log('⚠️ 定番商品が0件でした - 管理者が定番商品を設定してください');
      } else {
        console.log(`✅ ${Object.keys(products).length}カテゴリーの定番商品を読み込みました`);
      }
      
    } catch (error) {
      console.error('❌ マスター商品取得エラー:', error);
      console.error('❌ エラー詳細:', error.message);
      console.error('商品データの読み込みに失敗しました');
      setMasterProducts({});
    } finally {
      setLoadingProducts(false);
    }
  }, []); // ✅ useCallback で関数をメモ化

  // コンポーネントマウント時にマスター商品を取得
  useEffect(() => {
    if (user) {
      fetchMasterProducts();
    }
  }, [user, fetchMasterProducts]); // ✅ fetchMasterProducts を依存配列に追加

  // Step 1: お店情報の処理
  const handleShopInfoSubmit = (e) => {
    e.preventDefault();
    
    if (!shopInfo.shopName.trim()) {
      addToast('店舗名を教えてください！', 'error');
      return;
    }
    
    setCurrentStep(2);
    console.log('✅ お店情報を保存しました');
  };

  // Step 2: カテゴリー選択の処理
  const handleCategoryToggle = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleCategorySubmit = () => {
    // カテゴリー未選択でも設定完了可能
    if (selectedCategories.length === 0) {
      if (window.confirm('商品カテゴリーを選択せずに設定を完了しますか？\n後でいつでも商品を追加できます。')) {
        handleSetupComplete();
        return;
      }
      return;
    }
    
    // ビールが選択されている場合は最優先で処理するようにソート
    const sortedCategories = [...selectedCategories].sort((a, b) => {
      if (a === 'ビール') return -1;  // ビールを最初に
      if (b === 'ビール') return 1;   // ビールを最初に
      return 0; // その他は元の順序を維持
    });
    
    setSelectedCategories(sortedCategories);
    console.log('🍺 カテゴリー処理順序:', sortedCategories);
    
    // 商品の有無に関係なく商品選択ステップに進む
    setCurrentStep(3);
    setCurrentCategoryIndex(0);
    console.log(`✅ ${selectedCategories.length}カテゴリーを選択しました`);
  };

  // Step 3: 商品選択の処理（新フロー）
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
    const currentCategory = selectedCategories[currentCategoryIndex];
    console.log('🍺 現在のカテゴリー:', currentCategory);
    
    // ビールカテゴリーの場合、容器選択へ
    if (currentCategory === 'ビール' && !showBeerContainerSelection) {
      console.log('🍺 ビール容器選択画面に移行中...');
      setShowBeerContainerSelection(true);
      return;
    }
    
    // 通常の次のカテゴリーへの処理
    proceedToNextCategory();
  };

  const proceedToNextCategory = () => {
    if (currentCategoryIndex < selectedCategories.length - 1) {
      setCurrentCategoryIndex(prev => prev + 1);
    } else {
      // 最後のカテゴリーなら完了
      handleSetupComplete();
    }
  };

  const handlePrevCategory = () => {
    if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex(prev => prev - 1);
    } else {
      // 最初のカテゴリーならカテゴリー選択に戻る
      setCurrentStep(2);
    }
  };

  const handleSkipCategory = () => {
    const currentCategory = selectedCategories[currentCategoryIndex];
    setSelectedProducts(prev => ({
      ...prev,
      [currentCategory]: {}
    }));
    console.log(`✅ ${currentCategory}をスキップしました`);
    proceedToNextCategory();
  };

  // ビール容器選択の処理
  const handleBeerContainerToggle = (container) => {
    setSelectedBeerContainers(prev => 
      prev.includes(container) 
        ? prev.filter(c => c !== container)
        : [...prev, container]
    );
  };

  const handleBeerContainerNext = () => {
    if (selectedBeerContainers.length === 0) {
      console.log('⚠️ 少なくとも1つの容器を選択してください');
      return;
    }
    // 容器選択後、商品選択画面に移行
    setShowBeerContainerSelection(false);
    setCurrentBeerContainerIndex(0);
  };

  const handleBeerContainerPrev = () => {
    setShowBeerContainerSelection(false);
    setSelectedBeerContainers([]);
    setCurrentBeerContainerIndex(0);
  };

  const handleNextBeerContainer = () => {
    if (currentBeerContainerIndex < selectedBeerContainers.length - 1) {
      setCurrentBeerContainerIndex(prev => prev + 1);
    } else {
      // ビール容器選択完了、次のカテゴリーへ
      setShowBeerContainerSelection(false);
      setSelectedBeerContainers([]);
      setCurrentBeerContainerIndex(0);
      proceedToNextCategory();
    }
  };

  const handlePrevBeerContainer = () => {
    if (currentBeerContainerIndex > 0) {
      setCurrentBeerContainerIndex(prev => prev - 1);
    } else {
      // 最初の容器なら容器選択に戻る
      setCurrentBeerContainerIndex(0);
    }
  };

  // ショートカット機能
  const handleQuickSelection = (type) => {
    switch (type) {
      case 'popular':
        setSelectedCategories(['ビール', 'カクテル・チューハイ', '日本酒', '焼酎']);
        break;
      case 'all':
        setSelectedCategories([...categories]);
        break;
      case 'clear':
        setSelectedCategories([]);
        break;
    }
  };

  // 初期設定完了処理
  const handleSetupComplete = async () => {
    setLoading(true);
    try {
      // 選択された商品を整理
      const productsToAdd = [];
      
      selectedCategories.forEach(category => {
        if (category === 'ビール' && selectedBeerContainers.length > 0) {
          // ビールの場合、容器別に処理
          selectedBeerContainers.forEach(container => {
            const containerProducts = masterProducts[category]?.filter(product => 
              product.container === container
            ) || [];
            
            containerProducts.forEach((product, index) => {
              const containerSelection = selectedProducts[`${category}_${container}`] || {};
              if (containerSelection[index]) {
                productsToAdd.push({
                  ...product,
                  category,
                  container,
                  stock: 0,
                  minStock: 0,
                  profit: (product.price || 0) - (product.cost || 0),
                  profitRate: (product.price && product.cost) ? 
                    (((product.price - product.cost) / product.price) * 100) : 0,
                  isMaster: false, // 顧客が追加する商品は isMaster: false
                  isNomihodai: false,
                  addedBy: user.email,
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
              }
            });
          });
        } else {
          // ビール以外の通常処理
          const categorySelection = selectedProducts[category] || {};
          masterProducts[category]?.forEach((product, index) => {
            if (categorySelection[index]) {
              productsToAdd.push({
                ...product,
                category,
                stock: 0,
                minStock: 0,
                profit: (product.price || 0) - (product.cost || 0),
                profitRate: (product.price && product.cost) ? 
                  (((product.price - product.cost) / product.price) * 100) : 0,
                isMaster: false, // 顧客が追加する商品は isMaster: false
                isNomihodai: false,
                addedBy: user.email,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
          });
        }
      });

      console.log(`📦 追加予定商品: ${productsToAdd.length}品目`);

      const setupData = {
        shopName: shopInfo.shopName,
        address: shopInfo.address,
        phone: shopInfo.phone,
        selectedCategories,
        selectedProducts: productsToAdd
      };

      // onComplete関数の安全な実行
      if (typeof onComplete === 'function') {
        await onComplete(setupData);
        // このトーストは残す：設定完了の最終確認
        addToast('ご登録ありがとうございます！', 'success');
      } else {
        console.error('onComplete関数が正しく渡されていません');
        console.error('設定完了処理が実行できませんでした');
      }
      
    } catch (error) {
      console.error('初期設定エラー:', error);
      console.error(`設定の保存に失敗しました: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: お店情報入力
  if (currentStep === 1) {
    return (
      <div className="initial-setup">
        <div className="setup-container">
          <div className="setup-header">
            <h1>🏪 お店情報を入力</h1>
            <p>まずは基本的なお店の情報を教えてください</p>
            <div className="progress-bar">
              <div className="progress" style={{width: '33%'}}></div>
            </div>
          </div>

          <form onSubmit={handleShopInfoSubmit} className="setup-form">
            <div className="form-group">
              <label htmlFor="shopName">
                店名 <span className="required">*</span>
              </label>
              <input
                type="text"
                id="shopName"
                value={shopInfo.shopName}
                onChange={(e) => setShopInfo(prev => ({...prev, shopName: e.target.value}))}
                placeholder="例: 居酒屋 唐津"
              />
            </div>

            <div className="form-group">
              <label htmlFor="address">住所</label>
              <input
                type="text"
                id="address"
                value={shopInfo.address}
                onChange={(e) => setShopInfo(prev => ({...prev, address: e.target.value}))}
                placeholder="例: 佐賀県唐津市..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">電話番号</label>
              <input
                type="tel"
                id="phone"
                value={shopInfo.phone}
                onChange={(e) => setShopInfo(prev => ({...prev, phone: e.target.value}))}
                placeholder="例: 0955-xx-xxxx"
              />
            </div>

            <button type="submit" className="continue-button">
              次へ進む
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Step 2: カテゴリー選択
  if (currentStep === 2) {
    return (
      <div className="initial-setup">
        <div className="setup-container">
          <div className="setup-header">
            <h1>🍷 カテゴリー選択</h1>
            <p>お店で扱う商品カテゴリーを選んでください</p>
            <div className="progress-bar">
              <div className="progress" style={{width: '67%'}}></div>
            </div>
          </div>

          <div className="category-selection">
            <div className="quick-actions">
              <button onClick={() => handleQuickSelection('popular')} className="quick-button popular">
                人気4カテゴリー
              </button>
              <button onClick={() => handleQuickSelection('all')} className="quick-button all">
                全て選択
              </button>
              <button onClick={() => handleQuickSelection('clear')} className="quick-button clear">
                全てクリア
              </button>
            </div>

            <div className="categories-grid">
              {categories.map(category => {
                const productCount = masterProducts[category]?.length || 0;
                const isSelected = selectedCategories.includes(category);
                
                return (
                  <div
                    key={category}
                    className={`category-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleCategoryToggle(category)}
                  >
                    <div className="category-name">{category}</div>
                    <div className="product-count">
                      {loadingProducts ? '読み込み中...' : 
                       productCount > 0 ? `${productCount}商品` : '手動で追加可能'}
                    </div>
                    {isSelected && <div className="selected-indicator">✓</div>}
                  </div>
                );
              })}
            </div>

            <div className="selection-summary">
              選択中: {selectedCategories.length}カテゴリー
            </div>

            <div className="step-actions">
              <button onClick={() => setCurrentStep(1)} className="back-button">
                戻る
              </button>
              <button onClick={handleCategorySubmit} className="continue-button">
                {selectedCategories.length > 0 ? '商品を選択する' : '設定を完了する'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: 商品選択（新フロー）
  if (currentStep === 3) {
    // selectedCategoriesの範囲チェック
    if (currentCategoryIndex >= selectedCategories.length) {
      console.error('currentCategoryIndex out of range:', currentCategoryIndex, selectedCategories.length);
      return null;
    }

    // ビール容器別商品選択またはカテゴリー別商品選択
    const currentCategory = selectedCategories[currentCategoryIndex];
    
    // currentCategoryがundefinedの場合の処理
    if (!currentCategory) {
      console.error('currentCategory is undefined:', currentCategoryIndex, selectedCategories);
      return null;
    }

    // ビールカテゴリーで容器未選択の場合は自動的に容器選択画面を表示
    if (currentCategory === 'ビール' && selectedBeerContainers.length === 0 && !showBeerContainerSelection) {
      setShowBeerContainerSelection(true);
    }

    let currentProducts = [];
    let selectionKey = currentCategory;
    let displayTitle = currentCategory;

    // ビール容器選択画面
    if (showBeerContainerSelection) {
      return (
        <div className="initial-setup">
          <div className="setup-container">
            <div className="setup-header">
              <h1>🍺 ビールの容器を選択</h1>
              <p>お店で扱うビールの容器タイプを選んでください</p>
              <div className="progress-bar">
                <div className="progress" style={{width: '90%'}}></div>
              </div>
            </div>

            <div className="beer-container-selection">
              <div className="container-options">
                {['生樽', '瓶', '缶'].map(container => (
                  <div
                    key={container}
                    className={`container-card ${selectedBeerContainers.includes(container) ? 'selected' : ''}`}
                    onClick={() => handleBeerContainerToggle(container)}
                  >
                    <div className="container-name">{container}</div>
                    <div className="container-count">
                      {masterProducts['ビール']?.filter(p => p.container === container).length || 0}商品
                    </div>
                    {selectedBeerContainers.includes(container) && <div className="selected-indicator">✓</div>}
                  </div>
                ))}
              </div>

              <div className="step-actions">
                <button onClick={handleBeerContainerPrev} className="back-button">
                  戻る
                </button>
                <button onClick={handleBeerContainerNext} className="continue-button">
                  選択完了
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (currentCategory === 'ビール' && selectedBeerContainers.length > 0) {
      const currentContainer = selectedBeerContainers[currentBeerContainerIndex];
      currentProducts = masterProducts[currentCategory]?.filter(product => 
        product.container === currentContainer
      ) || [];
      selectionKey = `${currentCategory}_${currentContainer}`;
      displayTitle = `${currentCategory}（${currentContainer}）`;
    } else {
      currentProducts = masterProducts[currentCategory] || [];
    }

    return (
      <div className="initial-setup">
        <div className="setup-container">
          <div className="setup-header">
            <h1>📦 {displayTitle}の商品を選択</h1>
            <p>
              {currentCategoryIndex + 1} / {selectedCategories.length} カテゴリー
              {currentCategory === 'ビール' && selectedBeerContainers.length > 0 && 
                ` (${currentBeerContainerIndex + 1} / ${selectedBeerContainers.length} 容器)`
              }
            </p>
            <div className="progress-bar">
              <div className="progress" style={{width: '90%'}}></div>
            </div>
          </div>

          <div className="product-selection">
            {currentProducts.length > 0 ? (
              <div className="products-grid">
                {currentProducts.map((product, index) => {
                  const isSelected = selectedProducts[selectionKey]?.[index] || false;
                  
                  return (
                    <div
                      key={`${product.id}-${index}`}
                      className={`product-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleProductToggle(index)}
                    >
                      <div className="product-name">{product.name}</div>
                      <div className="product-details">
                        {product.manufacturer && <div>メーカー: {product.manufacturer}</div>}
                        {product.volume && <div>容量: {product.volume}{product.volumeUnit}</div>}
                        {product.container && <div>容器: {product.container}</div>}
                      </div>
                      {isSelected && <div className="selected-indicator">✓</div>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="no-products">
                <p>このカテゴリーには商品がありません</p>
                <p>スキップして次のカテゴリーに進んでください</p>
              </div>
            )}

            <div className="selection-summary">
              選択中: {Object.values(selectedProducts[selectionKey] || {}).filter(Boolean).length}商品
            </div>

            <div className="step-actions">
              <button onClick={handlePrevCategory} className="back-button">
                戻る
              </button>
              <button onClick={handleSkipCategory} className="skip-button">
                スキップ
              </button>
              <button onClick={handleNextCategory} className="continue-button">
                {currentCategory === 'ビール' 
                  ? '容器を選択する' 
                  : currentCategoryIndex === selectedCategories.length - 1 
                    ? '設定を完了する' 
                    : '次へ'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ローディング画面
  if (loading) {
    return (
      <div className="initial-setup">
        <div className="setup-container">
          <div className="setup-header">
            <h1>⚙️ 設定を保存中...</h1>
            <p>少々お待ちください</p>
          </div>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return null;
}

export default InitialSetup;