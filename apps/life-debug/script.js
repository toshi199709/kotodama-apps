const STORAGE_KEY = "lifeDebugEntries";

const openBugFormButton = document.getElementById("openBugFormButton");
const closeBugFormButton = document.getElementById("closeBugFormButton");
const bugFormSection = document.getElementById("bugFormSection");
const bugForm = document.getElementById("bugForm");

const bugTitleInput = document.getElementById("bugTitle");
const lostMinutesSelect = document.getElementById("lostMinutes");
const bugMemoInput = document.getElementById("bugMemo");

const watchingCount = document.getElementById("watchingCount");
const resolvedCount = document.getElementById("resolvedCount");
const totalUpdateCount = document.getElementById("totalUpdateCount");

const emptyState = document.getElementById("emptyState");
const bugList = document.getElementById("bugList");
const toast = document.getElementById("toast");

let entries = loadEntries();
let toastTimer = null;

/* =========================
   保存データ
========================= */

function loadEntries() {
  const savedEntries = localStorage.getItem(STORAGE_KEY);

  if (!savedEntries) {
    return [];
  }

  try {
    const parsedEntries = JSON.parse(savedEntries);

    if (!Array.isArray(parsedEntries)) {
      return [];
    }

    return parsedEntries.map(normalizeEntry);
  } catch (error) {
    console.error("保存データの読み込みに失敗しました。", error);

    return [];
  }
}

function normalizeEntry(entry) {
  return {
    id: entry.id || createId(),
    title: entry.title || "名前のない発見",
    memo: entry.memo || "",
    lostMinutes: Number(entry.lostMinutes) || 0,
    status: entry.status || "watching",
    occurrenceCount: Number(entry.occurrenceCount) || 1,
    solution: entry.solution || "",
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString(),
    resolvedAt: entry.resolvedAt || null
  };
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* =========================
   登録フォーム
========================= */

function openBugForm() {
  bugFormSection.classList.remove("is-hidden");

  window.requestAnimationFrame(() => {
    bugFormSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    bugTitleInput.focus({
      preventScroll: true
    });
  });
}

function closeBugForm() {
  bugFormSection.classList.add("is-hidden");
  bugForm.reset();
}

function createEntry() {
  return {
    id: createId(),
    title: bugTitleInput.value.trim(),
    memo: bugMemoInput.value.trim(),
    lostMinutes: Number(lostMinutesSelect.value),
    status: "watching",
    occurrenceCount: 1,
    solution: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resolvedAt: null
  };
}

function handleBugFormSubmit(event) {
  event.preventDefault();

  const title = bugTitleInput.value.trim();

  if (!title) {
    bugTitleInput.focus();

    return;
  }

  entries.push(createEntry());

  saveEntries();
  renderEntries();

  bugForm.reset();
  bugFormSection.classList.add("is-hidden");

  showToast(
    "新しい発見を記録しました",
    "気づけたことが、最初のアップデートです。"
  );
}

/* =========================
   表示用の変換
========================= */

function formatDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function getLostMinutesText(minutes) {
  const numericMinutes = Number(minutes);

  if (numericMinutes === 0) {
    return "時間ロスはほとんどなし";
  }

  if (numericMinutes >= 30) {
    return "約30分以上";
  }

  return `約${numericMinutes}分`;
}

/* =========================
   観察中カード
========================= */

function createBugCard(entry) {
  const article = document.createElement("article");
  article.className = "bug-card";
  article.dataset.entryId = entry.id;

  const top = document.createElement("div");
  top.className = "bug-card__top";

  const title = document.createElement("h3");
  title.className = "bug-card__title";
  title.textContent = entry.title;

  const date = document.createElement("time");
  date.className = "bug-card__date";
  date.dateTime = entry.createdAt;
  date.textContent = formatDate(entry.createdAt);

  top.append(title, date);

  const meta = document.createElement("div");
  meta.className = "bug-card__meta";

  const statusBadge = document.createElement("span");
  statusBadge.className = "bug-card__badge";
  statusBadge.textContent = "🌱 観察中";

  const timeBadge = document.createElement("span");
  timeBadge.className = "bug-card__badge";
  timeBadge.textContent = `⏱ ${getLostMinutesText(entry.lostMinutes)}`;

  const occurrenceBadge = document.createElement("span");
  occurrenceBadge.className =
    "bug-card__badge bug-card__occurrence";
  occurrenceBadge.textContent =
    `🔍 気づいた回数 ${entry.occurrenceCount}回`;

  meta.append(
    statusBadge,
    timeBadge,
    occurrenceBadge
  );

  article.append(top, meta);

  if (entry.memo) {
    const memo = document.createElement("p");
    memo.className = "bug-card__memo";
    memo.textContent = entry.memo;

    article.appendChild(memo);
  }

  if (entry.solution) {
    const solution = document.createElement("p");
    solution.className = "bug-card__solution";

    const solutionLabel = document.createElement("span");
    solutionLabel.className = "bug-card__solution-label";
    solutionLabel.textContent = "整えるためのアイデア";

    solution.append(
      solutionLabel,
      document.createTextNode(entry.solution)
    );

    article.appendChild(solution);
  }

  const actions = document.createElement("div");
  actions.className = "bug-card__actions";

  const againButton = createActionButton(
    "🔁 もう一度起きた",
    "bug-action-button bug-action-button--again",
    () => recordOccurrence(entry.id)
  );

  const solutionButton = createActionButton(
    entry.solution
      ? "✏️ 方法を見直す"
      : "💡 整える方法",
    "bug-action-button bug-action-button--solution",
    () => openSolutionEditor(entry.id, article)
  );

  const resolvedButton = createActionButton(
    "🌿 整ったことにする",
    "bug-action-button bug-action-button--resolved",
    () => resolveEntry(entry.id)
  );

  actions.append(
    againButton,
    solutionButton,
    resolvedButton
  );

  article.appendChild(actions);

  return article;
}

function createActionButton(text, className, clickHandler) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = className;
  button.textContent = text;

  button.addEventListener("click", clickHandler);

  return button;
}

