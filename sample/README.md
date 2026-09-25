# 日本の祝日カレンダー サンプル

HTMLは相対パスでCSS、JavaScript、祝日データを読み込みます。`sample/data/` のデータを含めているため、`sample/index.html` を直接ブラウザーで開いて確認できます。

HTTPサーバーを使う場合は、プロジェクトのルート (`yasumi`) で起動します。

```powershell
python -m http.server 8000
```

ブラウザーで <http://localhost:8000/sample/> を開きます。ページは相対パスのJavaScriptデータを優先し、必要に応じて `sample/data/jp-holidays.json` を読み込みます。

JSONとブラウザー用データを作り直し、Sites用の `dist/` を作る場合:

```powershell
python scripts/generate_jp_holidays.py
python scripts/build_static_site.py
```
