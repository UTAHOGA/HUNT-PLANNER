import {
  getAllHunts, getHuntCode, getHuntTitle, getUnitCode, getUnitName, normalizeBoundaryKey, getWeapon,
  weaponMatchesFilter, getHuntType, getHuntCategory, getNormalizedSex, getSpeciesDisplay,
  getHuntRecordKey, getConservationPermitAreaCodeSet, getConservationPermitAreaSpeciesUnitNameSet,
  getConservationPermitAreaSpeciesUnitCodeSet, getConservationPermitAreaAllowedTypeMap,
  normalizeHuntTypeLabel, normalizeHuntCode, isConservationPermitHunt, getUnitValue, safe, firstNonEmpty
} from '../hunts/hunt-data.js';
import { getSelectedHunt } from '../ui/ui-state.js';

const { HUNT_TYPE_ORDER, HUNT_CLASS_ORDER, SEX_ORDER, WEAPON_ORDER } = window.UOGA_CONFIG;

export function sortWithPreferredOrder(arr, pref) {
  const map = new Map(pref.map((v, i) => [v, i]));
  return arr.sort((a, b) => (map.has(a) ? map.get(a) : 99) - (map.has(b) ? map.get(b) : 99));
}

export function hasActiveMatrixSelections() {
  const searchInput = document.getElementById('searchInput');
  const speciesFilter = document.getElementById('speciesFilter');
  const sexFilter = document.getElementById('sexFilter');
  const huntTypeFilter = document.getElementById('huntTypeFilter');
  const huntCategoryFilter = document.getElementById('huntCategoryFilter');
  const weaponFilter = document.getElementById('weaponFilter');
  const unitFilter = document.getElementById('unitFilter');
  return [
    safe(searchInput?.value).trim(),
    speciesFilter?.value && speciesFilter.value !== 'All Species' ? speciesFilter.value : '',
    sexFilter?.value && sexFilter.value !== 'All' ? sexFilter.value : '',
    huntTypeFilter?.value && huntTypeFilter.value !== 'All' ? huntTypeFilter.value : '',
    huntCategoryFilter?.value && huntCategoryFilter.value !== 'All' ? huntCategoryFilter.value : '',
    weaponFilter?.value && weaponFilter.value !== 'All' ? weaponFilter.value : '',
    unitFilter?.value || ''
  ].filter(Boolean).length > 0;
}

export function hasReadyUnitSelection() {
  const unitFilter = document.getElementById('unitFilter');
  return !!safe(unitFilter?.value).trim();
}

export function getFilteredHunts(excludeKey = '') {
  const searchInput = document.getElementById('searchInput');
  const speciesFilter = document.getElementById('speciesFilter');
  const sexFilter = document.getElementById('sexFilter');
  const huntTypeFilter = document.getElementById('huntTypeFilter');
  const weaponFilter = document.getElementById('weaponFilter');
  const huntCategoryFilter = document.getElementById('huntCategoryFilter');
  const unitFilter = document.getElementById('unitFilter');

  const search = safe(searchInput?.value).trim().toLowerCase();
  const species = safe(speciesFilter?.value || 'All Species');
  const sex = safe(sexFilter?.value || 'All');
  const huntType = safe(huntTypeFilter?.value || 'All');
  const weapon = safe(weaponFilter?.value || 'All');
  const huntCategory = safe(huntCategoryFilter?.value || 'All');
  const unit = safe(unitFilter?.value || '');

  return getAllHunts().filter(h => {
    const sDisplay = getSpeciesDisplay(h);
    const hSex = getNormalizedSex(h);
    const hHuntType = getHuntType(h);
    const hWeapon = getWeapon(h);
    const hHuntCategory = getHuntCategory(h);
    const hUnit = getUnitValue(h);

    const searchOk = !search
      || getHuntTitle(h).toLowerCase().includes(search)
      || getHuntCode(h).toLowerCase().includes(search)
      || getUnitName(h).toLowerCase().includes(search);
    const speciesOk = excludeKey === 'species' || species === 'All Species' || sDisplay === species;
    const sexOk = excludeKey === 'sex' || sex === 'All' || hSex === sex;
    const huntTypeOk = excludeKey === 'huntType' || huntType === 'All' || hHuntType === huntType;
    const weaponOk = excludeKey === 'weapon' || weaponMatchesFilter(h, weapon);
    const huntCategoryOk = excludeKey === 'huntCategory' || huntCategory === 'All' || hHuntCategory === huntCategory;
    const unitOk = excludeKey === 'unit' || !unit || hUnit === unit;
    const conservationDisplayOk = huntType !== 'Conservation' || !!h?.syntheticConservationPermit;

    return searchOk && speciesOk && sexOk && huntTypeOk && weaponOk && huntCategoryOk && unitOk && conservationDisplayOk;
  });
}


