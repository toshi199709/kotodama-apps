const STORAGE_KEY = "lyricsMemoData";

const titleInput = document.getElementById("titleInput");
const artistInput = document.getElementById("artistInput");
const youtubeInput = document.getElementById("youtubeInput");
const youtubePreview = document.getElementById("youtubePreview");
const lyricsInput = document.getElementById("lyricsInput");
const memoInput = document.getElementById("memoInput");

const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn");
const searchInput = document.getElementById("searchInput");
const memoList = document.getElementById("memoList");
const statusText = document.getElementById("statusText");

let memos = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let editingMemoId = null;

render();
updatePreview();

saveBtn.addEventListener("click", () => {
  if (!titleInput.value.trim()) {
    alert("曲名を入力してください");
    return;
  }

  const memoData = {
    title: titleInput.value,
    artist: artistInput.value,
    youtubeUrl: youtubeInput.value,
    lyrics: lyricsInput.value,
    memo: memoInput.value,
    updated: new Date().toLocaleString("ja-JP")
  };

  if (editingMemoId) {
    memos = memos.map(m =>
      m.id === editingMemoId ? { ...m, ...memoData } : m
    );
    statusText.textContent = "更新しました！";
  } else {
    memos.unshift({
      id: Date.now(),
      ...memoData,
      created: new Date().toLocaleString("ja-JP")
    });
    statusText.textContent = "保存しました！";
  }

  save();
  clearForm();
});

clearBtn.addEventListener("click", () => {
  clearForm();
  statusText.textContent = "入力をクリアしました。";
});

searchInput.addEventListener("input", render);
youtubeInput.addEventListener("input", updatePreview);

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
  render();
}

function clearForm() {
  editingMemoId = null;
  titleInput.value = "";
  artistInput.value = "";
  youtubeInput.value = "";
  lyricsInput.value = "";
  memoInput.value = "";
  saveBtn.textContent = "保存する";
  updatePreview();
}

function loadMemoToForm(memo) {
  editingMemoId = memo.id;

  titleInput.value = memo.title || "";
  artistInput.value = memo.artist || "";
  youtubeInput.value = memo.youtubeUrl || "";
  lyricsInput.value = memo.lyrics || "";
  memoInput.value = memo.memo || "";

  saveBtn.textContent = "更新する";
  statusText.textContent = "保存済みメモを編集中です。";

  updatePreview();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function getYouTubeVideoId(url) {
  if (!url) return "";

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname.includes("youtube.com")) {
      return parsedUrl.searchParams.get("v") || "";
    }

    if (parsedUrl.hostname.includes("youtu.be")) {
      return parsedUrl.pathname.replace("/", "");
    }

    return "";
  } catch {
    return "";
  }
}

function getYouTubeEmbedUrl(url) {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
}

function updatePreview() {
  const embedUrl = getYouTubeEmbedUrl(youtubeInput.value);

  if (!embedUrl) {
    youtubePreview.innerHTML =
      "<p>ここにYouTubeプレビューが表示されます。</p>";
    return;
  }

  youtubePreview.innerHTML = `
    <iframe
      width="100%"
      height="315"
      src="${embedUrl}"
      title="YouTube video player"
      frameborder="0"
      allowfullscreen>
    </iframe>
  `;
}

function render() {
  const keyword = searchInput.value.toLowerCase();

  const filtered = memos.filter(m =>
    (m.title || "").toLowerCase().includes(keyword) ||
    (m.artist || "").toLowerCase().includes(keyword) ||
    (m.lyrics || "").toLowerCase().includes(keyword) ||
    (m.memo || "").toLowerCase().includes(keyword) ||
    (m.youtubeUrl || "").toLowerCase().includes(keyword)
  );

  if (filtered.length === 0) {
    memoList.innerHTML = '<p class="empty">まだ保存済みメモはありません。</p>';
    return;
  }

  memoList.innerHTML = "";

  filtered.forEach(m => {
    const item = document.createElement("div");
    item.className = "memo-card compact";

    const hasVideo = getYouTubeEmbedUrl(m.youtubeUrl) ? "🎬" : "🎧";

    item.innerHTML = `
      <div class="memo-summary">
        <div class="memo-icon">${hasVideo}</div>
        <div>
          <h3>${m.title}</h3>
          <small>${m.artist || "アーティスト未入力"} / ${m.updated || m.created}</small>
        </div>
      </div>
    `;

    item.addEventListener("click", () => {
      loadMemoToForm(m);
    });

    memoList.appendChild(item);
  });
}