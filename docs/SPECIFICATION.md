# 夜間救急どうぶつ病院マップ - システム仕様書

## 1. 概要

### 1.1 アプリケーション名
**夜間救急どうぶつ病院マップ**

### 1.2 目的
夜19時から朝9時までの間に受診診療可能な動物病院を効率的に検索・表示するWebアプリケーション

### 1.3 対象ユーザー
- ペットオーナー（緊急時の動物病院を探している方）
- 動物救急医療を必要とする方

### 1.4 利用環境
- デスクトップブラウザ
- モバイルブラウザ（レスポンシブ対応）
- インターネット接続必須

## 2. 機能仕様

### 2.1 主要機能

#### 2.1.1 病院検索機能
- **現在地検索**: デバイスの位置情報を使用した周辺病院検索
- **地名検索**: ユーザー入力による地名指定検索
- **検索範囲**: 最大15km圏内
- **検索戦略**: 3段階のフォールバック検索
  1. タイプベース検索（veterinary_care）
  2. キーワード検索（動物病院）
  3. テキスト検索（動物病院 獣医）

#### 2.1.2 地図表示機能
- Google Maps JavaScript API使用
- 病院位置のマーカー表示
- 病院名ラベル付きピン
- ズーム・パン操作対応
- モバイル最適化されたマーカーデザイン

#### 2.1.3 病院情報表示機能
- 病院名
- 住所
- 距離表示（m/km単位）
- 評価（★レーティング）
- 電話番号（実際の番号 or サンプル）

#### 2.1.4 アクション機能
- **電話発信**: ワンタップで病院へ直接電話
- **地図アプリ連携**: デバイスの地図アプリで経路案内
- **SNSシェア**: X(Twitter)でのシェア機能
- **フィードバック**: 感想・報告機能

### 2.2 UI/UX機能

#### 2.2.1 レスポンシブデザイン
- モバイルファーストデザイン
- 480px以下: モバイル最適化
- 768px以上: タブレット対応
- 1024px以上: デスクトップ対応

#### 2.2.2 アクセシビリティ対応
- WAI-ARIA準拠
- セマンティックHTML使用
- キーボードナビゲーション対応
- スクリーンリーダー対応
- 適切なコントラスト比

#### 2.2.3 ローディング・エラーハンドリング
- 検索中のローディング表示
- エラーメッセージ表示
- リトライ機能
- API認証失敗時の適切な表示

## 3. 技術仕様

### 3.1 技術スタック

#### 3.1.1 フロントエンド
- **HTML5**: セマンティックマークアップ
- **CSS3**: Grid/Flexbox、メディアクエリ
- **JavaScript (ES6+)**: クラスベース設計、アロー関数
- **Google Fonts**: Noto Sans JP

#### 3.1.2 外部API
- **Google Maps JavaScript API**: 地図表示・操作
- **Google Places API**: 病院検索・詳細情報取得
- **Google Geocoding API**: 地名→座標変換

#### 3.1.3 デバイスAPI
- **Geolocation API**: 現在地取得
- **Tel Protocol**: 電話発信機能

### 3.2 アーキテクチャ

#### 3.2.1 クラス設計
```javascript
class VetHospitalMap {
    // 主要プロパティ
    - map: Google Maps インスタンス
    - service: Places Service インスタンス
    - infoWindow: 情報ウィンドウ
    - currentLocation: 現在位置
    - markers: マーカー配列
    - domElements: DOM要素参照
    - searchStrategies: 検索戦略配列
    
    // 主要メソッド
    + initMap(): 地図初期化
    + performSearch(): 検索実行
    + searchHospitals(): 病院検索
    + displayResults(): 結果表示
    + createHospitalCard(): 病院カード作成
}
```

#### 3.2.2 ファイル構成
```
/
├── index.html              # メインHTML
├── script.js               # メインJavaScript
├── style.css               # スタイルシート
├── config.js               # API設定ファイル（.gitignore対象）
├── config.example.js       # 設定ファイルテンプレート
├── .gitignore             # Git除外設定
├── README.md              # プロジェクト説明
└── docs/
    └── SPECIFICATION.md   # 本仕様書
```

### 3.3 セキュリティ仕様

#### 3.3.1 APIキー管理
- config.jsファイルでAPIキー管理
- .gitignoreでconfig.jsを除外
- config.example.jsをテンプレートとして提供
- 本番環境では環境変数使用推奨

#### 3.3.2 HTTPS必須
- Google Maps API要件により要求される
- 地理位置情報取得に必要

## 4. データフロー

### 4.1 検索フロー

```
1. ユーザー入力（現在地 or 地名）
   ↓
2. 入力バリデーション
   ↓
3. 位置情報取得
   - 現在地: Geolocation API
   - 地名: Geocoding API
   ↓
4. Places API検索（3段階フォールバック）
   ↓
5. 結果フィルタリング（動物病院関連のみ）
   ↓
6. 距離計算・ソート
   ↓
7. 地図・リスト表示
```

### 4.2 エラーハンドリングフロー

```
エラー発生
↓
エラー種別判定
├── 位置情報エラー → 権限確認メッセージ
├── API認証エラー → APIキー確認メッセージ
├── ネットワークエラー → 再試行ボタン表示
└── 検索結果なし → 範囲拡大提案
```

## 5. パフォーマンス仕様

### 5.1 レスポンス時間
- 地図初期化: 3秒以内
- 検索実行: 5秒以内
- マーカー表示: 2秒以内

### 5.2 同時リクエスト制御
- Places API: 1回の検索につき最大3回のAPI呼び出し
- Geocoding API: 地名検索時1回

### 5.3 キャッシュ戦略
- ブラウザキャッシュ活用
- Google Maps APIの内部キャッシュ利用

## 6. 制約事項

### 6.1 API制限
- Google Maps API利用規約準拠
- Places APIクォータ制限
- 1日あたりのリクエスト数制限

### 6.2 ブラウザサポート
- Modern Browsers（ES6+対応）
- IE11以下は非対応

### 6.3 地理的制限
- 日本国内の動物病院のみ対象
- Google Places APIの日本語データに依存

## 7. 今後の拡張可能性

### 7.1 機能拡張候補
- 営業時間フィルタリング
- 専門科目フィルタリング
- ユーザーレビュー表示
- お気に入り機能
- 履歴機能

### 7.2 技術拡張候補
- PWA対応
- プッシュ通知
- オフライン機能
- 多言語対応

## 8. 運用・保守

### 8.1 監視項目
- API使用量監視
- エラー率監視
- レスポンス時間監視

### 8.2 更新・保守
- Google Maps API仕様変更対応
- ブラウザ互換性維持
- セキュリティアップデート

---

**更新履歴**
- 2025-06-24: 初版作成（リファクタリング後の仕様書）

**作成者**
- システム設計・開発: Claude Code
- プロジェクト管理: sohey-vet