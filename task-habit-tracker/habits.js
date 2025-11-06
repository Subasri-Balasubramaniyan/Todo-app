// === habits.js (replace file) ===

/* -------------------------
   Element selectors
   ------------------------- */
const addHabitBtn = document.getElementById("addHabitBtn");
const modalOverlay = document.getElementById("modalOverlay");
const editModalOverlay = document.getElementById("editModalOverlay");
const closeModal = document.getElementById("closeModal");
const cancelBtn = document.getElementById("cancelBtn");
const closeEditModal = document.getElementById("closeEditModal");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const frequencySelect = document.getElementById("frequencySelect");
const daySelect = document.getElementById("daySelect");
const selectAll = document.getElementById("selectAll");
const habitForm = document.getElementById("habitForm");
const editHabitForm = document.getElementById("editHabitForm");
const habitsContainer = document.getElementById("habitsContainer");

const deleteModalOverlay = document.getElementById("deleteModalOverlay");
const deleteMessage = document.getElementById("deleteMessage");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const closeDeleteModal = document.getElementById("closeDeleteModal");

let editIndex = null;
let habitToDelete = null;

const uiFilterSelect = document.querySelector(".filter-box select");
const uiSortSelect = document.querySelector(".sort-box select");
const uiSearchInput = document.querySelector(".search-bar input");

/* -------------------------
   Shared constants
   ------------------------- */
const WEEKDAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/* -------------------------
   Toast helper (simple)
   ------------------------- */
function createToastContainer() {
  if (!document.getElementById("toast")) {
    const div = document.createElement("div");
    div.id = "toast";
    div.className = "toast";
    div.style.position = "fixed";
    div.style.top = "18px";
    div.style.right = "18px";
    div.style.background = "#e6f6ef";
    div.style.padding = "14px 18px";
    div.style.borderRadius = "8px";
    div.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)";
    div.style.display = "none";
    div.style.zIndex = 9999;
    div.innerHTML = `<span id="toastMessage"></span><button id="toastClose" style="margin-left:12px;background:none;border:none;cursor:pointer;font-size:16px;">✕</button>`;
    document.body.appendChild(div);
    document.getElementById("toastClose").addEventListener("click", () => {
      div.style.display = "none";
    });
  }
}
function showToast(message, timeout = 3000) {
  createToastContainer();
  const toast = document.getElementById("toast");
  const msg = document.getElementById("toastMessage");
  msg.textContent = message;
  toast.style.display = "flex";
  toast.style.alignItems = "center";
  setTimeout(() => {
    toast.style.display = "none";
  }, timeout);
}

/* -------------------------
   LocalStorage helpers with sync
   ------------------------- */
function getHabits() {
  return JSON.parse(localStorage.getItem("habits")) || [];
}
function saveHabits(habits) {
  // store and ping dashboard/pages
  localStorage.setItem("habits", JSON.stringify(habits));
  // small trigger to ensure storage event fires in same tab too
  localStorage.setItem("habitsSyncTrigger", Date.now().toString());
}

/* -------------------------
   Modal toggles
   ------------------------- */
addHabitBtn && addHabitBtn.addEventListener("click", () => (modalOverlay.style.display = "flex"));
closeModal && closeModal.addEventListener("click", () => (modalOverlay.style.display = "none"));
cancelBtn && cancelBtn.addEventListener("click", () => (modalOverlay.style.display = "none"));
if (closeEditModal) closeEditModal.addEventListener("click", () => (editModalOverlay.style.display = "none"));
if (cancelEditBtn) cancelEditBtn.addEventListener("click", () => (editModalOverlay.style.display = "none"));

/* -------------------------
   Frequency logic (show days + weekly/custom behavior)
   ------------------------- */
