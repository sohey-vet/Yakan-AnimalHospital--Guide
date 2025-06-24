# 夜間救急どうぶつ病院マップ

現在診療中の動物病院を検索できるWebアプリケーションです。

## 機能

- 📍 現在地からの病院検索
- 🔍 地名指定での病院検索
- 🗺️ 地図上での病院表示（病院名付きピン）
- 📞 病院への直接電話
- 🗺️ 地図アプリでの経路案内

## セットアップ

### 1. リポジトリのクローン
```bash
git clone [リポジトリURL]
cd vet-hospital-map
```

### 2. Google Maps APIキーの設定
1. [Google Cloud Console](https://console.cloud.google.com)でプロジェクトを作成
2. 以下のAPIを有効化：
   - Maps JavaScript API
   - Places API
   - Geocoding API
3. APIキーを作成し、HTTPリファラー制限を設定
4. `config.example.js`を`config.local.js`にコピー
5. `config.local.js`内のAPIキーを実際のキーに置き換え

### 3. ローカルサーバーの起動
```bash
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` にアクセス

## APIキーのセキュリティ

⚠️ **重要**: 実際のAPIキーは公開しないでください

- `config.local.js`は git管理対象外
- 本番環境では環境変数を使用
- APIキーには適切な制限を設定

## 技術スタック

- HTML5
- CSS3
- Vanilla JavaScript
- Google Maps JavaScript API
- Google Places API

## ライセンス

© 2025 夜間救急どうぶつ病院マップ