/* =========================
   もう一度起きた
========================= */

function recordOccurrence(entryId) {
  const entry = entries.find((item) => item.id === entryId);

  if (!entry) {
    return;
  }

  entry.occurrenceCount += 1;
  entry.updatedAt = new Date().toISOString();

  saveEntries();
  renderEntries();

  showToast(
    "新しい観察を追加しました",
    "繰り返しに気づくと、整えるヒントが見つかりやすくなります。"
  );
}

/* =========================
   整える方法
========================= */

function openSolutionEditor(entryId, cardElement) {
  const existingEditor =
    cardElement.querySelector(".solution-editor");

  if (existingEditor) {
    existingEditor.remove();

    return;
  }

  document
    .querySelectorAll(".solution-editor")
    .forEach((editor) => editor.remove());

  const entry = entries.find((item) => item.id === entryId);

  if (!entry) {
    return;
  }

  const editor = document.createElement("div");
  editor.className = "solution-editor";

  const label = document.createElement("label");
  label.className = "solution-editor__label";
  label.textContent =
    "暮らしを少し楽にする方法を考えてみましょう";

  const textarea = document.createElement("textarea");
  textarea.className = "solution-editor__input";
  textarea.maxLength = 200;
  textarea.placeholder =
    "例：玄関の右側に鍵を置く場所を作る";
  textarea.value = entry.solution;

  const buttonArea = document.createElement("div");
  buttonArea.className = "solution-editor__buttons";

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className =
    "solution-editor__button solution-editor__button--cancel";
  cancelButton.textContent = "閉じる";

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className =
    "solution-editor__button solution-editor__button--save";
  saveButton.textContent = "方法を保存する";

  cancelButton.addEventListener("click", () => {
    editor.remove();
  });

  saveButton.addEventListener("click", () => {
    saveSolution(entryId, textarea.value);
  });

  buttonArea.append(cancelButton, saveButton);
  editor.append(label, textarea, buttonArea);

  cardElement.appendChild(editor);

  textarea.focus();
}

function saveSolution(entryId, solutionText) {
  const entry = entries.find((item) => item.id === entryId);

  if (!entry) {
    return;
  }

  const solution = solutionText.trim();

  if (!solution) {
    showToast(
      "まだ空欄のようです",
      "小さなアイデアで大丈夫です。思いついた方法を残してみましょう。"
    );

    return;
  }

  entry.solution = solution;
  entry.updatedAt = new Date().toISOString();

  saveEntries();
  renderEntries();

  showToast(
    "整える方法を保存しました",
    "完璧な方法でなくても、試してみることがアップデートになります。"
  );
}

/* =========================
   整ったことにする
========================= */

function resolveEntry(entryId) {
  const entry = entries.find((item) => item.id === entryId);

  if (!entry) {
    return;
  }

  entry.status = "resolved";
  entry.resolvedAt = new Date().toISOString();
  entry.updatedAt = new Date().toISOString();

  saveEntries();
  renderEntries();

  showToast(
    "暮らしがひとつ整いました",
    "大きさに関係なく、楽になった変化は大切なアップデートです。"
  );
}