if (frequencySelect) {
  frequencySelect.addEventListener("change", () => {
    const value = frequencySelect.value;
    const checkboxes = daySelect.querySelectorAll('input[type="checkbox"]:not(#selectAll)');

    if (value === "weekly" || value === "custom") daySelect.classList.remove("hidden");
    else daySelect.classList.add("hidden");

    // Reset selections when switching frequency
    checkboxes.forEach(cb => (cb.checked = false));
    if (selectAll) selectAll.checked = false;

    if (value === "weekly") {
      // Single-select behavior: selecting one unchecks others
      checkboxes.forEach(cb => {
        // remove previously attached listeners by cloning node technique
        const newCb = cb.cloneNode(true);
        cb.parentNode.replaceChild(newCb, cb);
      });
      // re-query
      const singleCheckboxes = daySelect.querySelectorAll('input[type="checkbox"]:not(#selectAll)');
      singleCheckboxes.forEach(cb => {
        cb.addEventListener("change", function () {
          if (this.checked) {
            singleCheckboxes.forEach(other => {
              if (other !== this) other.checked = false;
            });
          }
        });
      });
      if (selectAll && selectAll.parentElement) selectAll.parentElement.style.display = "none";
    } else if (value === "custom") {
      // Multi-select allowed: ensure checkboxes have no single-select listeners
      const multiCheckboxes = daySelect.querySelectorAll('input[type="checkbox"]:not(#selectAll)');
      multiCheckboxes.forEach(cb => {
        const newCb = cb.cloneNode(true);
        cb.parentNode.replaceChild(newCb, cb);
      });
      if (selectAll && selectAll.parentElement) selectAll.parentElement.style.display = "";
    } else {
      if (selectAll && selectAll.parentElement) selectAll.parentElement.style.display = "none";
    }
  });
}

/* -------------------------
   Select all checkboxes
   ------------------------- */
if (selectAll) {
  selectAll.addEventListener("change", () => {
    const checkboxes = daySelect.querySelectorAll('input[type="checkbox"]:not(#selectAll)');
    checkboxes.forEach(cb => (cb.checked = selectAll.checked));
  });
}

/* -------------------------
   Empty state
   ------------------------- */
function updateEmptyState() {
  const savedHabits = getHabits();
  const emptyState = document.querySelector(".empty-state");
  if (savedHabits.length === 0) {
    if (!emptyState) {
      const msg = document.createElement("div");
      msg.classList.add("empty-state");
      msg.innerHTML = `<i class="fa-solid fa-fire"></i><p>No habits yet. Create your first habit to start building streaks!</p>`;
      habitsContainer.appendChild(msg);
    }
  } else if (emptyState) emptyState.remove();
}

/* -------------------------
   Utilities: next7 occurrences & streak
   ------------------------- */
/**
 * Get the next N (7) occurrences starting from startDate of the provided selectedDays.
 * - selectedDays: array of names like ['sunday','monday'] (lowercase)
 * - If selectedDays is empty, returns the next 7 calendar days starting at startDate.
 *
 * Note: This is used to render the "7 boxes". We will show a 7-day window starting from
 * the habit.createdAt for daily, otherwise the next occurrences for weekly/custom.
 */
function getNext7Occurrences(startDate, selectedDays) {
  const result = [];
  let current = new Date(startDate);

  if (!Array.isArray(selectedDays)) selectedDays = [];

  // If there are no selectedDays, return the next 7 calendar days (forward)
  if (selectedDays.length === 0) {
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      result.push({
        iso: d.toISOString().split("T")[0],
        date: d.getDate(),
        day: WEEKDAY_NAMES[d.getDay()],
      });
    }
    return result;
  }

  // Otherwise, push occurrences of the chosen weekday(s) going forward until we have 7
  while (result.length < 7) {
    const dayName = WEEKDAY_NAMES[current.getDay()];
    if (selectedDays.includes(dayName)) {
      result.push({
        iso: current.toISOString().split("T")[0],
        date: current.getDate(),
        day: dayName,
      });
    }
    current.setDate(current.getDate() + 1);
  }

  return result;
}

function computeStreak(completedDates = []) {
  if (!Array.isArray(completedDates) || completedDates.length === 0) return 0;
  const set = new Set(completedDates.map(d => d.split("T")[0]));
  let streak = 0;
  const today = new Date();
  for (let i = 0; ; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().split("T")[0];
    if (set.has(iso)) streak++;
    else break;
  }
  return streak;
}

/* -------------------------
   Toggle complete (today)
   ------------------------- */
/**
 * Behavior implemented:
 * - If today is NOT in habit.completedDates -> add today's ISO date (mark complete).
 * - If today IS already in habit.completedDates and the user clicks the button again:
 *     -> we DO NOT remove the historic completion (so the day's green box remains).
 *     -> instead we set a per-habit transient label override (habit.labelOverrideDate = todayIso)
 *        which forces the button label to read "Mark complete" for the rest of the day,
 *        while the calendar day remains green (since completedDates still contains the date).
 * - On subsequent days the override expires (because labelOverrideDate !== newTodayIso) and the
 *   normal label logic applies (so next day, if not completed, the button shows "Mark complete").
 *
 * This matches your requested UI: clicking "Mark complete" -> button becomes "Completed" and day green.
 * Clicking "Completed" again quickly will switch button back to "Mark complete" (ui only) but green day stays.
 * Next day the button will automatically reflect the real date/time (no unwanted persistence).
 */
