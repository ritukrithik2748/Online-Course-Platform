const TOKEN_KEY = "coursehub.token";

let memoryToken = null;

function decodeExpiry(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return 0;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const data = JSON.parse(atob(padded));
    return typeof data.exp === "number" ? data.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

function removeEverywhere() {
  memoryToken = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage can be unavailable in private modes */
  }
}

export const tokenStore = {
  get() {
    if (memoryToken) {
      if (decodeExpiry(memoryToken) > Date.now()) return memoryToken;
      removeEverywhere();
      return null;
    }
    let token = null;
    try {
      token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
    if (!token) return null;
    if (decodeExpiry(token) <= Date.now()) {
      removeEverywhere();
      return null;
    }
    memoryToken = token;
    return token;
  },

  set(token, remember = true) {
    memoryToken = token;
    try {
      if (remember) {
        localStorage.setItem(TOKEN_KEY, token);
        sessionStorage.removeItem(TOKEN_KEY);
      } else {
        sessionStorage.setItem(TOKEN_KEY, token);
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      /* keep the in-memory session if storage is blocked */
    }
  },

  clear() {
    removeEverywhere();
  },

  isPersistent() {
    try {
      return Boolean(localStorage.getItem(TOKEN_KEY));
    } catch {
      return false;
    }
  },
};