/* =========================
   整った記録
========================= */

function createResolvedSection() {
  let section = document.getElementById("resolvedSection");

  if (section) {
    return section;
  }

  section = document.createElement("section");
  section.className = "resolved-section";
  section.id = "resolvedSection";

  const listSection = document.querySelector(".list-section");

  listSection.insertAdjacentElement("afterend", section);

  return section;
}

function createResolvedCard(entry) {
  const article = document.createElement("article");
  article.className = "resolved-card";

  const top = document.createElement("div");
  top.className = "resolved-card__top";

  const title = document.createElement("h3");
  title.className = "resolved-card__title";
  title.textContent = `🌿 ${entry.title}`;

  const date = document.createElement("time");
  date.className = "resolved-card__date";
  date.dateTime = entry.resolvedAt || entry.updatedAt;
  date.textContent = formatDate(
    entry.resolvedAt || entry.updatedAt
  );

  top.append(title, date);

  const message = document.createElement("p");
  message.className = "resolved-card__message";
  message.textContent =
    `気づいた回数：${entry.occurrenceCount}回`;

  article.append(top, message);

  if (entry.solution) {
    const solution = document.createElement("p");
    solution.className = "bug-card__solution";

    const solutionLabel = document.createElement("span");
    solutionLabel.className = "bug-card__solution-label";
    solutionLabel.textContent = "試した方法";

    solution.append(
      solutionLabel,
      document.createTextNode(entry.solution)
    );

    article.appendChild(solution);
  }

  return article;
}

function renderResolvedEntries(resolvedEntries) {
  const section = createResolvedSection();

  section.innerHTML = "";

  const headingArea = document.createElement("div");
  headingArea.className = "section-title-row";

  const headingText = document.createElement("div");

  const label = document.createElement("p");
  label.className = "section-label";
  label.textContent = "Life Update";

  const heading = document.createElement("h2");
  heading.textContent = "整ったこと";

  headingText.append(label, heading);
  headingArea.appendChild(headingText);

  section.appendChild(headingArea);

  if (resolvedEntries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "resolved-empty";
    empty.textContent =
      "整った記録はまだありません。観察するだけでも、暮らしを知る大切な一歩です。";

    section.appendChild(empty);

    return;
  }

  const list = document.createElement("div");
  list.className = "resolved-list";

  const newestFirstEntries = [...resolvedEntries].sort(
    (a, b) => {
      return new Date(
        b.resolvedAt || b.updatedAt
      ) - new Date(
        a.resolvedAt || a.updatedAt
      );
    }
  );

  newestFirstEntries.forEach((entry) => {
    list.appendChild(createResolvedCard(entry));
  });

  section.appendChild(list);
}

/* =========================
   全体表示
========================= */

function renderEntries() {
  bugList.innerHTML = "";

  const watchingEntries = entries.filter(
    (entry) => entry.status === "watching"
  );

  const resolvedEntries = entries.filter(
    (entry) => entry.status === "resolved"
  );

  watchingCount.textContent = watchingEntries.length;
  resolvedCount.textContent = resolvedEntries.length;

  const totalDiscoveries = entries.reduce(
    (total, entry) => total + entry.occurrenceCount,
    0
  );

  totalUpdateCount.textContent = totalDiscoveries;

  if (watchingEntries.length === 0) {
    emptyState.classList.remove("is-hidden");
  } else {
    emptyState.classList.add("is-hidden");
  }

  const newestFirstEntries = [...watchingEntries].sort(
    (a, b) => {
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    }
  );

  newestFirstEntries.forEach((entry) => {
    bugList.appendChild(createBugCard(entry));
  });

  renderResolvedEntries(resolvedEntries);
}

/* =========================
   メッセージ表示
========================= */

function showToast(titleText, messageText) {
  const toastTitle = toast.querySelector(".toast__title");
  const toastMessage = toast.querySelector(".toast__message");

  toastTitle.textContent = titleText;
  toastMessage.textContent = messageText;

  toast.classList.add("is-visible");

  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }

  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 3400);
}

/* =========================
   イベント
========================= */

openBugFormButton.addEventListener("click", openBugForm);
closeBugFormButton.addEventListener("click", closeBugForm);
bugForm.addEventListener("submit", handleBugFormSubmit);

renderEntries();