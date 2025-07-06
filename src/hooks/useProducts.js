import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

export const useProducts = (user) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // productsRef をuseEffect外で定義（userがある場合のみ）
  const productsRef = user ? collection(db, 'users', user.uid, 'products') : null;

  // 商品コード自動採番
  const generateProductCode = () => {
    const existingCodes = products
      .map(p => p.productCode)
      .filter(code => code && code.startsWith('PROD'))
      .map(code => {
        const num = parseInt(code.replace('PROD', ''));
        return isNaN(num) ? 0 : num;
      });
    
    const maxNum = Math.max(0, ...existingCodes);
    return `PROD${String(maxNum + 1).padStart(3, '0')}`;
  };

  // 商品コード重複チェック
  const isProductCodeDuplicate = (productCode, excludeId = null) => {
    return products.some(p => 
      p.productCode === productCode && p.id !== excludeId
    );
  };

  // リアルタイム同期
  useEffect(() => {
    if (!user || !productsRef) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(productsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const productsData = [];
        querySnapshot.forEach((doc) => {
          productsData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setProducts(productsData);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error('Firestore同期エラー:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // 商品追加
  const addProduct = async (productData) => {
    if (!user || !productsRef) {
      return { success: false, error: 'ユーザーがログインしていません' };
    }

    try {
      // 商品コードが指定されていない場合は自動生成
      const productCode = productData.productCode || generateProductCode();
      
      // 商品コード重複チェック
      if (isProductCodeDuplicate(productCode)) {
        return { success: false, error: '商品コードが重複しています' };
      }

      const newProduct = {
        ...productData,
        productCode,
        stock: Number(productData.stock || 0),
        cost: Number(productData.cost || 0),
        price: Number(productData.price || 0),
        minStock: Number(productData.minStock || 0),
        volume: Number(productData.volume || 0),
        volumeUnit: productData.volumeUnit || 'ml',
        addedBy: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(productsRef, newProduct);
      return { success: true };
    } catch (error) {
      console.error('商品追加エラー:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // 商品更新
  const updateProduct = async (productId, updateData) => {
    if (!user) {
      return { success: false, error: 'ユーザーがログインしていません' };
    }

    try {
      // 商品コードが変更される場合は重複チェック
      if (updateData.productCode && isProductCodeDuplicate(updateData.productCode, productId)) {
        return { success: false, error: '商品コードが重複しています' };
      }

      const productDoc = doc(db, 'users', user.uid, 'products', productId);
      const processedData = {
        ...updateData,
        updatedAt: serverTimestamp()
      };

      // 数値フィールドの処理
      if (updateData.volume !== undefined) {
        processedData.volume = Number(updateData.volume);
      }
      if (updateData.stock !== undefined) {
        processedData.stock = Number(updateData.stock);
      }
      if (updateData.cost !== undefined) {
        processedData.cost = Number(updateData.cost);
      }
      if (updateData.price !== undefined) {
        processedData.price = Number(updateData.price);
      }
      if (updateData.minStock !== undefined) {
        processedData.minStock = Number(updateData.minStock);
      }

      await updateDoc(productDoc, processedData);
      return { success: true };
    } catch (error) {
      console.error('商品更新エラー:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // 商品削除
  const deleteProduct = async (productId) => {
    if (!user) {
      return { success: false, error: 'ユーザーがログインしていません' };
    }

    try {
      const productDoc = doc(db, 'users', user.uid, 'products', productId);
      await deleteDoc(productDoc);
      return { success: true };
    } catch (error) {
      console.error('商品削除エラー:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // 在庫数更新（よく使う機能なので専用関数）
  const updateStock = async (productId, newStock) => {
    return await updateProduct(productId, { 
      stock: Math.max(0, Number(newStock))
    });
  };

  // localStorageからFirestoreへの移行
  const migrateFromLocalStorage = async () => {
    try {
      const localData = localStorage.getItem('stockapp-products');
      if (!localData) return { success: true, message: 'ローカルデータなし' };

      const localProducts = JSON.parse(localData);
      console.log(`${localProducts.length}件のローカルデータを移行中...`);

      // 既存のFirestoreデータを確認
      if (products.length > 0) {
        const confirm = window.confirm(
          `Firestoreに既に${products.length}件のデータがあります。\n` +
          `ローカルデータ${localProducts.length}件を追加しますか？`
        );
        if (!confirm) return { success: false, message: 'ユーザーによりキャンセル' };
      }

      // バッチで移行
      const promises = localProducts.map(product => {
        const { id, addedAt, ...productData } = product; // Firestore用にidを除去
        return addProduct(productData);
      });

      await Promise.all(promises);

      // 移行完了後、localStorageをクリア
      localStorage.removeItem('stockapp-products');
      
      return { 
        success: true, 
        message: `${localProducts.length}件のデータを正常に移行しました` 
      };
    } catch (error) {
      console.error('データ移行エラー:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    migrateFromLocalStorage,
    generateProductCode,
    isProductCodeDuplicate
  };
};