function toggleCompleteForHabit(index) {
  const habits = getHabits();
  if (!habits[index]) return;
  const todayIso = new Date().toISOString().split("T")[0];
  let arr = Array.isArray(habits[index].completedDates) ? [...habits[index].completedDates] : [];

  const already = arr.some(d => d.split("T")[0] === todayIso);

  if (!already) {
    // Mark today's date as completed (add)
    arr.push(todayIso);
    habits[index].completedDates = Array.from(new Set(arr.map(d => d.split("T")[0]))).sort((a, b) => new Date(b) - new Date(a));
    // clear any label override for today because now it's genuinely completed
    if (habits[index].labelOverrideDate === todayIso) delete habits[index].labelOverrideDate;
    saveHabits(habits);
    renderFilteredHabits();
    showToast("Nice! Habit marked complete for today.");
  } else {
    // Already completed today. According to your request:
    // - We DO NOT remove the completion entry (so the green day stays).
    // - We set a label override so the button shows "Mark complete" for the remainder of today.
    habits[index].labelOverrideDate = todayIso;
    saveHabits(habits);
    renderFilteredHabits();
    showToast("Button toggled to 'Mark complete' (calendar remains green).");
  }
}

/* -------------------------
   Render single habit card (updated)
   ------------------------- */
function renderHabitCard(habit, originalIndex) {
  const card = document.createElement("div");
  card.classList.add("habit-card");

  // Use habit.createdAt as the base for forward generation
  const creationDate = new Date(habit.createdAt || new Date());
  // Ensure selectedDays is lowercase weekday names array
  const selectedDays = (habit.selectedDays || []).map(s => String(s).toLowerCase());

  // If frequency is daily, show exact 7 forward consecutive days starting at createdAt.
  let next7;
  if ((habit.frequency || "").toLowerCase() === "daily") {
    next7 = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(creationDate);
      d.setDate(d.getDate() + i);
      next7.push({
        iso: d.toISOString().split("T")[0],
        date: d.getDate(),
        day: WEEKDAY_NAMES[d.getDay()],
      });
    }
  } else {
    // weekly/custom: existing behaviour based on selectedDays
    next7 = getNext7Occurrences(creationDate, selectedDays);
  }

  const streak = computeStreak(habit.completedDates || []);
  const todayIso = new Date().toISOString().split("T")[0];
  const completedToday = (habit.completedDates || []).some(d => d.split("T")[0] === todayIso);

  // Determine whether mark button should be enabled for this habit today
  // - Daily: enabled always (for today)
  // - Weekly: enabled only if today is one of the chosen weekdays
  // - Custom: enabled only if today matches a selected weekday (selectedDays are weekday names)
  const todayName = WEEKDAY_NAMES[new Date().getDay()];
  let canMarkToday = false;
  const freqLower = String(habit.frequency || "").toLowerCase();
  if (freqLower === "daily") {
    canMarkToday = true;
  } else if (freqLower === "weekly") {
    canMarkToday = selectedDays.includes(todayName);
  } else if (freqLower === "custom") {
    canMarkToday = selectedDays.includes(todayName);
  }

  // Build day boxes:
  const daysHtml = next7
    .map(d => {
      const thisDayCompleted = (habit.completedDates || []).some(cd => cd.split("T")[0] === d.iso);

      // default style
      let inlineStyle = "color:#000;"; // date number text color

      // Completed => green
      if (thisDayCompleted) {
        inlineStyle = 'background:#2e8b57;color:#fff;';
      } else {
        const today = new Date();
        const dayDate = new Date(d.iso + "T00:00:00");
        const todayStart = new Date(today.toISOString().split("T")[0] + "T00:00:00");

        // If displayed day is before today and not completed => mark red (missed)
        if (dayDate < todayStart) {
          // For daily: any past day in the 7-day window which isn't completed is missed -> red
          if (freqLower === "daily") {
            inlineStyle = 'background:#ff4c4c;color:#fff;';
          } else {
            // For weekly/custom: if that displayed day is not one of the habit's selectedDays mark red,
            // else (it was a selected day but not completed) keep neutral
            if (!selectedDays.includes(d.day)) {
              inlineStyle = 'background:#ff4c4c;color:#fff;';
            } else {
              inlineStyle = '';
            }
          }
        } else {
          // future or today and not completed => leave neutral
          inlineStyle = '';
        }
      }

      // Render rectangular boxes (date displayed as day number)
      return `<div class="day-box" style="${inlineStyle}"><span class="date">${d.date}</span><span class="day">${d.day.slice(0,3).toUpperCase()}</span></div>`;
    })
    .join("");

  // Determine mark button label and style for today
  // Label logic:
  //  - If the habit has labelOverrideDate === todayIso -> show "Mark complete" (UI override)
  //  - Else if completedToday -> show "Completed"
  //  - Else show "Mark complete"
  const labelOverride = habit.labelOverrideDate === todayIso;
  const markBtnLabel = labelOverride ? 'Mark complete' : (completedToday ? 'Completed' : 'Mark complete');
  const markBtnStyle = completedToday ? 'background:#2e8b57;color:#fff;' : '';

  card.innerHTML = `
    <div class="habit-header">
      <div>
        <h4>${escapeHtml(habit.name)}</h4>
        <p>${escapeHtml(habit.desc || "No description provided.")}</p>
      </div>
      <div class="habit-actions">
        <i class="fa-solid fa-pen-to-square edit" title="Edit" style="color:#007bff;cursor:pointer;"></i>
        <i class="fa-solid fa-trash delete" title="Delete" style="color:#dc3545;cursor:pointer;margin-left:10px;"></i>
        <button class="mark-complete" style="margin-left:12px; ${markBtnStyle}">
          ${markBtnLabel}
        </button>
      </div>
    </div>

    <div class="habit-meta">
      <span class="freq"><i class="fa-regular fa-calendar"></i> ${escapeHtml(habit.frequency)}</span>
      <span class="streak"><i class="fa-solid fa-fire"></i> ${streak} day streak</span>
      <p class="last7">Next 7 occurrences</p>
    </div>

    <div class="habit-days">
      ${daysHtml}
    </div>
  `;

  const deleteBtn = card.querySelector(".delete");
  const editBtn = card.querySelector(".edit");
  const markBtn = card.querySelector(".mark-complete");

  deleteBtn && deleteBtn.addEventListener("click", () => openDeleteModal(originalIndex));
  editBtn && editBtn.addEventListener("click", () => openEditHabitModal(originalIndex));

  // Enable/disable mark button according to canMarkToday. Note: labelOverride doesn't affect validity.
  if (!canMarkToday) {
    markBtn.disabled = true;
    markBtn.style.opacity = "0.6";
    markBtn.style.cursor = "not-allowed";
  } else {
    markBtn.disabled = false;
    markBtn.style.opacity = "";
    markBtn.style.cursor = "pointer";
  }

  markBtn && markBtn.addEventListener("click", () => {
    // Safety: do nothing if disabled
    if (markBtn.disabled) return;
    toggleCompleteForHabit(originalIndex);
  });

  habitsContainer.appendChild(card);
}

