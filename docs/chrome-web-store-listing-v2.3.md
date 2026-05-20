# Chrome Web Store Listing - v2.3

Chrome Web Store の入力欄は Markdown ではなくプレーンテキストとして扱う。各コードブロック内の本文をコピーして使う。

## English - en

### Package title

```text
CodeToSpan for Translation
```

### Package summary

```text
Improves machine translation of programming docs by protecting inline code and reducing layout issues.
```

### Description

```text
CodeToSpan for Translation helps programming learners read translated documentation more comfortably.

Programming documentation often contains inline code, keywords, and short code fragments. Browser translation can sometimes distort those parts or break the layout. CodeToSpan reduces these issues by replacing eligible code tags with span tags before translation.

Main features:
- Converts eligible code tags to span tags.
- Turns processing ON or OFF from the popup.
- Lets you configure which code elements are processed from the Options page.
- Skips pages whose language appears to match the browser language.
- Excludes specific hostnames from processing.
- Shows the current tab hostname from the popup with Check Domain.
- Adds the current hostname to Exclude Domains from the popup.
- Shows an R badge when an already open tab needs reload after settings change.
- Shows "Outdated Settings Detected." in the popup when the current tab is using old settings.

Important notes:
- Already open target tabs need to be reloaded after settings changes.
- When RUN / STOP is changed, CodeToSpan asks whether to reload the current tab. Automatic reload can be enabled in Options.
- Exclude Domains uses exact hostname matching. example.com does not match sub.example.com.
- Some dynamic web apps may behave unexpectedly if code elements are rewritten. If buttons or links become unresponsive, stop the extension for that page or add the hostname to Exclude Domains, then reload the page.

GitHub:
https://github.com/devInui/CodeToSpan

Release notes:
https://github.com/devInui/CodeToSpan/blob/master/RELEASE.md
```

### What's new / release notes

```text
CodeToSpan for Translation v2.3 improves popup, Options, and reload handling.

- Added reload-required notifications for already open tabs.
- Added an R badge when the current tab needs reload.
- Added "Outdated Settings Detected." details in the popup.
- Added Check Domain and Add flow for Exclude Domains.
- Added an option to automatically reload after RUN / STOP changes.
- Improved Options page grouping and Exclude Domains controls.
- Kept excluded pages from showing unnecessary reload warnings.
- Removed internal debug console output for detected hostnames.
```

## Japanese - ja

### パッケージのタイトル

```text
CodeToSpan for Translation
```

### パッケージの概要

```text
プログラミングドキュメントのページ翻訳で、インラインコードによる翻訳崩れやレイアウト崩れを軽減します。
```

### 説明

```text
CodeToSpan for Translation は、プログラミングドキュメントをブラウザのページ翻訳で読むときの読みづらさを軽減する Chrome 拡張機能です。

プログラミングドキュメントでは、インラインコード、キーワード、短いコード片が通常の文章とは異なる扱いを受け、機械翻訳時に翻訳の歪みやレイアウト崩れが起きることがあります。CodeToSpan は、対象となる code タグを翻訳前に span タグへ置き換えることで、この問題を軽減します。

主な機能:
- 対象ページ内の code タグを span タグへ変換します。
- popup から処理の RUN / STOP を切り替えられます。
- Options ページで、どの code 要素を処理対象にするか設定できます。
- ブラウザ言語とページ言語が同じページを処理対象から外せます。
- 特定の hostname を Exclude Domains に登録して処理対象から外せます。
- popup の Check Domain で現在タブの hostname を確認できます。
- popup から現在タブの hostname を Exclude Domains に追加できます。
- 設定変更後、すでに開いているタブに再読み込みが必要な場合は、拡張機能アイコンに R バッジを表示します。
- 現在タブが古い設定で動作している場合、popup に "Outdated Settings Detected." を表示します。

注意:
- 設定を変更した場合、すでに開いている対象タブでは、最新設定を反映するために再読み込みが必要です。
- RUN / STOP を変更した場合、現在タブを再読み込みするか確認します。Options で自動リロードを有効にすることもできます。
- Exclude Domains は hostname の完全一致で判定します。example.com は sub.example.com には一致しません。
- code 要素を動的に生成する Web アプリや、ハイドレーションを行う Web アプリでは、予期しない挙動が起きる場合があります。ボタンやリンクが反応しない場合は、そのページで拡張機能を停止するか、hostname を Exclude Domains に追加してからページを再読み込みしてください。

GitHub:
https://github.com/devInui/CodeToSpan

Release notes:
https://github.com/devInui/CodeToSpan/blob/master/RELEASE.md
```

### 更新内容

```text
CodeToSpan for Translation v2.3 では、popup、Options ページ、設定変更後の再読み込み通知を改善しました。

- すでに開いているタブに再読み込みが必要な場合の通知を追加しました。
- 現在タブに再読み込みが必要な場合、拡張機能アイコンに R バッジを表示するようにしました。
- popup に "Outdated Settings Detected." の詳細表示を追加しました。
- popup に Check Domain と Exclude Domains への Add 操作を追加しました。
- RUN / STOP 変更後に自動で再読み込みする設定を追加しました。
- Options ページの設定分類と Exclude Domains の操作性を改善しました。
- 除外中のページでは不要な再読み込み警告を出さないようにしました。
- hostname 検出時の内部デバッグ用 console 出力を削除しました。
```
