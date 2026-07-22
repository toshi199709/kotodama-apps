const STORAGE_KEY = "translationDiaryEntries";
const DRAFT_KEY = "translationDiaryDraft";
const MUSIC_KEY = "translationDiaryMusicUrl";
const THEME_KEY = "translationDiaryTheme";

const japaneseDiary = document.querySelector("#japaneseDiary");
const englishDiary = document.querySelector("#englishDiary");
const japaneseCount = document.querySelector("#japaneseCount");
const englishStatus = document.querySelector("#englishStatus");
const translateButton = document.querySelector("#translateButton");
const saveButton = document.querySelector("#saveButton");
const youtubeUrl = document.querySelector("#youtubeUrl");
const loadMusicButton = document.querySelector("#loadMusicButton");
const playerWrap = document.querySelector("#playerWrap");
const youtubePlayer = document.querySelector("#youtubePlayer");
const musicMessage = document.querySelector("#musicMessage");
const historyList = document.querySelector("#historyList");
const emptyHistory = document.querySelector("#emptyHistory");
const entryCount = document.querySelector("#entryCount");
const toast = document.querySelector("#toast");
const themeToggle = document.querySelector("#themeToggle");
const themeIcon = document.querySelector("#themeIcon");

let entries = loadEntries();
let editingId = null;
let toastTimer;

restoreDraft();
restoreMusic();
renderHistory();
updateCount();
updateThemeButton();

japaneseDiary.addEventListener("input", () => {
  updateCount();
  saveDraft();
});
englishDiary.addEventListener("input", saveDraft);
youtubeUrl.addEventListener("change", () => localStorage.setItem(MUSIC_KEY, youtubeUrl.value.trim()));
translateButton.addEventListener("click", translateDiary);
saveButton.addEventListener("click", saveEntry);
loadMusicButton.addEventListener("click", loadMusic);
themeToggle.addEventListener("click", toggleTheme);

function toggleTheme() {
  const isDark = document.documentElement.dataset.theme === "dark";
  if (isDark) {
    delete document.documentElement.dataset.theme;
    localStorage.setItem(THEME_KEY, "light");
  } else {
    document.documentElement.dataset.theme = "dark";
    localStorage.setItem(THEME_KEY, "dark");
  }
  updateThemeButton();
}

function updateThemeButton() {
  const isDark = document.documentElement.dataset.theme === "dark";
  themeIcon.textContent = isDark ? "☀" : "☾";
  themeToggle.setAttribute("aria-label", isDark ? "明るいモードに切り替える" : "夜モードに切り替える");
  themeToggle.title = isDark ? "明るいモード" : "夜モード";
}

function loadEntries() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function restoreDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
    if (!draft) return;
    japaneseDiary.value = draft.japanese || "";
    englishDiary.value = draft.english || "";
    if (englishDiary.value) setEnglishStatus("編集中", true);
  } catch { /* 壊れた下書きは無視する */ }
}

function saveDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({
    japanese: japaneseDiary.value,
    english: englishDiary.value
  }));
}

function restoreMusic() {
  const savedUrl = localStorage.getItem(MUSIC_KEY);
  if (savedUrl) youtubeUrl.value = savedUrl;
}

function updateCount() {
  japaneseCount.textContent = `${japaneseDiary.value.length}文字`;
}

async function translateDiary() {
  const text = japaneseDiary.value.trim();
  if (!text) {
    showToast("先に日本語の日記を書いてください");
    japaneseDiary.focus();
    return;
  }

  setLoading(true);
  setEnglishStatus("変換中…", false);

  try {
    const chunks = splitByUtf8Bytes(text, 420);
    const translatedChunks = [];

    for (const chunk of chunks) {
      const endpoint = new URL("https://api.mymemory.translated.net/get");
      endpoint.searchParams.set("q", chunk);
      endpoint.searchParams.set("langpair", "ja|en");
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Translation request failed");
      const data = await response.json();
      const translated = data?.responseData?.translatedText;
      if (!translated || data?.responseStatus >= 400) throw new Error("Translation failed");
      translatedChunks.push(decodeHtml(translated));
    }

    englishDiary.value = translatedChunks.join(" ").replace(/\s+([,.!?])/g, "$1");
    saveDraft();
    setEnglishStatus("変換完了", true);
    showToast("英語に変換しました");
  } catch (error) {
    console.error(error);
    setEnglishStatus("変換エラー", false);
    showToast("翻訳できませんでした。少し時間を置いて試してください");
  } finally {
    setLoading(false);
  }
}

function splitByUtf8Bytes(text, maxBytes) {
  const encoder = new TextEncoder();
  const parts = [];
  let current = "";

  for (const character of text) {
    const candidate = current + character;
    if (encoder.encode(candidate).length > maxBytes && current) {
      const naturalBreak = Math.max(
        current.lastIndexOf("。") + 1,
        current.lastIndexOf("！") + 1,
        current.lastIndexOf("？") + 1,
        current.lastIndexOf("\n") + 1
      );

      if (naturalBreak > 0) {
        parts.push(current.slice(0, naturalBreak).trim());
        current = current.slice(naturalBreak) + character;
      } else {
        parts.push(current.trim());
        current = character;
      }
    } else {
      current = candidate;
    }
  }

  if (current.trim()) parts.push(current.trim());
  return parts.filter(Boolean);
}