/* -------------------------
   Helper: escape HTML
   ------------------------- */
function escapeHtml(txt) {
  if (txt === null || txt === undefined) return "";
  return String(txt).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* -------------------------
   Search / Filter / Sort
   ------------------------- */
function normalizeFrequencyLabel(label) {
  if (!label) return "all";
  const t = String(label).trim().toLowerCase();
  if (t.includes("daily")) return "daily";
  if (t.includes("weekly")) return "weekly";
  if (t.includes("custom")) return "custom";
  return "all";
}

function parseSortMode(raw) {
  if (!raw) return "streak";
  const t = String(raw).trim().toLowerCase();
  if (t.includes("streak")) return "streak";
  if (t.includes("created")) return "created";
  if (t.includes("asc")) return "asc";
  if (t.includes("desc")) return "desc";
  return "streak";
}

function renderFilteredHabits() {
  const all = getHabits();
  let list = all.map((h, idx) => ({ h, idx }));

  const searchVal = uiSearchInput ? (uiSearchInput.value || "").trim().toLowerCase() : "";
  if (searchVal) {
    list = list.filter(({ h }) => (h.name || "").toLowerCase().includes(searchVal) || (h.desc || "").toLowerCase().includes(searchVal));
  }

  const freqRaw = uiFilterSelect ? (uiFilterSelect.value || uiFilterSelect.innerText) : "All Frequency";
  const freq = normalizeFrequencyLabel(freqRaw);
  if (freq !== "all") list = list.filter(({ h }) => (h.frequency || "").toLowerCase() === freq);

  const sortRaw = uiSortSelect ? (uiSortSelect.value || uiSortSelect.innerText) : "Streak";
  const sortMode = parseSortMode(sortRaw);

  if (sortMode === "streak") list.sort((a, b) => computeStreak(b.h.completedDates || []) - computeStreak(a.h.completedDates || []));
  else if (sortMode === "created") list.sort((a, b) => new Date(b.h.createdAt) - new Date(a.h.createdAt));
  else if (sortMode === "asc") list.sort((a, b) => (a.h.name || "").localeCompare(b.h.name || ""));
  else if (sortMode === "desc") list.sort((a, b) => (b.h.name || "").localeCompare(a.h.name || ""));

  habitsContainer.innerHTML = "";
  list.forEach(item => renderHabitCard(item.h, item.idx));
  updateEmptyState();
}

/* -------------------------
   Wire search/filter/sort events
   ------------------------- */
if (uiSearchInput) uiSearchInput.addEventListener("input", renderFilteredHabits);
if (uiFilterSelect) uiFilterSelect.addEventListener("change", renderFilteredHabits);
if (uiSortSelect) uiSortSelect.addEventListener("change", renderFilteredHabits);

/* -------------------------
   Add Habit logic
   ------------------------- */
if (habitForm) {
  habitForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = habitForm.querySelector("input[type='text']").value.trim();
    const desc = habitForm.querySelector("textarea").value.trim();
    const frequency = habitForm.querySelector("#frequencySelect").value;
    // collect checked days (not selectAll)
    const checkedDays = Array.from(daySelect.querySelectorAll('input[type="checkbox"]:checked'))
      .filter(cb => cb.id !== "selectAll")
      .map(cb => cb.value.toLowerCase());

    if (!name || !frequency) {
      alert("Please fill all required fields!");
      return;
    }

    // Save createdAt (ISO) so daily 7-day tracker can start from creation date
    // Also initialize completedDates and no labelOverrideDate by default.
    const habit = { name, desc, frequency, selectedDays: checkedDays, createdAt: new Date().toISOString(), completedDates: [], /* labelOverrideDate: undefined */ };
    const habits = getHabits();
    habits.push(habit);
    saveHabits(habits);

    renderFilteredHabits();
    modalOverlay.style.display = "none";
    habitForm.reset();
    daySelect.classList.add("hidden");

    showToast("Your habit has been saved successfully!");
  });
}

