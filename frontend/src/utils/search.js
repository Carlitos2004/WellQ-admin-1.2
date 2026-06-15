export const normalizeSearchText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const hasSearchQuery = (query) => normalizeSearchText(query).length > 0;

export const matchesSearch = (query, ...values) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  return values.some((value) => normalizeSearchText(value).includes(normalizedQuery));
};

export const rankSearchMatch = (query, ...values) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 0;

  const normalizedValues = values.map(normalizeSearchText).filter(Boolean);
  if (normalizedValues.some((value) => value.startsWith(normalizedQuery))) return 0;
  if (normalizedValues.some((value) => value.split(/\s+/).some((part) => part.startsWith(normalizedQuery)))) return 1;
  if (normalizedValues.some((value) => value.includes(normalizedQuery))) return 2;

  return 99;
};

export const filterAndSortBySearch = (items, query, getValues) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return items;

  return items
    .map((item, index) => {
      const values = getValues(item).flat().filter((value) => value !== null && value !== undefined);
      return {
        item,
        index,
        rank: rankSearchMatch(normalizedQuery, ...values),
        label: normalizeSearchText(values[0]),
      };
    })
    .filter(({ rank }) => rank < 99)
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      if (a.label && b.label && a.label !== b.label) return a.label.localeCompare(b.label);
      return a.index - b.index;
    })
    .map(({ item }) => item);
};
