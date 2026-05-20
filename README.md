# CodeToSpan for Translation

日本語 | [English](README.en.md)

CodeToSpan for Translation は、プログラミングドキュメントをブラウザのページ翻訳で読むときに、インラインコードによる翻訳崩れやレイアウト崩れを軽減する Chrome 拡張機能です。

## 概要

プログラミングドキュメントでは、本文中の `<code>` 要素、キーワード、短いコード片が機械翻訳で不自然に扱われることがあります。

CodeToSpan は、対象となる `<code>` 要素を `<span>` 要素へ変換することで、ページ翻訳時の読みづらさを軽減します。

主な想定ユーザーは、英語のプログラミングドキュメントを日本語へ翻訳しながら読む学習者・開発者です。

## 主な機能

- 対象ページ内の `<code>` 要素を `<span>` 要素へ変換します。
- popup から処理の `RUN` / `STOP` を切り替えられます。
- 設定変更後、すでに開いているタブに再読み込みが必要な場合は popup と拡張機能アイコンの `R` バッジで通知します。
- popup の `Check Domain` で現在タブの hostname を確認できます。
- popup から現在タブの hostname を `Exclude Domains` に追加できます。
- Options ページで、ページ言語判定、code 要素の変換対象、`translate="no"` 付与、除外ドメイン、自動リロードを設定できます。
- `Exclude Domains` に登録した hostname は処理対象から除外されます。

## 使い方

1. Chrome ウェブストアから拡張機能をインストールします。
2. プログラミングドキュメントのページを開きます。
3. popup で `RUN` にします。
4. ブラウザのページ翻訳を使います。
5. 設定変更後に `R` バッジや `Outdated Settings Detected.` が表示された場合は、対象タブを再読み込みします。
6. 処理対象から外したいページでは、`Show More` > `Check Domain` で hostname を確認し、`Add` で `Exclude Domains` に追加します。

## Options

Options ページでは、設定を用途ごとに整理しています。

- `Page Language`: ブラウザ言語とページ言語が同じ場合に処理をスキップします。
- `Code Element Rules`: どの親要素内の code 要素を変換対象にするかを設定します。
- `Translate Attributes`: 機械翻訳から除外したい要素に `translate="no"` を追加します。
- `Settings Management`: RUN / STOP 変更後の自動リロードなどを設定します。
- `Exclude Domains`: 処理対象から外す hostname を管理します。

## 再読み込みが必要な場合

CodeToSpan は、ページ読み込み時の設定を使って処理を開始します。

そのため、Options や popup で設定を変更したあと、すでに開いている対象タブでは再読み込みが必要になる場合があります。

再読み込みが必要なタブでは、次のように通知します。

- popup に `Outdated Settings Detected.` を表示します。
- 拡張機能アイコンに `R` バッジを表示します。

`RUN` / `STOP` を切り替えた場合は、現在タブを再読み込みするか確認します。Options で自動リロードを有効にすることもできます。

## Exclude Domains

`Exclude Domains` は hostname の完全一致で判定します。

例:

- `example.com` は `example.com` に一致します。
- `example.com` は `sub.example.com` には一致しません。
- `https://example.com/path` のような URL 全体ではなく、`example.com` のような hostname を登録します。

v2.3 では、サブドメイン一致や URL パス単位の除外には対応していません。

## 注意事項

- 拡張機能をインストールした直後や設定変更後は、対象タブの再読み込みが必要です。
- code 要素を動的に生成する Web アプリや、ハイドレーションを行う Web アプリでは、予期しない挙動が起きる場合があります。
- ボタンやリンクが反応しない場合は、そのページで拡張機能を `STOP` にするか、hostname を `Exclude Domains` に追加してからページを再読み込みしてください。

## 関連リンク

- [Chrome ウェブストア](https://chromewebstore.google.com/detail/codetospan-for-translatio/ebnohmjaodacnofjhknnjjnchanjleng?utm_source=github&utm_medium=repository&utm_campaign=codetospan_readme)
- [Release Notes](RELEASE.md)
- [Q&A](docs/user-facing-qa.md)
