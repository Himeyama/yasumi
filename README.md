# 祝日.json

日本の祝日一覧をJSON形式で提供します。内閣府「国民の祝日」CSVをもとに、国民の祝日・振替休日・国民の休日を1955年から2027年まで収録しています。日本の祝日データを使った日付検索、休日カレンダー、祝日一覧の作成に利用できます。

## JSONファイル

| パス | 内容 |
| --- | --- |
| [`data/jp-holidays.json`](data/jp-holidays.json) | リポジトリ内のJSONデータ |
| [`sample/data/jp-holidays.json`](sample/data/jp-holidays.json) | Webアプリ用のデータコピー |
| `/data/jp-holidays.json` | GitHub Pagesで公開されるJSONのURL |
| [`data/source/syukujitsu.csv`](data/source/syukujitsu.csv) | 内閣府CSVの保存ファイル |

公開サイトでは `/data/jp-holidays.json` から取得できます。JSONはUTF-8、日付は `YYYY-MM-DD` 形式です。祝日レコードは日付順に並んでいます。

## JSONの構造

データは収録範囲、出典、祝日レコードをまとめたオブジェクトです。

```json
{
  "schemaVersion": 1,
  "country": "JP",
  "dateFormat": "YYYY-MM-DD",
  "typeDefinitions": {
    "national_holiday": "国民の祝日",
    "substitute_holiday": "振替休日",
    "citizen_holiday": "国民の休日"
  },
  "dateRange": {
    "from": "1955-01-01",
    "through": "2027-12-31"
  },
  "source": {
    "name": "内閣府「国民の祝日」",
    "url": "https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv",
    "file": "data/source/syukujitsu.csv",
    "encoding": "CP932",
    "generatedAt": "YYYY-MM-DD"
  },
  "holidays": [
    {
      "date": "YYYY-MM-DD",
      "name": "祝日名",
      "type": "national_holiday"
    }
  ]
}
```

各 `holidays` レコードには日付、祝日名、種別が入ります。

| `type` | 説明 |
| --- | --- |
| `national_holiday` | 国民の祝日 |
| `substitute_holiday` | 振替休日 |
| `citizen_holiday` | 前後を国民の祝日に挟まれた国民の休日 |

このJSONには内閣府CSVに掲載された祝日・休日を収録しています。日曜日を休日として扱う表示ルールはWebアプリ側で適用するため、日曜日自体はJSONのレコードに追加していません。日曜日が祝日と重なる場合、WebアプリではJSONにある祝日の名称を優先します。

## JSONを再生成する

同梱CSVからJSONとブラウザー用JavaScriptを生成します。生成スクリプトは `data/jp-holidays.json`、`data/jp-holidays.js`、`sample/data/` の各ファイルを更新します。

```powershell
python scripts/generate_jp_holidays.py
```

外部パッケージは不要です。CSVはCP932で読み込み、出力JSONはUTF-8で保存します。

## JSONの利用例

```js
const response = await fetch("/data/jp-holidays.json");
const data = await response.json();
const holidayByDate = new Map(
  data.holidays.map(({ date, name, type }) => [date, { name, type }]),
);

console.log(holidayByDate.get("2026-01-01"));
```

## Webカレンダーと公開

同梱のWebアプリは、月別カレンダーとリアルタイムの日付検索で祝日・休日を確認できます。公開ファイルを生成するには:

```powershell
python scripts/build_static_site.py
```

ローカル確認は次のコマンドで行い、<http://localhost:8000/index.html> を開きます。

```powershell
python -m http.server 8000 --directory dist
```

GitHub Pagesは `.github/workflows/pages.yml` が `dist/` をサイトのルートとして公開します。`main` へのpush時または手動実行時にJSONとページをビルドします。初回はリポジトリの **Settings → Pages → Build and deployment** で **GitHub Actions** を選択してください。

## データ出典

- [内閣府「国民の祝日について」](https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html)
- [内閣府「国民の祝日」CSV](https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv)