export function getDisplayHunts() {
  const selectedHunt = getSelectedHunt();
  if (!hasActiveMatrixSelections() && !selectedHunt) return [];
  return getFilteredHunts();
}
export function shouldShowHuntBoundaries() {
  const toggleDwrUnits = document.getElementById('toggleDwrUnits');
  const selectedHunt = getSelectedHunt();
  return hasActiveMatrixSelections() || !!selectedHunt || !!toggleDwrUnits?.checked;
}
export function shouldShowAllHuntUnits() {
  const toggleDwrUnits = document.getElementById('toggleDwrUnits');
  const selectedHunt = getSelectedHunt();
  return !!toggleDwrUnits?.checked && !hasActiveMatrixSelections() && !selectedHunt;
}

export function refreshSelectionMatrix() {
  const speciesFilter = document.getElementById('speciesFilter');
  const sexFilter = document.getElementById('sexFilter');
  const huntTypeFilter = document.getElementById('huntTypeFilter');
  const weaponFilter = document.getElementById('weaponFilter');
  const huntCategoryFilter = document.getElementById('huntCategoryFilter');
  const unitFilter = document.getElementById('unitFilter');
  const searchInput = document.getElementById('searchInput');

  if (!speciesFilter || !sexFilter || !huntTypeFilter || !weaponFilter || !huntCategoryFilter || !unitFilter) return;

  const speciesOptions = sortWithPreferredOrder(
    Array.from(new Set(getAllHunts().map(getSpeciesDisplay).filter(Boolean))),
    ['Deer', 'Elk', 'Pronghorn', 'Moose', 'Bison', 'Black Bear', 'Cougar', 'Turkey', 'Desert Bighorn Sheep', 'Rocky Mountain Bighorn Sheep', 'Mountain Goat']
  );
  const previousSpecies = speciesFilter.value || 'All Species';
  speciesFilter.innerHTML = `<option value="All Species">All Species</option>` + speciesOptions.map(v => `<option value="${v}">${v}</option>`).join('');
  speciesFilter.value = speciesOptions.includes(previousSpecies) ? previousSpecies : 'All Species';

  const sexData = getFilteredHunts('sex');
  const sexOptions = sortWithPreferredOrder(Array.from(new Set(['All', ...sexData.map(getNormalizedSex).filter(Boolean)])), ['All', ...SEX_ORDER]);
  const prevSex = sexFilter.value || 'All';
  sexFilter.innerHTML = sexOptions.map(v => `<option value="${v}">${v}</option>`).join('');
  sexFilter.value = sexOptions.includes(prevSex) ? prevSex : 'All';

  const huntTypeData = getFilteredHunts('huntType');
  const huntTypeOptions = sortWithPreferredOrder(Array.from(new Set(['All', ...huntTypeData.map(getHuntType).filter(Boolean)])), ['All', ...HUNT_TYPE_ORDER]);
  const prevHuntType = huntTypeFilter.value || 'All';
  huntTypeFilter.innerHTML = huntTypeOptions.map(v => `<option value="${v}">${v}</option>`).join('');
  huntTypeFilter.value = huntTypeOptions.includes(prevHuntType) ? prevHuntType : 'All';

  const categoryData = getFilteredHunts('huntCategory');
  const categoryOptions = sortWithPreferredOrder(Array.from(new Set(['All', ...categoryData.map(getHuntCategory).filter(Boolean)])), ['All', ...HUNT_CLASS_ORDER]);
  const prevHuntCategory = huntCategoryFilter.value || 'All';
  huntCategoryFilter.innerHTML = categoryOptions.map(v => `<option value="${v}">${v}</option>`).join('');
  huntCategoryFilter.value = categoryOptions.includes(prevHuntCategory) ? prevHuntCategory : 'All';

  const weaponData = getFilteredHunts('weapon');
  const weaponOptions = sortWithPreferredOrder(Array.from(new Set(['All', ...weaponData.map(getWeapon).filter(Boolean)])), ['All', ...WEAPON_ORDER]);
  const prevWeapon = weaponFilter.value || 'All';
  weaponFilter.innerHTML = weaponOptions.map(v => `<option value="${v}">${v}</option>`).join('');
  weaponFilter.value = weaponOptions.includes(prevWeapon) ? prevWeapon : 'All';

  const hasNonUnitSelections = [
    safe(searchInput?.value).trim(),
    speciesFilter.value !== 'All Species' ? speciesFilter.value : '',
    sexFilter.value !== 'All' ? sexFilter.value : '',
    huntTypeFilter.value !== 'All' ? huntTypeFilter.value : '',
    huntCategoryFilter.value !== 'All' ? huntCategoryFilter.value : '',
    weaponFilter.value !== 'All' ? weaponFilter.value : ''
  ].filter(Boolean).length > 0;

  const unitsMap = new Map();
  const unitSource = hasNonUnitSelections ? getFilteredHunts('unit') : getAllHunts();
  unitSource.forEach(h => {
    const unitValue = getUnitValue(h);
    if (unitValue) unitsMap.set(unitValue, getUnitName(h) || unitValue);
  });
  const unitOptions = Array.from(unitsMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  const prevUnit = unitFilter.value || '';
  unitFilter.innerHTML = `<option value="">All DWR Hunt Units</option>` + unitOptions.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  unitFilter.value = unitOptions.some(([v]) => v === prevUnit) ? prevUnit : '';
}
