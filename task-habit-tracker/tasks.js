// === Select elements ===
const addTaskBtn = document.getElementById("addTaskBtn");
const modalOverlay = document.getElementById("modalOverlay");
const closeModal = document.getElementById("closeModal");
const cancelBtn = document.getElementById("cancelBtn");
const taskForm = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");
const searchInput = document.getElementById("searchInput");

// === Filter & Sort selectors ===
const statusFilter = document.getElementById("statusFilter");
const priorityFilter = document.getElementById("priorityFilter");
const sortBy = document.getElementById("sortBy");

let editTaskId = null; // Track task being edited

// === Show modal (for Add) ===
addTaskBtn.addEventListener("click", () => {
  editTaskId = null; // reset edit mode
  modalOverlay.style.display = "flex";
  document.getElementById("modalTitle").textContent = "Add task";
  taskForm.reset();
});

// === Close modal ===
closeModal.addEventListener("click", closeModalForm);
cancelBtn.addEventListener("click", closeModalForm);

function closeModalForm() {
  modalOverlay.style.display = "none";
  taskForm.reset();
  editTaskId = null;
}

// === Load tasks from localStorage ===
document.addEventListener("DOMContentLoaded", loadTasks);

function loadTasks() {
  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  renderTasks(tasks);
}

// === Save or Update Task ===
taskForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = document.getElementById("taskTitle").value.trim();
  const desc = document.getElementById("taskDesc").value.trim();
  const due = document.getElementById("taskDue").value;
  const priority = document.getElementById("taskPriority").value;
  const status = document.getElementById("taskStatus").value;

  if (!title || !priority || !due) {
    alert("Please fill in all required fields.");
    return;
  }

  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

  if (editTaskId) {
    // === Update existing task ===
    const index = tasks.findIndex((t) => t.id === editTaskId);
    if (index !== -1) {
      tasks[index].title = title;
      tasks[index].desc = desc;
      tasks[index].due = due;
      tasks[index].priority = priority;
      tasks[index].status = status;
    }
    editTaskId = null;
  } else {
    // === Add new task ===
    const task = {
      id: Date.now(),
      title,
      desc,
      due,
      priority,
      status,
      subtasks: [],
      createdAt: new Date().toISOString(),
    };
    tasks.push(task);
  }

  localStorage.setItem("tasks", JSON.stringify(tasks));
  window.dispatchEvent(new Event("storage"));
 
  renderTasks(tasks);
  showToast("Your task have been saved successfully!");
  closeModalForm();
});
// Render tasks
function renderTasks(tasks) {
  taskList.innerHTML = "";

  if (tasks.length === 0) {
    taskList.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-clipboard"></i>
        <p>No tasks found. Create your first task to get started!</p>
      </div>
    `;
    return;
  }

  tasks.forEach((task, index) => {
    const taskCard = document.createElement("div");
    taskCard.classList.add("task-card");

    // === Priority icons and background colors ===
    let priorityIcon = "";
    let priorityBg = "";
    if (task.priority === "High") {
      priorityIcon = "🔥";
      priorityBg = "#f8d7da";
    } else if (task.priority === "Medium") {
      priorityIcon = "⚡";
      priorityBg = "#fff3cd";
    } else {
      priorityIcon = "🕓";
      priorityBg = "#d4edda";
    }

    taskCard.innerHTML = `
      <div class="task-header">
       <span class="drag-icon"><i class="fa-solid fa-grip-vertical"></i></span>
        <h3 class="task-title" style="${task.status === 'Completed' ? 'text-decoration: line-through; color: gray; opacity: 0.7;' : ''}">
      ${task.title}
</h3>

        <div class="task-actions">
          <i class="fa-solid fa-chevron-up move-up" title="Move Up"></i>
          <i class="fa-solid fa-chevron-down move-down" title="Move Down"></i>
          <i class="fa-solid fa-pen-to-square edit" title="Edit Task"></i>
          <i class="fa-solid fa-trash delete" title="Delete Task"></i>
        </div>
      </div>

      <p class="desc">${task.desc || ""}</p>

      <div class="task-meta">
        <span class="priority" style="background:${priorityBg}">
          ${priorityIcon} ${task.priority}
        </span>
        <span class="due"><i class="fa-regular fa-calendar"></i> ${task.due}</span>

        <select class="status-dropdown">
          <option ${task.status === "Todo" ? "selected" : ""}>Todo</option>
          <option ${task.status === "In Progress" ? "selected" : ""}>In Progress</option>
          <option ${task.status === "Completed" ? "selected" : ""}>Completed</option>
        </select>
      </div>

      <div class="subtasks-container">
        <div class="subtask-header">
          <i class="fa-solid fa-chevron-right toggle-subtasks"></i>
          <span>Subtasks (${task.subtasks.length})</span>
        </div>

        <div class="subtasks-content" style="display:none;">
          <ul class="subtask-list">
            ${
              task.subtasks.length
                ? task.subtasks
                    .map(
                      (s, i) => `
                <li style="display:flex; align-items:center; justify-content:space-between; padding:4px 0;">
                  <div style="display:flex; align-items:center; gap:6px;">
                    <input type="checkbox" ${s.done ? "checked" : ""} data-index="${i}" data-id="${task.id}">
                    <span class="${s.done ? "done" : ""}" style="${s.done ? "text-decoration:line-through; color:gray;" : ""}">
                      ${s.text}
                    </span>
                  </div>
                  <div class="subtask-actions" style="display:flex; gap:10px;">
                    <i class="fa-solid fa-pen-to-square edit-subtask" data-id="${task.id}" data-index="${i}" style="cursor:pointer; color:#20b2aa;"></i>
                    <i class="fa-solid fa-trash delete-subtask" data-id="${task.id}" data-index="${i}" style="cursor:pointer; color:#e74c3c;"></i>
                  </div>
                </li>`
                    )
                    .join("")
                : "<p class='no-subtasks' style='color:#888; margin:0;'>No subtasks</p>"
            }
          </ul>

          <div class="add-subtask" style="display:flex; gap:6px; margin-top:8px;">
            <input type="text" placeholder="Add subtask..." data-id="${task.id}" style="flex:1; padding:6px;">
            <button class="add-subtask-btn" data-id="${task.id}" style="padding:6px 10px;">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
        </div>
      </div>
    `;
function enableDragAndDrop() {
  const taskCards = document.querySelectorAll(".task-card");

  taskCards.forEach((card) => {
    const dragIcon = card.querySelector(".drag-icon");
    dragIcon.addEventListener("mousedown", () => {
      card.setAttribute("draggable", "true");
    });

    dragIcon.addEventListener("mouseup", () => {
      card.removeAttribute("draggable");
    });

    // Drag start
    card.addEventListener("dragstart", (e) => {
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });

    // Drag end
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
    });
  });

  const taskList = document.getElementById("taskList");

  taskList.addEventListener("dragover", (e) => {
    e.preventDefault();
    const draggingCard = document.querySelector(".dragging");
    const afterElement = getDragAfterElement(taskList, e.clientY);
    if (afterElement == null) {
      taskList.appendChild(draggingCard);
    } else {
      taskList.insertBefore(draggingCard, afterElement);
    }
  });
}

// Helper function to find position
function getDragAfterElement(container, y) {
  const draggableElements = [
    ...container.querySelectorAll(".task-card:not(.dragging)")
  ];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

    // === Task main actions ===
    taskCard.querySelector(".delete").addEventListener("click", () => deleteTask(task.id));
    taskCard.querySelector(".edit").addEventListener("click", () => openEditModal(task));
    const statusSelect = taskCard.querySelector(".status-dropdown");
    statusSelect.addEventListener("change", (e) => updateTaskStatus(task.id, e.target.value));

    // === Move Up / Down functionality ===
    const moveUpBtn = taskCard.querySelector(".move-up");
    const moveDownBtn = taskCard.querySelector(".move-down");

   moveUpBtn.addEventListener("click", () => moveTask(task.id, "up"));
    moveDownBtn.addEventListener("click", () => moveTask(task.id, "down"));


    // === Subtasks ===
    const addBtn = taskCard.querySelector(".add-subtask-btn");
    const subtaskInput = taskCard.querySelector(".add-subtask input");
    addBtn.addEventListener("click", () => {
      const text = subtaskInput.value.trim();
      if (text) {
        addSubtask(task.id, text);
        subtaskInput.value = "";
      }
    });

    taskCard.querySelectorAll(".subtask-list input[type='checkbox']").forEach((cb) => {
      cb.addEventListener("change", (e) => toggleSubtaskDone(task.id, e.target.dataset.index));
    });

    // // === Edit/Delete Subtask ===
    // taskCard.querySelectorAll(".edit-subtask").forEach((btn) => {
    //   btn.addEventListener("click", (e) => {
    //     const id = Number(e.target.dataset.id);
    //     const index = Number(e.target.dataset.index);
    //     editSubtask(id, index);
    //   });
    // });

    // taskCard.querySelectorAll(".delete-subtask").forEach((btn) => {
    //   btn.addEventListener("click", (e) => {
    //     const id = Number(e.target.dataset.id);
    //     const index = Number(e.target.dataset.index);
    //     deleteSubtask(id, index);
    //   });
    // });
    // === Edit/Delete Subtask ===
taskCard.querySelectorAll(".edit-subtask").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const id = Number(e.target.dataset.id);
    const index = Number(e.target.dataset.index);
    editSubtask(id, index);
  });
});

taskCard.querySelectorAll(".delete-subtask").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const id = Number(e.target.dataset.id);
    const index = Number(e.target.dataset.index);
    deleteSubtask(id, index);
  });
});

// === Edit Subtask ===
function editSubtask(taskId, subIndex) {
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  const oldText = task.subtasks[subIndex].text;
  const newText = prompt("Edit subtask:", oldText);

  if (newText !== null && newText.trim() !== "") {
    task.subtasks[subIndex].text = newText.trim();
    localStorage.setItem("tasks", JSON.stringify(tasks));
    window.dispatchEvent(new Event("storage"));
   
    renderTasks(tasks); // instantly refresh UI
  }
}

// === Delete Subtask ===
function deleteSubtask(taskId, subIndex) {
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  if (confirm("Are you sure you want to delete this subtask?")) {
    task.subtasks.splice(subIndex, 1);
    localStorage.setItem("tasks", JSON.stringify(tasks));
    window.dispatchEvent(new Event("storage"));
    
    renderTasks(tasks); // instantly refresh UI
  }
}

    // === Toggle subtasks visibility ===
    const toggleBtn = taskCard.querySelector(".toggle-subtasks");
    const subtaskContent = taskCard.querySelector(".subtasks-content");
    toggleBtn.addEventListener("click", () => {
      const visible = subtaskContent.style.display === "block";
      subtaskContent.style.display = visible ? "none" : "block";
      toggleBtn.classList.toggle("fa-chevron-right", visible);
      toggleBtn.classList.toggle("fa-chevron-down", !visible);
    });

    taskList.appendChild(taskCard);
  });
}
function moveTask(taskId, direction) {
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return;

  if (direction === "up" && index > 0) {
    [tasks[index - 1], tasks[index]] = [tasks[index], tasks[index - 1]];
  } else if (direction === "down" && index < tasks.length - 1) {
    [tasks[index], tasks[index + 1]] = [tasks[index + 1], tasks[index]];
  } else {
    return;
  }

  // Save to localStorage
  localStorage.setItem("tasks", JSON.stringify(tasks));
window.dispatchEvent(new Event("storage"));
  
// Re-render immediately
  renderTasks(tasks);
}



// === Open Edit Modal ===
function openEditModal(task) {
  editTaskId = task.id;
  modalOverlay.style.display = "flex";
  document.getElementById("modalTitle").textContent = "Edit task";

  document.getElementById("taskTitle").value = task.title;
  document.getElementById("taskDesc").value = task.desc;
  document.getElementById("taskDue").value = task.due;
  document.getElementById("taskPriority").value = task.priority;
  document.getElementById("taskStatus").value = task.status;
}

// === Delete Task ===
function deleteTask(id) {
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  tasks = tasks.filter((task) => task.id !== id);
  localStorage.setItem("tasks", JSON.stringify(tasks));
  window.dispatchEvent(new Event("storage"));
  
  applyFilters();
}

// === Update Task Status ===
// function updateTaskStatus(id, newStatus) {
//   let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
//   const task = tasks.find((t) => t.id === id);
//   if (task) task.status = newStatus;
//   localStorage.setItem("tasks", JSON.stringify(tasks));
//   applyFilters();
// }
function updateTaskStatus(id, newStatus) {
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.status = newStatus;
    localStorage.setItem("tasks", JSON.stringify(tasks));
 window.dispatchEvent(new Event("storage")); 
  
}

  // Re-render immediately
  renderTasks(tasks);
}


// === Add Subtask ===
function addSubtask(id, text) {
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.subtasks.push({ text, done: false });
    localStorage.setItem("tasks", JSON.stringify(tasks));
   window.dispatchEvent(new Event("storage"));
   
    applyFilters();
  }
}

// === Toggle Subtask Completion ===
function toggleSubtaskDone(id, index) {
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  const task = tasks.find((t) => t.id === id);
  if (task && task.subtasks[index]) {
    task.subtasks[index].done = !task.subtasks[index].done;
    localStorage.setItem("tasks", JSON.stringify(tasks));
    window.dispatchEvent(new Event("storage"));
    applyFilters();
  }
}

// === Search Tasks ===
searchInput.addEventListener("input", applyFilters);

// === Filters & Sorting ===
statusFilter.addEventListener("change", applyFilters);
priorityFilter.addEventListener("change", applyFilters);
sortBy.addEventListener("change", applyFilters);

function applyFilters() {
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

  const statusVal = statusFilter.value;
  const priorityVal = priorityFilter.value;
  const searchVal = searchInput.value.toLowerCase();
  const sortVal = sortBy.value;

  // Filter
  tasks = tasks.filter((t) => {
    const matchesStatus = statusVal === "all" || t.status === statusVal;
    const matchesPriority = priorityVal === "all" || t.priority === priorityVal;
    const matchesSearch = t.title.toLowerCase().includes(searchVal);
    return matchesStatus && matchesPriority && matchesSearch;
  });

  // Sort
  if (sortVal === "dueDate") {
    tasks.sort((a, b) => new Date(a.due) - new Date(b.due));
  } else if (sortVal === "priority") {
    const priorityOrder = { High: 1, Medium: 2, Low: 3 };
    tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  } else {
    tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  renderTasks(tasks);
}
// === Edit Modal Elements ===
const editModalOverlay = document.getElementById("editModalOverlay");
const closeEditModal = document.getElementById("closeEditModal");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const editTaskForm = document.getElementById("editTaskForm");

let editingTaskId = null;

// === Open Edit Task Modal ===
function openEditModal(task) {
  editingTaskId = task.id;
  editModalOverlay.style.display = "flex";

  document.getElementById("editTaskTitle").value = task.title;
  document.getElementById("editTaskDesc").value = task.desc;
  document.getElementById("editTaskDue").value = task.due;
  document.getElementById("editTaskPriority").value = task.priority;
  document.getElementById("editTaskStatus").value = task.status;
}

// === Close Edit Modal ===
closeEditModal.addEventListener("click", closeEditModalForm);
cancelEditBtn.addEventListener("click", closeEditModalForm);

function closeEditModalForm() {
  editModalOverlay.style.display = "none";
  editTaskForm.reset();
  editingTaskId = null;
}

// === Save Edited Task ===
editTaskForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const updatedTask = {
    title: document.getElementById("editTaskTitle").value.trim(),
    desc: document.getElementById("editTaskDesc").value.trim(),
    due: document.getElementById("editTaskDue").value,
    priority: document.getElementById("editTaskPriority").value,
    status: document.getElementById("editTaskStatus").value,
  };

  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  const index = tasks.findIndex((t) => t.id === editingTaskId);

  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...updatedTask };
    localStorage.setItem("tasks", JSON.stringify(tasks));
  window.dispatchEvent(new Event("storage"));
  
  }

  closeEditModalForm();
  applyFilters();
  showToast("All set! Your changes have been saved successfully!");
});
// === DARK MODE TOGGLE ===
const darkModeToggle = document.getElementById("darkModeToggle");
const body = document.body;

// Load previous preference
if (localStorage.getItem("darkMode") === "enabled") {
  body.classList.add("dark-mode");
  darkModeToggle.textContent = "☀️";
} else {
  darkModeToggle.textContent = "🌙";
}

// Toggle on click
darkModeToggle.addEventListener("click", () => {
  body.classList.toggle("dark-mode");

  if (body.classList.contains("dark-mode")) {
    localStorage.setItem("darkMode", "enabled");
    darkModeToggle.textContent = "☀️";
  } else {
    localStorage.setItem("darkMode", "disabled");
    darkModeToggle.textContent = "🌙";
  }
});
// === Delete Confirmation Modal Elements ===
const deleteModalOverlay = document.getElementById("deleteModalOverlay");
const deleteMessage = document.getElementById("deleteMessage");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");

let taskToDeleteId = null;

// === Show Delete Confirmation ===
function deleteTask(id) {
  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  const task = tasks.find((t) => t.id === id);

  if (!task) return;

  taskToDeleteId = id;
  deleteMessage.innerHTML = `Are you sure you want to delete the <strong>${task.title}</strong> task?`;
  deleteModalOverlay.style.display = "flex";
}

// === Confirm Delete ===
confirmDeleteBtn.addEventListener("click", () => {
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  tasks = tasks.filter((task) => task.id !== taskToDeleteId);
  localStorage.setItem("tasks", JSON.stringify(tasks));
  window.dispatchEvent(new Event("storage"));
  
  deleteModalOverlay.style.display = "none";
  taskToDeleteId = null;
  applyFilters();
   showToast("Done! Your item has been removed.");
});

// === Cancel Delete ===
cancelDeleteBtn.addEventListener("click", () => {
  deleteModalOverlay.style.display = "none";
  taskToDeleteId = null;
});
function showToast(message) {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toastMessage");
  const toastClose = document.getElementById("toastClose");

  toastMessage.textContent = message;
  toast.classList.add("show");

  // Hide toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);

  // Close manually
  toastClose.onclick = () => {
    toast.classList.remove("show");
  };
}
// === DRAG & DROP FUNCTIONALITY ===
function enableDragAndDrop() {
  const taskCards = document.querySelectorAll(".task-card");
  const taskList = document.getElementById("taskList");

  taskCards.forEach((card) => {
    const dragIcon = card.querySelector(".drag-icon");

    // Enable dragging only when clicking the drag icon
    dragIcon.addEventListener("mousedown", () => {
      card.setAttribute("draggable", "true");
    });

    dragIcon.addEventListener("mouseup", () => {
      card.removeAttribute("draggable");
    });

    card.addEventListener("dragstart", (e) => {
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      saveTaskOrder(); // Save order after dragging ends
    });
  });

  taskList.addEventListener("dragover", (e) => {
    e.preventDefault();
    const draggingCard = document.querySelector(".dragging");
    const afterElement = getDragAfterElement(taskList, e.clientY);
    if (afterElement == null) {
      taskList.appendChild(draggingCard);
    } else {
      taskList.insertBefore(draggingCard, afterElement);
    }
  });
}

// Helper to find the position where to drop
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".task-card:not(.dragging)")];
  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

// Save new order to localStorage after drag
function saveTaskOrder() {
  const cards = document.querySelectorAll(".task-card");
  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];

  // Rebuild array in new order
  const reordered = [];
  cards.forEach((card) => {
    const title = card.querySelector(".task-title").textContent.trim();
    const match = tasks.find((t) => t.title === title);
    if (match) reordered.push(match);
  });

  localStorage.setItem("tasks", JSON.stringify(reordered));
}

// === Re-enable drag & drop after rendering ===
const originalRenderTasks = renderTasks;
renderTasks = function (tasks) {
  originalRenderTasks(tasks);
  enableDragAndDrop(); // Activate drag after tasks are shown
};
// === DASHBOARD & STATUS CHART AUTO-UPDATE ===
window.addEventListener("storage", updateDashboardStats);

function updateDashboardStats() {
  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];

  const totalTasks = tasks.length;
  const completed = tasks.filter(t => t.status === "Completed").length;
  const inProgress = tasks.filter(t => t.status === "In Progress").length;
  const todo = tasks.filter(t => t.status === "Todo").length;

  // Update number counters
  document.getElementById("totalTasksCount").textContent = totalTasks;
  document.getElementById("completedTasksCount").textContent = completed;
  document.getElementById("inProgressTasksCount").textContent = inProgress;
  document.getElementById("todoTasksCount").textContent = todo;

  // Update status overview chart (if it exists)
  if (window.statusChart) {
    window.statusChart.data.datasets[0].data = [todo, inProgress, completed];
    window.statusChart.update();
  }
}

// Run once on load
document.addEventListener("DOMContentLoaded", updateDashboardStats);
window.addEventListener("DOMContentLoaded", () => {
  const badgeSection = document.getElementById("badgeSection");
  const badges = JSON.parse(localStorage.getItem("badges")) || [];

  if (badges.length > 0) {
    badges.forEach(badgeText => {
      const badgeEl = document.createElement("span");
      badgeEl.classList.add("badge");
      badgeEl.textContent = badgeText;
      badgeSection.appendChild(badgeEl);
    });
  }
});
