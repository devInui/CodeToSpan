export function getReloadRequiredDifferences(
  current,
  latest,
  { getSettingDifferences, isExcludedDomainsDifference },
) {
  let differences = getSettingDifferences(current, latest);
  if (differences.length === 0 || !hasPageContext(current)) {
    return differences;
  }

  const currentApplies = shouldSettingsApplyToPage(current, current);
  const latestApplies = shouldSettingsApplyToPage(latest, current);

  if (!currentApplies && !latestApplies) {
    return [];
  }

  if (currentApplies === latestApplies) {
    differences = differences.filter(
      (difference) => !isExcludedDomainsDifference(difference),
    );
  }

  return differences;
}

export function hasPageContext(current) {
  return (
    typeof current.hostname === "string" &&
    typeof current.isBrowserAndPageLanguageDifferent === "boolean"
  );
}

export function shouldSettingsApplyToPage(settings, pageContext) {
  if (settings.excludedDomains.includes(pageContext.hostname)) {
    return false;
  }
  if (!settings.isLanguageCheckEnabled) {
    return true;
  }
  return pageContext.isBrowserAndPageLanguageDifferent;
}
