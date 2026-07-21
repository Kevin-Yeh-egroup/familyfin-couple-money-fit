(function attachQuizPairing(globalScope) {
  "use strict";

  const data =
    typeof module !== "undefined" && module.exports
      ? require("./data.js")
      : globalScope.QuizData;

  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const checksumLength = 2;
  const coreQuestions = data.questions;
  const legacyQuestions = [...data.questions, ...(data.personalizationQuestions || [])];
  const schemas = {
    M1: { prefix: "M1", payloadLength: 7, questions: legacyQuestions },
    M2: { prefix: "M2", payloadLength: 6, questions: coreQuestions }
  };
  const currentSchema = schemas.M2;

  function normalizeCode(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/O/g, "0")
      .replace(/[IL]/g, "1")
      .replace(/[^0-9A-Z]/g, "");
  }

  function encodeBase32(value, length) {
    let remaining = BigInt(value);
    let output = "";
    do {
      output = alphabet[Number(remaining % 32n)] + output;
      remaining /= 32n;
    } while (remaining > 0n);
    return output.padStart(length, "0");
  }

  function decodeBase32(value) {
    return [...value].reduce((total, character) => {
      const index = alphabet.indexOf(character);
      if (index < 0) throw new Error("配對碼包含無法辨識的字元。");
      return total * 32n + BigInt(index);
    }, 0n);
  }

  function checksum(value) {
    let hash = 2166136261;
    [...value].forEach((character) => {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619) >>> 0;
    });
    return encodeBase32(BigInt(hash & 1023), checksumLength);
  }

  function formatCode(raw) {
    return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`;
  }

  function encodeAnswers(answers) {
    let packed = 0n;
    currentSchema.questions.forEach((question) => {
      const answer = answers?.[question.id];
      const optionIndex = question.options.findIndex((option) => option.value === answer);
      const digit = optionIndex >= 0 ? optionIndex : 4;
      packed = packed * 5n + BigInt(digit);
    });
    const payload = encodeBase32(packed, currentSchema.payloadLength);
    const body = currentSchema.prefix + payload;
    return formatCode(body + checksum(body));
  }

  function decodeAnswers(code) {
    const raw = normalizeCode(code);
    const schema = schemas[raw.slice(0, 2)];
    if (!schema) {
      throw new Error("請輸入 M2 開頭的 10 碼配對碼，舊版 M1 配對碼也可以使用。");
    }
    const rawLength = schema.prefix.length + schema.payloadLength + checksumLength;
    if (raw.length !== rawLength) {
      throw new Error(`請輸入完整的 ${rawLength} 碼配對碼。`);
    }
    const body = raw.slice(0, -checksumLength);
    if (checksum(body) !== raw.slice(-checksumLength)) {
      throw new Error("配對碼似乎有誤，請再核對一次。");
    }

    let packed = decodeBase32(body.slice(schema.prefix.length));
    const limit = 5n ** BigInt(schema.questions.length);
    if (packed >= limit) throw new Error("這組配對碼無法使用，請重新產生。");

    const digits = new Array(schema.questions.length);
    for (let index = digits.length - 1; index >= 0; index -= 1) {
      digits[index] = Number(packed % 5n);
      packed /= 5n;
    }

    return schema.questions.reduce((answers, question, index) => {
      const digit = digits[index];
      answers[question.id] = digit === 4 ? "skipped" : question.options[digit].value;
      return answers;
    }, {});
  }

  function isCompleteCode(code) {
    const raw = normalizeCode(code);
    const schema = schemas[raw.slice(0, 2)];
    if (!schema) return false;
    return raw.length === schema.prefix.length + schema.payloadLength + checksumLength;
  }

  function isValidCode(code) {
    try {
      decodeAnswers(code);
      return true;
    } catch (_error) {
      return false;
    }
  }

  const pairing = {
    encodeAnswers,
    decodeAnswers,
    isValidCode,
    isCompleteCode,
    normalizeCode,
    currentPrefix: currentSchema.prefix,
    currentRawLength: currentSchema.prefix.length + currentSchema.payloadLength + checksumLength
  };
  if (typeof module !== "undefined" && module.exports) module.exports = pairing;
  globalScope.QuizPairing = pairing;
})(typeof globalThis !== "undefined" ? globalThis : window);