/* -------------------------
   Edit Habit logic
   ------------------------- */
function openEditHabitModal(originalIndex) {
  const habits = getHabits();
  const habit = habits[originalIndex];
  editIndex = originalIndex;
  if (!editModalOverlay) return;
  editModalOverlay.style.display = "flex";

  const titleEl = document.getElementById("editHabitTitle");
  if (titleEl) titleEl.textContent = "Edit Habit";

  editHabitForm.querySelector("input[type='text']").value = habit.name;
  editHabitForm.querySelector("textarea").value = habit.desc || "";
  const sel = editHabitForm.querySelector("#editFrequencySelect");
  if (sel) sel.value = habit.frequency || "";

  // If you want to edit selected days here, you could show daySelect and populate it.
  // For now we preserve selectedDays unless the user re-creates the habit.
}

if (editHabitForm) {
  editHabitForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (editIndex === null || editIndex === undefined) return;

    const name = editHabitForm.querySelector("input[type='text']").value.trim();
    const desc = editHabitForm.querySelector("textarea").value.trim();
    const frequency = editHabitForm.querySelector("#editFrequencySelect").value;

    if (!name || !frequency) {
      alert("Please fill all required fields!");
      return;
    }

    const habits = getHabits();
    const existing = habits[editIndex] || {};
    // preserve selectedDays and completedDates unless you provide a day edit UI
    habits[editIndex] = { ...existing, name, desc, frequency };
    saveHabits(habits);
    renderFilteredHabits();
    editModalOverlay.style.display = "none";
    editIndex = null;

    showToast("All set! your changes have been saved successfully!");
  });
}

