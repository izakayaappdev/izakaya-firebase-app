# 🚀 GitHub + Netlify自動デプロイ設定

## 前提条件確認
- ✅ GitHubアカウント: 登録済み
- ✅ Netlify CLI: インストール・ログイン済み
- ✅ プロジェクトフォルダ: `project/` 内に全ファイル存在
- ✅ PWAアプリ: 動作確認済み

## Step 1: GitHubリポジトリ作成

### 1-1. GitHub.comでリポジトリ作成
1. [GitHub.com](https://github.com) にログイン
2. 右上の「➕」→「New repository」をクリック
3. 設定:
   - **Repository name**: `izakaya-stock-app`
   - **Description**: `🍺 飲み屋向け在庫管理PWAアプリ`
   - **Public**: 選択（無料プランでも自動デプロイ可能）
   - **Initialize this repository with**: 何もチェックしない
4. 「Create repository」をクリック

### 1-2. ローカルからGitHub連携
```bash
# プロジェクトフォルダに移動
cd project

# Gitリポジトリ初期化
git init

# 全ファイルをステージング
git add .

# 初回コミット
git commit -m "Initial commit: 在庫管理PWAアプリ完成版

- ✅ PWA対応完了（インストール・オフライン対応）
- ✅ データ永続化（localStorage実装）
- ✅ 商品CRUD機能完全実装
- ✅ 利益計算・飲み放題管理
- ✅ 検索・フィルター・ソート機能
- ✅ レスポンシブデザイン完成"

# メインブランチ設定
git branch -M main

# GitHubリポジトリと連携（⚠️ URLは作成したリポジトリのものに変更）
git remote add origin https://github.com/[あなたのGitHubユーザー名]/izakaya-stock-app.git

# GitHubにプッシュ
git push -u origin main
```

## Step 2: Netlify自動デプロイ設定

### 2-1. Netlifyでサイト作成
1. [Netlify.com](https://netlify.com) にログイン
2. 「Import from Git」をクリック
3. 「GitHub」を選択
4. 権限確認画面で「Authorize Netlify」
5. 作成した `izakaya-stock-app` リポジトリを選択

### 2-2. ビルド設定
```
Site settings:
├── Build command: npm run build
├── Publish directory: dist
├── Base directory: (空白)
└── Functions directory: (空白)
```

### 2-3. デプロイ実行
1. 「Deploy site」をクリック
2. 初回デプロイ（3-5分程度）
3. ✅ 完了すると `https://[ランダム文字列].netlify.app` でアクセス可能

### 2-4. サイト名カスタマイズ（任意）
1. Site settings → Change site name
2. 推奨名: `izakaya-stock-manager` や `nomiya-stock`
3. 更新後: `https://izakaya-stock-manager.netlify.app`

## Step 3: 自動デプロイ確認

### 3-1. テスト用更新
```bash
# ローカルで簡単な変更
echo "/* Updated $(date) */" >> src/App.css

# コミット&プッシュ
git add .
git commit -m "test: 自動デプロイテスト"
git push origin main
```

### 3-2. 自動デプロイ確認
1. Netlifyダッシュボードで「Deploys」タブ確認
2. 新しいデプロイが自動で開始される
3. 2-3分後にサイトが更新される

## Step 4: PWA動作確認

### 4-1. モバイルでのインストールテスト
**iPhone/iPad (Safari)**:
1. デプロイされたサイトにアクセス
2. 共有ボタン → 「ホーム画面に追加」
3. アプリアイコンがホーム画面に表示される

**Android (Chrome)**:
1. サイトアクセス時に「アプリをインストール」通知
2. または右上メニュー → 「アプリをインストール」

### 4-2. オフライン動作確認
1. アプリをインストール
2. データを入力（商品追加等）
3. 機内モードON
4. アプリ起動 → 正常に動作すれば成功

## Step 5: 今後の開発フロー

### 日常の開発サイクル
```bash
# 機能開発
echo "新機能開発中..."

# ローカルテスト
npm run dev

# コミット&プッシュ
git add .
git commit -m "feat: ○○機能追加"
git push origin main

# 自動デプロイ → 本番反映 (2-3分)
```

### ブランチ運用（推奨）
```bash
# 機能開発用ブランチ
git checkout -b feature/barcode-reader
# 開発作業...
git commit -m "feat: バーコード読み取り機能"

# メインブランチにマージ
git checkout main
git merge feature/barcode-reader
git push origin main
```

## ⚠️ 重要な注意事項

### セキュリティ
- **APIキー**: 環境変数に設定（Netlify Environment variables）
- **秘密情報**: `.gitignore`に追加してコミット除外

### パフォーマンス
- **画像ファイル**: 適切な圧縮
- **依存関係**: 定期的な更新
- **バンドルサイズ**: 監視・最適化

### 今後の機能追加時
```bash
# 新機能ブランチ作成
git checkout -b feature/firebase-auth

# package.json更新
npm install firebase

# 開発・テスト
npm run dev

# コミット・プッシュで自動デプロイ
git commit -m "feat: Firebase認証機能実装"
git push origin feature/firebase-auth
```

## 🎉 完了確認リスト

- [ ] GitHubリポジトリ作成完了
- [ ] ローカルコード → GitHub プッシュ完了
- [ ] Netlify自動デプロイ設定完了
- [ ] PWAアプリがインターネット公開中
- [ ] モバイルデバイスでインストール確認
- [ ] オフライン動作確認
- [ ] データ永続化動作確認
- [ ] 自動デプロイ動作確認

## 次のステップ
✅ 基盤完成 → 🔥 本格的な機能開発開始！

1. **Firebase認証機能**（多店舗対応）
2. **バーコード読み取り機能**
3. **画像認識機能**
4. **天気連動AI提案**