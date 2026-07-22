変換日記 v1.1

【内容】
- 日本語の日記をMyMemoryの無料翻訳APIで英語へ変換
- YouTube動画・プレイリストを画面内で再生
- 日記、英訳、使用したYouTube URLをブラウザ内に保存
- 過去の日記の表示、編集、削除
- 入力途中の下書きを自動保存
- スマートフォン対応
- 右上のボタンで夜モードと明るいモードを切り替え
- 選択した画面モードを次回も維持

【Kotodama Appsへの追加方法】
1. この「translation-diary」フォルダを、Kotodama Appsの「apps」フォルダ内へ入れます。
2. 最終的な配置は次の形です。

   kotodama-apps/
   └─ apps/
      └─ translation-diary/
         ├─ index.html
         ├─ style.css
         └─ script.js

3. apps.jsへのカード追加は、既存のapps.jsを確認してから次の工程で行います。

【注意】
- 日記は使用中のブラウザのlocalStorageへ保存されます。別の端末には同期されません。
- ブラウザのデータを削除すると、保存した日記も削除されます。
- 翻訳ボタンを押した時だけ、日本語本文がMyMemoryへ送信されます。
- YouTubeはブラウザの仕様上、自動再生されません。プレイヤーの再生ボタンを押してください。
