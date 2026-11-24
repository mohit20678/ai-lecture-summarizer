// Turns OpenAI / network errors into a short, friendly message the UI can show.
// Returns null when we do not recognise the error, so callers can fall back
// to the original message.

function parseRetrySeconds(message) {
  const text = String(message || "");
  // OpenAI says "Please try again in 20h21m30.5s" (or a mix of d/h/m/s/ms).
  const match = text.match(/try again in ([0-9dhms.]+)/i);
  if (!match) return 0;
  const value = match[1].toLowerCase();
  let total = 0;
  const parts = value.match(/([0-9.]+)(d|h|m|s|ms)/g) || [];
  for (const part of parts) {
    const unit = part.endsWith("ms") ? "ms" : part.slice(-1);
    const amount = parseFloat(part);
    if (!Number.isFinite(amount)) continue;
    if (unit === "d") total += amount * 86400;
    else if (unit === "h") total += amount * 3600;
    else if (unit === "m") total += amount * 60;
    else if (unit === "ms") total += amount / 1000;
    else total += amount;
  }
  return Math.max(0, Math.ceil(total));
}

function describeAiError(err) {
  const message = String((err && err.message) || "");
  const status = Number(err && err.status);
  const retryAfter = parseRetrySeconds(message);

  if (status === 429) {
    const quota = /insufficient_quota|billing_hard_limit|exceeded your current quota|quota/i.test(message);
    if (quota) {
      return {
        status: 429,
        code: "quota",
        retryAfter,
        message:
          "Your OpenAI quota is used up." +
          (retryAfter ? " Try again in " + humanWait(retryAfter) + "." : " Please wait and try again.") +
          " Your file is still selected — press 'Try again' when ready.",
      };
    }
    return {
      status: 429,
      code: "rate",
      retryAfter,
      message:
        "OpenAI is limiting requests right now." +
        (retryAfter ? " Try again in " + humanWait(retryAfter) + "." : " Please wait a minute and try again."),
    };
  }

  if (status === 401 || /invalid api key|incorrect api key/i.test(message)) {
    return {
      status: 502,
      code: "auth",
      message: "OpenAI rejected the API key. Check OPENAI_API_KEY in server/.env and restart the server.",
    };
  }

  if (status === 404 || /model_not_found|does not exist|unknown model/i.test(message)) {
    return {
      status: 502,
      code: "model",
      message:
        "The AI model in server/.env is not available for this account. Check SUMMARY_MODEL and TRANSCRIBE_MODEL, or remove them to use the defaults.",
    };
  }

  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|fetch failed|network error/i.test(message)) {
    return {
      status: 503,
      code: "network",
      message: "Could not reach OpenAI. Check your internet connection and try again.",
    };
  }

  if (err && (err.name === "APIConnectionTimeoutError" || /timed out|timeout/i.test(message))) {
    return {
      status: 504,
      code: "timeout",
      message: "OpenAI took too long to answer. Try a shorter file, or try again in a moment.",
    };
  }

  return null;
}

function humanWait(seconds) {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return s + " seconds";
  const m = Math.floor(s / 60);
  if (m < 60) return m + " minute" + (m === 1 ? "" : "s");
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return h + " hour" + (h === 1 ? "" : "s") + (rest ? " and " + rest + " minutes" : "");
}

// Auto-retry wrapper: retries the function up to maxRetries times with delay
// when OpenAI returns a 429 rate-limit error.
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const friendly = describeAiError(err);
      if (friendly && friendly.code === "rate" && attempt < maxRetries) {
        const waitMs = friendly.retryAfter ? friendly.retryAfter * 1000 : baseDelay * attempt;
        console.log(`Rate limited. Retrying in ${Math.round(waitMs / 1000)}s (attempt ${attempt}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      throw err;
    }
  }
}

module.exports = { describeAiError, parseRetrySeconds, humanWait, retryWithBackoff };