function decodeHtml(value) {
  const area = document.createElement("textarea");
  area.innerHTML = value;
  return area.value;
}

function setLoading(isLoading) {
  translateButton.disabled = isLoading;
  translateButton.querySelector("span:first-child").textContent = isLoading ? "変換しています…" : "英語に変換する";
}

function setEnglishStatus(text, done) {
  englishStatus.textContent = text;
  englishStatus.classList.toggle("done", done);
}

function loadMusic() {
  const value = youtubeUrl.value.trim();
  const embedUrl = createYouTubeEmbedUrl(value);

  if (!embedUrl) {
    playerWrap.hidden = true;
    youtubePlayer.removeAttribute("src");
    musicMessage.textContent = "YouTubeの動画またはプレイリストURLを確認してください。";
    showToast("YouTube URLを確認してください");
    return;
  }

  youtubePlayer.src = embedUrl;
  playerWrap.hidden = false;
  musicMessage.textContent = "再生ボタンを押して、音楽と一緒に書き始めましょう。";
  localStorage.setItem(MUSIC_KEY, value);
}

function createYouTubeEmbedUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    let videoId = "";
    let playlistId = url.searchParams.get("list") || "";

    if (host === "youtu.be") videoId = url.pathname.split("/")[1] || "";
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (url.pathname === "/watch") videoId = url.searchParams.get("v") || "";
      if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/")[2] || "";
      }
    }

    if (videoId && /^[\w-]{6,}$/.test(videoId)) {
      const embed = new URL(`https://www.youtube.com/embed/${videoId}`);
      if (playlistId) embed.searchParams.set("list", playlistId);
      return embed.toString();
    }

    if (playlistId && /^[\w-]{6,}$/.test(playlistId)) {
      return `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(playlistId)}`;
    }
  } catch { /* URL形式でなければ無効 */ }
  return null;
}

function saveEntry() {
  const japanese = japaneseDiary.value.trim();
  const english = englishDiary.value.trim();

  if (!japanese || !english) {
    showToast("日本語と英語の両方を入力してください");
    return;
  }

  const now = new Date();
  const entry = {
    id: editingId || crypto.randomUUID(),
    japanese,
    english,
    musicUrl: youtubeUrl.value.trim(),
    createdAt: editingId ? entries.find(item => item.id === editingId)?.createdAt || now.toISOString() : now.toISOString(),
    updatedAt: now.toISOString()
  };

  if (editingId) {
    entries = entries.map(item => item.id === editingId ? entry : item);
  } else {
    entries.unshift(entry);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  clearEditor();
  renderHistory();
  showToast(editingId ? "日記を更新しました" : "今日の日記を保存しました");
  editingId = null;
}

function clearEditor() {
  japaneseDiary.value = "";
  englishDiary.value = "";
  localStorage.removeItem(DRAFT_KEY);
  updateCount();
  setEnglishStatus("変換待ち", false);
  saveButton.textContent = "この日記を保存する";
}

function renderHistory() {
  historyList.innerHTML = "";
  entryCount.textContent = `${entries.length}件`;
  emptyHistory.hidden = entries.length > 0;

  entries.forEach(entry => {
    const article = document.createElement("article");
    article.className = "history-item";

    const top = document.createElement("div");
    top.className = "history-top";

    const date = document.createElement("p");
    date.className = "history-date";
    date.textContent = formatDate(entry.createdAt);

    const actions = document.createElement("div");
    actions.className = "history-actions";
    actions.append(
      makeActionButton("開く", () => openEntry(entry.id)),
      makeActionButton("削除", () => deleteEntry(entry.id), true)
    );

    const preview = document.createElement("p");
    preview.className = "history-preview";
    preview.textContent = entry.japanese.length > 100 ? `${entry.japanese.slice(0, 100)}…` : entry.japanese;

    top.append(date, actions);
    article.append(top, preview);
    historyList.append(article);
  });
}

function makeActionButton(label, handler, isDelete = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `text-button${isDelete ? " delete" : ""}`;
  button.textContent = label;
  button.addEventListener("click", handler);
  return button;
}

function openEntry(id) {
  const entry = entries.find(item => item.id === id);
  if (!entry) return;
  editingId = id;
  japaneseDiary.value = entry.japanese;
  englishDiary.value = entry.english;
  youtubeUrl.value = entry.musicUrl || "";
  updateCount();
  saveDraft();
  setEnglishStatus("保存済み", true);
  saveButton.textContent = "この日記を更新する";
  window.scrollTo({ top: document.querySelector(".editor-grid").offsetTop - 30, behavior: "smooth" });
}

function deleteEntry(id) {
  if (!window.confirm("この日記を削除しますか？")) return;
  entries = entries.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  if (editingId === id) {
    editingId = null;
    clearEditor();
  }
  renderHistory();
  showToast("日記を削除しました");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(new Date(value));
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
