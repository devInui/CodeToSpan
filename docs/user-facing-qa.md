# CodeToSpan for Translation Q&A

## RUN / STOP は何を切り替えますか？

`RUN` は、対象ページ内の eligible な `<code>` 要素を `<span>` に変換する処理を有効にします。
`STOP` は、その処理を停止します。

すでに開いているタブでは、変更を反映するために再読み込みが必要です。

## なぜ現在タブのリロード確認が出ますか？

CodeToSpan の処理は、ページ読み込み時に現在の設定を使って初期化されます。
そのため、RUN / STOP や除外設定を変更したあと、すでに開いているタブには古い設定が残る場合があります。

確認でOKすると現在タブを再読み込みします。
キャンセルした場合、必要なタブでは拡張機能アイコンに `R` バッジが表示されます。

## `Outdated Settings Detected.` は何を意味しますか？

現在タブで使われている設定と、Optionsページに保存されている最新設定が違うことを意味します。

表示された場合は、`Reload` を押すと現在タブを最新設定で読み込み直せます。

## 拡張機能アイコンの `R` バッジは何ですか？

`R` は Reload required の意味です。

現在タブに最新設定を反映するには、ページの再読み込みが必要です。
タブを再読み込みすると、バッジは消えます。

## Page Language がONのとき、なぜ処理されないページがありますか？

`Only process pages in another language` がONの場合、ブラウザ言語とページ言語が同じページではコード変換をスキップします。

これは、機械翻訳の対象になりやすいページだけを処理するための設定です。

## Exclude Domains はどのように一致しますか？

v2.3 では、現在ページの `hostname` と登録済みドメインが完全一致した場合だけ除外します。

例:

- `example.com` は `example.com` に一致します。
- `example.com` は `sub.example.com` には一致しません。
- `https://example.com/path` のようなURL全体ではなく、`example.com` だけを見ます。

## なぜ `example.com` で `sub.example.com` が除外されませんか？

v2.3 では、意図しない広範囲の除外を避けるため、サブドメイン一致やワイルドカード一致は実装していません。

`sub.example.com` も除外したい場合は、別のドメインとして登録してください。

## v2.3 でURLパス単位の除外に対応しない理由は何ですか？

今回のv2.3修正では、壊れていた設定反映、リロード通知、popup操作の安定化を優先しています。

URLパス単位の除外は、既存の hostname 完全一致ルールとは別の設計が必要になるため、v2.3では対象外です。

## popup の `Check Domain` は何をしますか？

現在タブの `hostname` を表示します。

長い hostname は表示欄の中で横スクロールできます。

## popup の `Add` は何を追加しますか？

現在タブの `hostname` を Optionsページの `Exclude Domains` に追加します。

追加後に現在タブを再読み込みするか確認します。

## `Added` は何を意味しますか？

現在タブの hostname がすでに `Exclude Domains` に登録済みであることを意味します。

同じ hostname は重複追加しません。

## `Domain unavailable` はいつ表示されますか？

現在タブから通常の hostname を取得できない場合に表示されます。

例:

- `chrome://extensions`
- `about:blank`
- その他、拡張機能が通常のWebページとして扱えないページ

この場合、popupから `Exclude Domains` へ追加することはできません。
