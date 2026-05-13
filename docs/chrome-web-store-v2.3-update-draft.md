# Chrome Web Store v2.3 Update Draft

## Store Listing Notes

v2.3 のストアページ更新では、次の変更点がユーザーに伝わるように説明とスクリーンショットを見直します。

- popup の見た目をコンパクトに更新。
- `Show More` から Options と Check Domain を開けるように変更。
- 現在タブのドメインを popup で確認し、`Exclude Domains` へ追加可能。
- 設定変更後、再読み込みが必要なタブでは `Outdated Settings Detected.` と `R` バッジで通知。
- RUN / STOP 変更時に、現在タブを再読み込みするか確認。
- Optionsページの設定分類と Exclude Domains の操作性を改善。

## Suggested Release Notes

CodeToSpan for Translation v2.3 improves the popup and settings workflow.

- Added reload-required notifications for already open tabs.
- Added an `R` badge when the current tab needs reload.
- Added a popup domain check and quick add flow for Exclude Domains.
- Moved Options and Check Domain under Show More for a cleaner popup.
- Refreshed the Options page layout and Exclude Domains controls.
- Improved behavior so excluded pages do not show unnecessary reload warnings.

## Screenshot Checklist

Capture fresh screenshots after final manual verification:

- Popup default state with RUN / STOP and Show More.
- Popup expanded state with Options and Check Domain.
- Popup showing `Outdated Settings Detected.`.
- Popup showing a long domain and `Add` / `Added`.
- Extension icon with `R` badge.
- Options page overview.
- Exclude Domains list with the remove button on the left.

## Manual Store Update Tasks

- Update the long description to mention reload-required notification and domain add flow.
- Update screenshots to match the v2.3 UI.
- Add v2.3 release notes to the store update field.
- Confirm the privacy/data handling text still matches the extension behavior.
