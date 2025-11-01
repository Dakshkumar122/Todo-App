// --- Simple, Readable Todo App JS ---

// 🔹 Select HTML elements
const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const listEl = document.getElementById('list');
const searchEl = document.getElementById('search');
const filters = document.querySelectorAll('.filter');
const leftCount = document.getElementById('leftCount');
const clearAll = document.getElementById('clearAll');
const sortBy = document.getElementById('sortBy');

//  Yeh line check karti hai ki agar localStorage me tasks already saved hain toh unhe load karo,
//warna ek empty array [] se start karo.
const STORAGE_KEY = 'polished_todos_v1';
let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

// save() — har baar task change hone pe storage me dubara save karta hai.
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// uid() — har task ko ek unique ID deta hai (time + random string).
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// User ne jo likha hai wo ek new object ke form me array me store hota hai:
function addTask(text) {
  if (!text || !text.trim()) return;

  tasks.push({
    id: uid(),
    text: text.trim(),
    done: false,
    created: Date.now()
  });
//Phir save() call hota hai (data save karne ke liye) aur render() UI ko update karta hai.
  save();
  render();
}

// 🔹 Delete task
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  save();
  render();
}

// 🔹 Toggle task complete/incomplete
function toggleDone(id) {
  tasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
  save();
  render();
}

// 🔹 Edit task text
function editTask(id, newText) {
  tasks = tasks.map(t => t.id === id ? { ...t, text: newText.trim() } : t);
  save();
  render();
}

// 🔹 Sirf un tasks ko rakhta hai jo complete nahi hue, aur baaki delete kar deta hai.
clearAll.addEventListener('click', () => {
  tasks = tasks.filter(t => !t.done);
  save();
  render();
});

// 🔹 Add button + Enter key event
addBtn.addEventListener('click', () => {
  addTask(taskInput.value);
  taskInput.value = '';
  taskInput.focus();
});

taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    addTask(taskInput.value);
    taskInput.value = '';
  }
});

// 🔹 Search feature
//Jaise hi user kuch type karta hai, render() fir se chalega aur filter karega.
searchEl.addEventListener('input', render);

// 🔹 Filter (All / Active / Completed)
//User kisi filter pe click kare to wo filter activate ho jata hai aur list uske according dikhai deti hai.
let activeFilter = 'all';

filters.forEach(btn => btn.addEventListener('click', () => {
  filters.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeFilter = btn.dataset.filter;

  filters.forEach(b =>
    b.setAttribute('aria-selected', b.classList.contains('active'))
  );

  render();
}));

// 🔹 Sort (Newest / Oldest / Alphabetical)
sortBy.addEventListener('change', render);

// 🔹 Render UI
function render() {
  const query = (searchEl.value || '').toLowerCase();
  let filtered = [...tasks];

  // Filter by status
  if (activeFilter === 'active') filtered = filtered.filter(t => !t.done);
  if (activeFilter === 'completed') filtered = filtered.filter(t => t.done);

  // Search by keyword
  if (query) filtered = filtered.filter(t => t.text.toLowerCase().includes(query));

  // Sort by selected option
  const sortType = sortBy.value;
  if (sortType === 'new') filtered.sort((a, b) => b.created - a.created);
  if (sortType === 'old') filtered.sort((a, b) => a.created - b.created);
  if (sortType === 'alpha') filtered.sort((a, b) => a.text.localeCompare(b.text));

  // Clear current list
  listEl.innerHTML = '';

  // If no tasks available
  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'muted-small';
    empty.style.padding = '18px';
    empty.style.textAlign = 'center';
    empty.textContent = 'No tasks yet — add your first task!';
    listEl.appendChild(empty);
    return;
  }

  // Build task list
  filtered.forEach(t => {
    const item = document.createElement('div');
    item.className = 'todo fade';

    const left = document.createElement('div');
    left.className = 'left';

    // Checkbox
    const cb = document.createElement('div');
    cb.className = 'checkbox' + (t.done ? ' checked' : '');
    cb.setAttribute('role', 'checkbox');
    cb.setAttribute('aria-checked', t.done);
    cb.addEventListener('click', () => toggleDone(t.id));
    cb.innerHTML = t.done ? '&#10003;' : '';

    // Task text
    const center = document.createElement('div');
    center.style.flex = '1';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = t.text;
    title.title = 'Double click to edit';

    if (t.done) {
      title.style.textDecoration = 'line-through';
      title.style.opacity = '0.7';
    }

    title.setAttribute('tabindex', 0);

    // Double-click to edit
    title.addEventListener('dblclick', () => {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.value = t.text;
      inp.className = 'input';
      inp.style.padding = '8px';
      center.replaceChild(inp, title);
      inp.focus();

      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') finishEdit();
        if (e.key === 'Escape') cancelEdit();
      });

      inp.addEventListener('blur', finishEdit);

      function finishEdit() {
        const newVal = inp.value.trim();
        if (newVal && newVal !== t.text) editTask(t.id, newVal);
        else render();
      }

      function cancelEdit() {
        render();
      }
    });

    // Meta info (date/time)
    const meta = document.createElement('div');
    meta.className = 'meta';
    const dt = new Date(t.created);
    meta.textContent = dt.toLocaleString();

    center.appendChild(title);
    center.appendChild(meta);
    left.appendChild(cb);
    left.appendChild(center);

    // Actions (edit + delete)
    const actions = document.createElement('div');
    actions.className = 'actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn';
    editBtn.title = 'Edit';
    editBtn.innerHTML = '✏️';
    editBtn.addEventListener('click', () =>
      title.dispatchEvent(new MouseEvent('dblclick'))
    );

    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn';
    delBtn.title = 'Delete';
    delBtn.innerHTML = '🗑️';
    delBtn.addEventListener('click', () => {
      if (confirm('Delete this task?')) deleteTask(t.id);
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    // Final task layout
    item.appendChild(left);
    item.appendChild(actions);
    listEl.appendChild(item);
  });

  // Update remaining tasks count
  // Kitne tasks bache hain, wo bottom me show karta hai.
  const leftTasks = tasks.filter(t => !t.done).length;
  leftCount.textContent = `${leftTasks} ${leftTasks === 1 ? 'task' : 'tasks'} left`;
}

// 🔹 Initial render
render();

// 🔹 Keyboard shortcuts (Ctrl+K for search)
//Ctrl + K press karne pe search bar focus me aa jata hai (professional touch ✨).
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    searchEl.focus();
    searchEl.select();
  }
  if (e.key === 'Escape') {
    searchEl.blur();
    taskInput.blur();
  }
});
