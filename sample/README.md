# サンプルのソース

このフォルダーには祝日カレンダーのHTML、CSS、JavaScript、ブラウザー用データがあります。公開用ページは `scripts/build_static_site.py` で `dist/` に生成されます。

プロジェクトのルートで次を実行すると、`/index.html` としてローカル確認できます。

```powershell
python scripts/build_static_site.py
python -m http.server 8000 --directory dist
```

ブラウザーで <http://localhost:8000/index.html> を開いてください。詳細は[プロジェクトのREADME](../README.md)を参照してください。
