(function attachQuizTracking(globalScope) {
  "use strict";

  const storageKey = "familyfin-couple-money-fit-growth-v1";
  const version = 1;
  const maxRecords = 8;

  const clamp = (value, min = 0, max = 100) =>
    Math.max(min, Math.min(max, value));

  function localDateKey(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function normalizeAxes(axes) {
    if (!Array.isArray(axes)) return [];
    return axes
      .map((axis) => ({
        id: String(axis?.id || ""),
        label: String(axis?.shortLabel || axis?.label || ""),
        score: clamp(Math.round(Number(axis?.score) || 0))
      }))
      .filter((axis) => axis.id && axis.label);
  }

  function normalizeSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return null;
    const date = new Date(snapshot.testedAt);
    const testedOn = /^\d{4}-\d{2}-\d{2}$/.test(String(snapshot.testedOn || ""))
      ? String(snapshot.testedOn)
      : localDateKey(date);
    const axes = normalizeAxes(snapshot.axes);
    if (!testedOn || Number.isNaN(date.getTime()) || axes.length === 0) return null;
    return {
      testedAt: date.toISOString(),
      testedOn,
      score: clamp(Math.round(Number(snapshot.score) || 0)),
      typeKey: String(snapshot.typeKey || ""),
      typeName: String(snapshot.typeName || ""),
      axes
    };
  }

  function normalizeHistory(input) {
    const source = Array.isArray(input)
      ? input
      : Array.isArray(input?.records)
        ? input.records
        : [];
    const byDay = new Map();
    source.forEach((record) => {
      const normalized = normalizeSnapshot(record);
      if (normalized) byDay.set(normalized.testedOn, normalized);
    });
    return [...byDay.values()]
      .sort((left, right) => left.testedAt.localeCompare(right.testedAt))
      .slice(-maxRecords);
  }

  function createSnapshot(result, testedAt = new Date()) {
    const date = testedAt instanceof Date ? testedAt : new Date(testedAt);
    const axes = normalizeAxes(result?.axes);
    if (!result || Number.isNaN(date.getTime()) || axes.length === 0) {
      throw new Error("無法建立這次的追蹤紀錄。");
    }
    return {
      testedAt: date.toISOString(),
      testedOn: localDateKey(date),
      score: clamp(Math.round(Number(result.score) || 0)),
      typeKey: String(result.typeKey || ""),
      typeName: String(result.type?.name || result.typeName || ""),
      axes
    };
  }

  function upsertSnapshot(history, snapshot) {
    const normalized = normalizeSnapshot(snapshot);
    if (!normalized) return normalizeHistory(history);
    return normalizeHistory([...normalizeHistory(history), normalized]);
  }

  function containsSnapshot(history, snapshot) {
    const target = normalizeSnapshot(snapshot);
    if (!target) return false;
    return normalizeHistory(history).some((record) => {
      if (record.testedOn !== target.testedOn || record.score !== target.score) return false;
      return target.axes.every((axis) =>
        record.axes.some((savedAxis) => savedAxis.id === axis.id && savedAxis.score === axis.score)
      );
    });
  }

  function addMonths(dateValue, months = 3) {
    const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue || ""));
    const date = matched
      ? new Date(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]), 12)
      : new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;
    const originalDay = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + Number(months || 0));
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(originalDay, lastDay));
    return localDateKey(date);
  }

  function nextRetestDate(history) {
    const records = normalizeHistory(history);
    if (records.length === 0) return null;
    return addMonths(records[records.length - 1].testedOn, 3);
  }

  function serializeHistory(history) {
    return JSON.stringify({ version, records: normalizeHistory(history) });
  }

  const api = {
    storageKey,
    version,
    maxRecords,
    localDateKey,
    normalizeHistory,
    createSnapshot,
    upsertSnapshot,
    containsSnapshot,
    addMonths,
    nextRetestDate,
    serializeHistory
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  globalScope.QuizTracking = api;
})(typeof window !== "undefined" ? window : globalThis);
