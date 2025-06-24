# 🔒 セキュア版 - 夜間救急どうぶつ病院マップ

## 🚀 即座にセットアップ・起動

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 環境変数の設定
```bash
# .envファイルは既に設定済み
# 必要に応じてAPIキーを変更
```

### 3. サーバー起動
```bash
npm start
```

### 4. アクセス
```
http://localhost:3000/secure-index.html
```

## 🛡️ セキュリティ機能

### ✅ レベル2セキュリティ実装済み

1. **APIキー保護**
   - サーバーサイドでAPIキー管理
   - クライアントからAPIキーが見えない
   - 環境変数で安全に管理

2. **プロキシアーキテクチャ**
   - 全てのGoogle Maps API呼び出しをサーバー経由
   - `/api/maps/js` - Maps JavaScript API
   - `/api/places/nearbysearch` - 病院検索
   - `/api/places/textsearch` - テキスト検索
   - `/api/places/details/:placeId` - 詳細情報
   - `/api/geocode` - 地名→座標変換

3. **セキュリティ対策**
   - **Helmet.js**: XSS、CSP、HSTS等の脆弱性対策
   - **CORS**: 許可されたオリジンのみアクセス可能
   - **Rate Limiting**: IP毎に15分間100リクエスト制限
   - **Input Validation**: 全てのAPI入力を検証

4. **監視・ログ**
   - 全APIリクエストをログ出力
   - エラートラッキング
   - ヘルスチェックエンドポイント `/api/health`

## 📁 ファイル構成

```
/
├── server.js                 # Express.jsプロキシサーバー
├── secure-index.html         # セキュア版HTML
├── secure-script.js          # セキュア版JavaScript
├── package.json              # Node.js依存関係
├── .env                      # 環境変数（gitignore）
├── .env.example              # 環境変数テンプレート
└── README-SECURE.md          # このファイル
```

## 🔧 開発・本番環境

### 開発環境
```bash
npm run dev  # nodemonで自動再起動
```

### 本番環境
```bash
NODE_ENV=production npm start
```

### 環境変数
```bash
# 必須
GOOGLE_MAPS_API_KEY=your_api_key_here

# オプション
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

## 📊 APIエンドポイント

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/api/maps/js` | GET | Google Maps JavaScript API |
| `/api/places/nearbysearch` | POST | 周辺検索 |
| `/api/places/textsearch` | POST | テキスト検索 |
| `/api/places/details/:id` | GET | 詳細情報 |
| `/api/geocode` | POST | 地名変換 |
| `/api/health` | GET | ヘルスチェック |

## 🚀 本番デプロイ

### Heroku
```bash
git add .
git commit -m "Deploy secure version"
git push heroku main
```

### Vercel
```bash
vercel --prod
```

### Docker
```bash
docker build -t vet-hospital-secure .
docker run -p 3000:3000 vet-hospital-secure
```

## 🔒 セキュリティチェックリスト

- [x] APIキーをサーバー側で管理
- [x] プロキシ経由でAPI呼び出し
- [x] CORS設定済み
- [x] Rate Limiting実装
- [x] セキュリティヘッダー設定
- [x] Input Validation実装
- [x] Error Handling実装
- [x] ログ出力設定

## 📈 パフォーマンス

- **キャッシュ**: Maps APIレスポンスを1時間キャッシュ
- **圧縮**: gzip圧縮有効
- **CDN対応**: 静的ファイルのCDN配信可能

---

**🎯 これで企業レベルのセキュリティを実現！**
APIキーが完全に保護され、不正利用を防止できます。