/* -------------------------
   Delete confirmation logic
   ------------------------- */
function openDeleteModal(index) {
  habitToDelete = index;
  deleteMessage.innerHTML = `Are you sure you want to delete the <strong>${escapeHtml(getHabits()[index]?.name || "")}</strong>?`;
  if (deleteModalOverlay) deleteModalOverlay.style.display = "flex";
}
function closeDeleteModalFunc() {
  if (deleteModalOverlay) deleteModalOverlay.style.display = "none";
  habitToDelete = null;
}
if (cancelDeleteBtn) cancelDeleteBtn.addEventListener("click", closeDeleteModalFunc);
if (closeDeleteModal) closeDeleteModal.addEventListener("click", closeDeleteModalFunc);
if (confirmDeleteBtn) confirmDeleteBtn.addEventListener("click", () => {
  if (habitToDelete !== null && habitToDelete !== undefined) {
    const habits = getHabits();
    habits.splice(habitToDelete, 1);
    saveHabits(habits);
    renderFilteredHabits();
    showToast("Done! your habit has been removed");
  }
  closeDeleteModalFunc();
});

/* -------------------------
   Theme Toggle (habits page toggle button id = themeToggle)
   ------------------------- */
const themeToggle = document.getElementById("themeToggle");
if (themeToggle) {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    themeToggle.textContent = "☀️";
  } else themeToggle.textContent = "🌙";

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    if (document.body.classList.contains("dark-mode")) {
      localStorage.setItem("theme", "dark");
      themeToggle.textContent = "☀️";
    } else {
      localStorage.setItem("theme", "light");
      themeToggle.textContent = "🌙";
    }
  });
}

/* -------------------------
   On load: render habits & notify dashboard
   ------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  renderFilteredHabits();
  // touch the sync trigger so dashboard updates if open
  localStorage.setItem("habitsSyncTrigger", Date.now().toString());
});

/* -------------------------
   Also listen for storage triggers (if other pages update habits)
   ------------------------- */
window.addEventListener("storage", (e) => {
  if (!e.key || e.key === "habits" || e.key === "habitsSyncTrigger") {
    renderFilteredHabits();
  }
});

/* -------------------------
   Toast helper (updated to match screenshot)
   (kept as final version, duplicates removed)
   ------------------------- */
function createToastContainer() {
  if (!document.getElementById("toast")) {
    const toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.style.position = "fixed";
    toast.style.top = "20px";
    toast.style.right = "20px";
    toast.style.display = "none";
    toast.style.alignItems = "center";
    toast.style.justifyContent = "space-between";
    toast.style.background = "#E6F4EA"; // light green background
    toast.style.borderRadius = "8px";
    toast.style.minWidth = "350px";
    toast.style.maxWidth = "400px";
    toast.style.boxShadow = "0 4px 15px rgba(0,0,0,0.1)";
    toast.style.overflow = "hidden";
    toast.style.zIndex = 9999;
    toast.style.transition = "all 0.4s ease";
    toast.style.transform = "translateX(100%)";
    toast.style.opacity = "0";

    toast.innerHTML = `
      <div style="display:flex;align-items:center;width:100%;">
        <div style="background:#34A853;color:#fff;height:100%;padding:18px 16px;display:flex;align-items:center;justify-content:center;font-size:20px;">
          <i class="fa-solid fa-check"></i>
        </div>
        <div style="flex:1;padding:14px 16px;">
          <span id="toastMessage" style="font-size:15px;font-weight:500;line-height:1.4;color:#111;"></span>
        </div>
        <button id="toastClose" style="background:none;border:none;color:#333;font-size:18px;cursor:pointer;padding-right:14px;">✕</button>
      </div>
    `;

    document.body.appendChild(toast);

    document.getElementById("toastClose").addEventListener("click", () => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      setTimeout(() => (toast.style.display = "none"), 300);
    });
  }
}

function showToast(message, timeout = 3000) {
  createToastContainer();
  const toast = document.getElementById("toast");
  const msg = document.getElementById("toastMessage");

  msg.textContent = message;

  toast.style.display = "flex";
  setTimeout(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(0)";
  }, 10);

  clearTimeout(toast.timeoutId);
  toast.timeoutId = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    setTimeout(() => (toast.style.display = "none"), 300);
  }, timeout);
}
