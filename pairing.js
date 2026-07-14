(function attachQuizPairing(globalScope) {
  "use strict";

  const data =
    typeof module !== "undefined" && module.exports
      ? require("./data.js")
      : globalScope.QuizData;

  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const prefix = "M1";
  const payloadLength = 7;
  const checksumLength = 2;
  const rawLength = prefix.length + payloadLength + checksumLength;

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
    data.questions.forEach((question) => {
      const answer = answers?.[question.id];
      const optionIndex = question.options.findIndex((option) => option.value === answer);
      const digit = optionIndex >= 0 ? optionIndex : 4;
      packed = packed * 5n + BigInt(digit);
    });
    const payload = encodeBase32(packed, payloadLength);
    const body = prefix + payload;
    return formatCode(body + checksum(body));
  }

  function decodeAnswers(code) {
    const raw = normalizeCode(code);
    if (raw.length !== rawLength || !raw.startsWith(prefix)) {
      throw new Error("請輸入完整的 11 碼配對碼。");
    }
    const body = raw.slice(0, -checksumLength);
    if (checksum(body) !== raw.slice(-checksumLength)) {
      throw new Error("配對碼似乎有誤，請再核對一次。");
    }

    let packed = decodeBase32(body.slice(prefix.length));
    const limit = 5n ** BigInt(data.questions.length);
    if (packed >= limit) throw new Error("這組配對碼無法使用，請重新產生。");

    const digits = new Array(data.questions.length);
    for (let index = digits.length - 1; index >= 0; index -= 1) {
      digits[index] = Number(packed % 5n);
      packed /= 5n;
    }

    return data.questions.reduce((answers, question, index) => {
      const digit = digits[index];
      answers[question.id] = digit === 4 ? "skipped" : question.options[digit].value;
      return answers;
    }, {});
  }

  function isValidCode(code) {
    try {
      decodeAnswers(code);
      return true;
    } catch (_error) {
      return false;
    }
  }

  const pairing = { encodeAnswers, decodeAnswers, isValidCode, normalizeCode };
  if (typeof module !== "undefined" && module.exports) module.exports = pairing;
  globalScope.QuizPairing = pairing;
})(typeof globalThis !== "undefined" ? globalThis : window);
