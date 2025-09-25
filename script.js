    /* -------------------- App logic -------------------- */
    (function(){
      // DOM
      const bg = document.getElementById('bg');
      const searchEl = document.getElementById('search');
      const listEl = document.getElementById('list');
      const emptyEl = document.getElementById('empty');
      const addBtn = document.getElementById('addBtn');
      const newBtn = document.getElementById('newBtn');
      const titleEl = document.getElementById('title');
      const projSelect = document.getElementById('projSelect');
      const projectsEl = document.getElementById('projects');
      const priorityEl = document.getElementById('priority');
      const dueEl = document.getElementById('due');
      const exportBtn = document.getElementById('exportBtn');
      const importBtn = document.getElementById('importBtn');
      const fileImport = document.getElementById('fileImport');
      const addProjBtn = document.getElementById('addProj');
      const themeBtn = document.getElementById('themeBtn');
      const sortEl = document.getElementById('sort');
      const STORAGE = 'aurora_todo_v1';

      // State
      let state = {
        meta: { theme: 'dark' },
        projects: [{ id: 'p_inbox', name: 'Inbox', color: '#7c3aed' }],
        tasks: [],
      };
      let filter = 'all';
      let undoStack = [];

      // Utilities
      const uid = (pre='id') => pre + '_' + Math.random().toString(36).slice(2,9);
      const todayISODate = () => new Date().toISOString().slice(0,10);
      const save = () => {
        try{ localStorage.setItem(STORAGE, JSON.stringify(state)); }catch(e){}
      };
      const pushUndo = () => { undoStack.unshift(JSON.parse(JSON.stringify(state))); if(undoStack.length>12) undoStack.pop(); }
      const loadState = () => {
        try{
          const raw = localStorage.getItem(STORAGE);
          if(raw){ state = JSON.parse(raw); }
        }catch(e){}
      };

      // Initialize
      loadState();
      applyTheme();
      renderProjects();
      renderList();

      /* ---------- Canvas background (particles + lines) ---------- */
      (function canvasBG(){
        const ctx = bg.getContext('2d');
        let w = bg.width = innerWidth;
        let h = bg.height = innerHeight;
        let nodes = [];
        const NODE_COUNT = Math.max(14, Math.floor((w*h)/90000));
        function rand(a,b){return Math.random()*(b-a)+a}
        function make(){
          nodes = [];
          for(let i=0;i<NODE_COUNT;i++){
            nodes.push({ x:rand(0,w), y:rand(0,h), vx:rand(-0.25,0.25), vy:rand(-0.25,0.25), r:rand(1.4,3.6) });
          }
        }
        function resize(){
          w = bg.width = innerWidth; h = bg.height = innerHeight; make();
        }
        function draw(){
          ctx.clearRect(0,0,w,h);
          // soft gradient overlay
          const g = ctx.createLinearGradient(0,0,w,h);
          if(state.meta.theme === 'light'){
            g.addColorStop(0,'rgba(250,252,255,0.85)');
            g.addColorStop(1,'rgba(240,248,255,0.8)');
          } else {
            g.addColorStop(0,'rgba(6,9,20,0.25)');
            g.addColorStop(1,'rgba(10,14,25,0.35)');
          }
          ctx.fillStyle = g; ctx.fillRect(0,0,w,h);

          // connections
          for(let i=0;i<nodes.length;i++){
            const a = nodes[i];
            for(let j=i+1;j<nodes.length;j++){
              const b = nodes[j];
              const dx = a.x-b.x, dy = a.y-b.y;
              const d2 = dx*dx + dy*dy;
              if(d2 < 12000){
                const aphi = 0.12 - (d2/12000)/1.2;
                ctx.strokeStyle = state.meta.theme === 'light' ? `rgba(30,40,60,${aphi})` : `rgba(140,160,255,${aphi})`;
                ctx.lineWidth = 0.6;
                ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
              }
            }
          }

          // nodes
          for(let n of nodes){
            n.x += n.vx; n.y += n.vy;
            if(n.x<0||n.x>w) n.vx *= -1;
            if(n.y<0||n.y>h) n.vy *= -1;
            ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2);
            ctx.fillStyle = state.meta.theme === 'light' ? 'rgba(20,30,60,0.06)' : 'rgba(160,180,255,0.06)';
            ctx.fill();
          }
          requestAnimationFrame(draw);
        }
        make(); draw();
        window.addEventListener('resize', resize);
      })();

      /* ---------- Render ---------- */
      function renderProjects(){
        // select options
        projSelect.innerHTML = '';
        projectsEl.innerHTML = '';
        state.projects.forEach(p=>{
          const opt = document.createElement('option'); opt.value = p.id; opt.textContent = p.name;
          projSelect.appendChild(opt);

          const row = document.createElement('div'); row.className = 'proj';
          const meta = document.createElement('div'); meta.className = 'meta';
          const dot = document.createElement('span'); dot.className = 'dot'; dot.style.background = p.color;
          const name = document.createElement('div'); name.textContent = p.name;
          meta.appendChild(dot); meta.appendChild(name);
          const right = document.createElement('div'); right.style.fontSize='13px'; right.style.color='var(--muted)';
          right.textContent = state.tasks.filter(t=>t.projectId===p.id).length;
          row.appendChild(meta); row.appendChild(right);
          projectsEl.appendChild(row);
        });
      }

      function renderList(){
        // filter & sort
        const q = searchEl.value.trim().toLowerCase();
        let items = state.tasks.slice();

        // filter
        const now = todayISODate();
        items = items.filter(t=>{
          if(filter==='active') return !t.done;
          if(filter==='done') return t.done;
          if(filter==='today') return t.due === now;
          if(filter==='high') return Number(t.priority) === 1;
          return true;
        });

        // search fuzzy
        if(q){
          items = items.filter(t => {
            return (t.title + ' ' + (t.notes||'') + ' ' + (t.tags||'').join(' ')).toLowerCase().includes(q);
          });
        }

        // sort
        if(sortEl.value === 'priority'){
          items.sort((a,b)=>a.priority - b.priority);
        } else if(sortEl.value === 'duedate'){
          items.sort((a,b)=>{
            if(!a.due) return 1;
            if(!b.due) return -1;
            return new Date(a.due) - new Date(b.due);
          });
        } else { // recent
          items.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
        }

        // render
        listEl.innerHTML = '';
        if(items.length === 0){
          emptyEl.style.display = 'block';
          return;
        } else emptyEl.style.display = 'none';

        items.forEach((t, idx)=>{
          const item = document.createElement('div'); item.className = 'task'; item.draggable = true; item.dataset.id = t.id;
          // left
          const left = document.createElement('div'); left.className = 'left';
          const chk = document.createElement('div'); chk.className = 'chk'; chk.title = 'Toggle complete';
          chk.innerHTML = t.done ? '✓' : '';
          if(t.done) chk.classList.add('done');
          chk.addEventListener('click', ()=>{
            pushUndo(); t.done = !t.done; save(); renderList();
          });
          left.appendChild(chk);

          const content = document.createElement('div'); content.className = 'content';
          const titleLine = document.createElement('div'); titleLine.className = 'title-line';
          const title = document.createElement('div'); title.className = 'task-title'; title.textContent = t.title;
          if(t.done) title.classList.add('done');

          const rightActions = document.createElement('div'); rightActions.className = 'task-actions';
          const editBtn = document.createElement('button'); editBtn.className = 'icon-btn'; editBtn.title='Edit';
          editBtn.innerHTML = '✎'; editBtn.addEventListener('click', ()=> openEditor(t));
          const delBtn = document.createElement('button'); delBtn.className = 'icon-btn'; delBtn.title='Delete';
          delBtn.innerHTML = '🗑'; delBtn.addEventListener('click', ()=> {
            if(!confirm('Delete this task?')) return;
            pushUndo(); state.tasks = state.tasks.filter(x=>x.id !== t.id); save(); renderList();
          });
          rightActions.appendChild(editBtn); rightActions.appendChild(delBtn);

          titleLine.appendChild(title); titleLine.appendChild(rightActions);

          const notes = document.createElement('div'); notes.className = 'task-notes'; notes.textContent = t.notes || '';
          const metaRight = document.createElement('div'); metaRight.className = 'meta-right';

          // tags: project, priority, due
          const tagProj = document.createElement('div'); tagProj.className = 'tag'; tagProj.textContent = (state.projects.find(p=>p.id===t.projectId)||{}).name || 'Inbox';
          const tagPri = document.createElement('div'); tagPri.className = 'tag'; tagPri.textContent = 'P' + t.priority;
          metaRight.appendChild(tagProj); metaRight.appendChild(tagPri);

          if(t.due){ const td = document.createElement('div'); td.className='tag'; td.textContent = 'Due ' + t.due; metaRight.appendChild(td); }

          // assemble
          content.appendChild(titleLine);
          if(t.notes) content.appendChild(notes);
          content.appendChild(metaRight);

          item.appendChild(left); item.appendChild(content);

          // drag & drop handlers
          item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', t.id); item.classList.add('dragging');
            // create ghost
            const ghost = item.cloneNode(true);
            ghost.style.position='absolute'; ghost.style.top='-9999px'; document.body.appendChild(ghost);
            e.dataTransfer.setDragImage(ghost, 20, 20);
          });
          item.addEventListener('dragend', ()=> { item.classList.remove('dragging'); Array.from(document.querySelectorAll('.placeholder')).forEach(n=>n.remove()); });

          item.addEventListener('dragover', (e) => {
            e.preventDefault();
            const dragging = document.querySelector('.dragging');
            if(!dragging || dragging === item) return;
            const rect = item.getBoundingClientRect();
            const after = (e.clientY - rect.top) > rect.height / 2;
            let placeholder = item.nextSibling && item.nextSibling.classList && item.nextSibling.classList.contains('placeholder') ? item.nextSibling : null;
            if(!placeholder){
              placeholder = document.createElement('div'); placeholder.className='placeholder'; placeholder.style.height = rect.height + 'px';
            }
            placeholder.style.background = 'linear-gradient(90deg, rgba(124,58,237,0.06), rgba(6,182,212,0.04))';
            if(after) item.after(placeholder); else item.before(placeholder);
          });

          item.addEventListener('drop', (e)=>{
            e.preventDefault();
            const id = e.dataTransfer.getData('text/plain');
            const dragging = state.tasks.find(x=>x.id===id);
            if(!dragging) return;
            const nodes = Array.from(listEl.querySelectorAll('.task')).filter(n=>!n.classList.contains('dragging'));
            const placeholders = document.querySelectorAll('.placeholder');
            let targetIndex = state.tasks.findIndex(x=>x.id === t.id);
            // if placeholder exists and is after, increment index
            if(placeholders.length){
              const ph = placeholders[0];
              const siblings = Array.from(listEl.querySelectorAll('.task, .placeholder'));
              const idx = siblings.indexOf(ph);
              // count tasks before idx
              let count = 0;
              for(let i=0;i<idx;i++) if(siblings[i].classList && siblings[i].classList.contains('task')) count++;
              targetIndex = count;
            }
            pushUndo();
            // reorder in state.tasks by id:
            const from = state.tasks.findIndex(x=>x.id===id);
            if(from === -1) return;
            const [itm] = state.tasks.splice(from,1);
            state.tasks.splice(targetIndex,0,itm);
            save(); renderList();
          });

          listEl.appendChild(item);
        });
      }

      /* ---------- Events ---------- */
      addBtn.addEventListener('click', createFromInput);
      newBtn.addEventListener('click', () => { titleEl.focus(); });
      searchEl.addEventListener('input', () => renderList());
      sortEl.addEventListener('change', renderList);
      document.querySelectorAll('.filter').forEach(btn=>{
        btn.addEventListener('click', (e)=>{
          document.querySelectorAll('.filter').forEach(b=>b.classList.remove('active'));
          e.target.classList.add('active');
          filter = e.target.dataset.filter; renderList();
        });
      });
      addProjBtn.addEventListener('click', ()=>{
        const name = prompt('Project name') || '';
        if(!name) return;
        pushUndo(); state.projects.push({ id: uid('p'), name, color: randomColor() }); save(); renderProjects(); renderList();
      });

      // export/import
      exportBtn.addEventListener('click', ()=> {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'todo-export.json'; a.click();
        URL.revokeObjectURL(url);
      });
      importBtn.addEventListener('click', ()=> fileImport.click());
      fileImport.addEventListener('change', (e)=>{
        const f = e.target.files[0]; if(!f) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try{
            const data = JSON.parse(ev.target.result);
            if(!confirm('Replace current tasks with imported data?')) return;
            pushUndo(); state = data; save(); applyTheme(); renderProjects(); renderList();
          }catch(err){ alert('Invalid file'); }
        };
        reader.readAsText(f);
        fileImport.value = '';
      });

      // theme toggle
      themeBtn.addEventListener('click', ()=> {
        pushUndo(); state.meta.theme = state.meta.theme === 'light' ? 'dark' : 'light'; applyTheme(); save();
      });

      // keyboard shortcuts
      window.addEventListener('keydown', (e) => {
        if(e.key === 'n'){ e.preventDefault(); titleEl.focus(); return; }
        if((e.ctrlKey||e.metaKey) && e.key.toLowerCase() === 'z'){ e.preventDefault(); if(undoStack.length){ state = undoStack.shift(); save(); applyTheme(); renderProjects(); renderList(); } return; }
      });

      // create task
      function createFromInput(){
        const txt = titleEl.value.trim();
        if(!txt) { titleEl.focus(); return; }
        pushUndo();
        const t = {
          id: uid('t'), title: txt, notes: '', projectId: projSelect.value || state.projects[0].id,
          priority: Number(priorityEl.value || 2), due: dueEl.value || null,
          createdAt: new Date().toISOString(), done: false
        };
        state.tasks.unshift(t); titleEl.value=''; dueEl.value=''; save(); renderList();
      }

      function openEditor(task){
        // simple inline edit modal using prompt for speed & compatibility
        const newTitle = prompt('Edit title', task.title);
        if(newTitle === null) return;
        pushUndo();
        task.title = newTitle.trim() || task.title;
        const newNotes = prompt('Notes (optional)', task.notes || '') ;
        if(newNotes !== null) task.notes = newNotes;
        save(); renderList();
      }

      // random color generator for project dot
      function randomColor(){ const palette = ['#7c3aed','#06b6d4','#ef4444','#f59e0b','#10b981','#3b82f6','#ec4899']; return palette[Math.floor(Math.random()*palette.length)]; }

      // apply theme
      function applyTheme(){
        if(state.meta && state.meta.theme === 'light') document.documentElement.setAttribute('data-theme','light'); else document.documentElement.removeAttribute('data-theme');
      }

      // initial demo data if empty
      if(state.tasks.length === 0){
        state.tasks.push({
          id: uid('t'), title: 'Welcome — try shortcuts, drag & drop', notes: 'Press "n" to focus new task. Try export/import and theme toggle.', projectId: state.projects[0].id, priority:1, due: '', createdAt: new Date().toISOString(), done:false
        });
        save();
      }

      // expose some functions for debugging (optional)
      window._aurora = { state, save, renderList, renderProjects };

    })();