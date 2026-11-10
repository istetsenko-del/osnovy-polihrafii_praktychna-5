(() => {
  'use strict';
  const course=window.PR5_COURSE, {esc,right,score,numeric,validate}=PR5;
  const key='opp:practical-05:imposition:v1';
  const setupMode=new URLSearchParams(location.search).get('setup')==='1';
  const $=id=>document.getElementById(id);
  const fresh=()=>({version:course.version,rev:0,name:'',group:'',url:'',selected:0,mode:'active',started:false,
    visibility:{count:0,ms:0},steps:course.steps.map(()=>({note:'',answers:Array(5).fill(''),first:null,last:null,checks:0,done:false}))});
  let state,storageFailed=false,hiddenAt=null,sending=false,sendError='',diagramIndex=0;
  const read=()=>JSON.parse(localStorage.getItem(key)||'null');
  function load(){const s=read();if(!s)return fresh();if(s.version!==course.version||!Array.isArray(s.steps)||s.steps.length!==10||!['active','pending','done'].includes(s.mode))throw Error('STATE');if(s.mode!=='active')validate(course,s.snapshot);return s;}
  try{state=load();localStorage.setItem(key,JSON.stringify(state));}catch{state=fresh();storageFailed=true;}
  const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
  function endpoint(s){try{const u=new URL(s);return u.protocol==='https:'&&u.hostname==='script.google.com'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&/^\/macros\/s\/[\w-]+\/exec$/.test(u.pathname)?u.href:'';}catch{return '';}}
  const configured=()=>state.submitUrl||endpoint(window.PR5_CONFIG?.webAppUrl)||endpoint(state.url);
  const total=()=>state.steps.filter(s=>s.done).length;
  const isFrozen=()=>state.mode!=='active';
  const notice=s=>{$('notice').textContent=s;};
  function commit(fn){
    if(storageFailed)return false;
    try{
      const other=read();
      if(other&&other.rev!==state.rev){state=load();show=state.mode==='active'?'step':state.mode;diagramIndex=0;render();notice('Прогрес оновлено з іншої вкладки. Повторіть останню дію тут.');return false;}
      const next=JSON.parse(JSON.stringify(state));fn(next);next.rev++;
      localStorage.setItem(key,JSON.stringify(next));state=next;return true;
    }catch{storageFailed=true;render();notice('Браузер не дозволяє зберігати прогрес. Відкрийте сайт у звичайному режимі з доступним сховищем.');return false;}
  }
  const formatNum=q=>q.places===0?'Ціле число.':`Округліть до ${q.places===1?'одного десяткового знака':q.places+' десяткових знаків'}.`;
  const matrix={front:[['5','↓'],['4','↓'],['8','↑'],['1','↑']],backBad:[['3','↑'],['6','↓'],['2','↑'],['7','↑']],backGood:[['3','↓'],['6','↓'],['2','↑'],['7','↑']]};
  function sheet(m,caption){return `<figure class="sheet"><div class="sheet-caption">${esc(caption)} <span>верх аркуша ↑</span></div><div class="sheet-grid">${m.map(([n,a])=>`<div class="sheet-cell"><span>${a||'·'}</span><b>${esc(n)}</b></div>`).join('')}</div><figcaption>Штрихові лінії — згини. Стрілка показує верх сторінки. Не в масштабі.</figcaption></figure>`;}
  const mini=(title,detail)=>`<div class="mini"><b>${esc(title)}</b><span>${esc(detail)}</span></div>`;
  function diagram(kind){
    if(kind==='blank')return sheet([['А',''],['Б',''],['В',''],['Г','']],'216 × 308 мм · x = 108, y = 154 мм');
    if(kind==='front')return sheet(matrix.front,'Лице V1 / V2');
    if(kind==='backBad'||kind==='compare'||kind==='final'){
      const compare=kind==='compare', final=kind==='final';
      const labels=compare?['Одержаний зворот V1','Виправлений зворот V2']:['Лице','Зворот'];
      const m=compare?[matrix.backBad,matrix.backGood]:[matrix.front,final?matrix.backGood:matrix.backBad];
      return `<div class="diagram-switch" aria-label="Перегляд спуску">${labels.map((l,i)=>`<button type="button" data-view="${i}" aria-pressed="${diagramIndex===i}" class="button ${diagramIndex===i?'':'secondary'}">${l}</button>`).join('')}</div>${sheet(m[diagramIndex],labels[diagramIndex]+(kind==='backBad'?' · V1':final?' · V2':''))}`;
    }
    if(kind==='fold'){
      const views=[['Плаский аркуш','Лице перед вами; верхній ряд повернуто.'],['Перший згин','Верхню половину складіть за нижню. Зовні видно 8 | 1.'],['Другий згин','Ліву половину складіть за праву. Видно 1; корінець ліворуч.'],['Проба','Верх відкрито; 2 читається, а 3 на звороті V1 перевернута.']];
      const v=views[diagramIndex];
      return `<div class="diagram-switch" aria-label="Етап згинання">${views.map((x,i)=>`<button type="button" data-view="${i}" aria-pressed="${diagramIndex===i}" class="button ${diagramIndex===i?'':'secondary'}">${i+1}</button>`).join('')}</div><p class="fold-caption"><b>${v[0]}.</b> ${v[1]}</p>${diagramIndex===0?sheet(matrix.front,'Лице'):diagramIndex===1?`<div class="fold-model pair"><b>8 ↑</b><b>1 ↑</b></div>`:diagramIndex===2?`<div class="fold-model cover"><b>1 ↑</b></div>`:`<div class="fold-model pair"><b>2 ↑</b><b>3 ↓</b></div>`}`;
    }
    if(kind==='geometry')return `<div class="geo"><b>Аркуш 240 × 330 мм</b><div class="geo-use"><b>Корисна зона 226 × 316 мм</b><div class="geo-blank">Заготовка 216 × 308 мм</div><span>Відступи в зоні: 5 мм по боках, 4 мм згори й знизу</span></div><small>Схема не в масштабі; службові поля вже враховано.</small></div>`;
    if(kind==='plates')return `<div class="mini-row">${mini('Л1 · залишити','Лице перевірено')}${mini('З1 · вилучити','Сторінка 3 перевернута')}${mini('З2 · виготовити','Виправлений зворот V2')}</div>`;
    if(kind==='counts')return `<div class="mini-row">${mini('500','Придатні зошити')}${mini('+ 24','Приладження')}${mini('+ 16','Резерв обробки')}${mini('540','План аркушів')}</div>`;
    return `<div class="mini-row">${mini('PDF 1–8','Порядок читання')}${mini('Лице і зворот','Друкарські місця')}${mini('Зошит','Згини та обріз')}</div>`;
  }
  function renderNav(){
    $('progress').value=total();$('progress-label').textContent=`${total()} із 10 кроків`;$('progress-percent').textContent=`${total()*10} %`;
    $('step-nav').innerHTML=course.steps.map((s,i)=>`<button type="button" class="nav-step ${state.selected===i?'current':''} ${state.steps[i].done?'done':''}" data-step="${i}" ${i>total()||storageFailed?'disabled':''} ${state.selected===i?'aria-current="step"':''}><span class="index">${state.steps[i].done?'✓':i+1}</span><span>${esc(s.title)}</span></button>`).join('');
    $('summary-button').disabled=state.mode!=='done'||storageFailed;
  }
  function renderStep(){
    const i=state.selected,step=course.steps[i],x=state.steps[i],locked=isFrozen()||x.done||storageFailed;
    const old=i?`<details class="brief prior"><summary><span>Рішення попередніх кроків</span><span class="small">${i} запис(ів)</span></summary><div class="prior-body">${course.steps.slice(0,i).map((s,k)=>`<div><b>${k+1}. ${esc(s.title)}</b><p>${esc(s.carry)}</p><p class="prior-note">${esc(state.steps[k].note)}</p></div>`).join('')}</div></details>`:'';
    const questions=step.questions.map((q,j)=>{
      const checked=x.last&&x.last[j]===x.answers[j], good=checked&&right(q,x.last[j]);
      const fb=checked?`<p class="feedback" role="status"><b>${good?'Правильно.':'Спробуйте ще раз.'}</b> ${esc(q.explain)}</p>`:'';
      const fields=q.type==='choice'?`<div class="answers">${q.options.map((v,k)=>`<label class="option"><input type="radio" name="q${j}" data-q="${j}" value="${k}" ${x.answers[j]===String(k)?'checked':''} ${locked?'disabled':''}><span>${esc(v)}</span></label>`).join('')}</div>`:`<div class="numeric"><input type="text" inputmode="decimal" aria-label="Відповідь на запитання ${j+1}, ${esc(q.unit)}" data-q="${j}" value="${esc(x.answers[j])}" maxlength="32" ${locked?'disabled':''}><span>${esc(q.unit)} · ${formatNum(q)} Кома або крапка.</span></div>`;
      return `<fieldset class="question ${checked?(good?'correct':'incorrect'):''}" data-card="${j}"><legend><span class="qno">ЗАПИТАННЯ ${j+1} / 5</span>${esc(q.text)}</legend>${fields}${fb}</fieldset>`;
    }).join('');
    const first=x.first?score(step,x.first):null,last=x.last?score(step,x.last):null;
    $('step-content').innerHTML=`<div class="step-heading"><span class="counter">КРОК ${String(i+1).padStart(2,'0')} / 10</span><span class="tag">${esc(step.tag)}</span></div><h2 class="step-title">${esc(step.title)}</h2><p class="step-intro">${esc(step.intro)}</p>${old}<div class="theory"><p class="section-kicker">Дані для рішення</p>${step.theory.map(v=>`<p>${esc(v)}</p>`).join('')}</div><div class="mask-view" id="diagram">${diagram(step.diagram)}</div><div class="task"><h3>Практичне завдання</h3><p>${esc(step.task)}</p><label for="solution">Ваше рішення для звіту</label><textarea id="solution" maxlength="4000" placeholder="Запишіть розрахунки й поясніть ваш вибір…" ${locked?'readonly':''}>${esc(x.note)}</textarea><p class="hint">Текст оцінює викладач. Сайт перевіряє, чи запис заповнено, та оцінює тестові відповіді.</p></div><div class="quiz-heading"><h3>Перевірте рішення</h3><span>5 запитань</span></div>${questions}<p class="check-status" id="check-status" role="status">${first===null?'Після першої перевірки тут з’явиться її результат.':`Перша перевірка: ${first}/5 · Остання перевірка: ${last}/5 · Перевірок: ${x.checks}.`}${x.done?' Крок завершено.':''}</p><div class="actions">${!locked?'<button type="button" id="check" class="button">Перевірити 5 відповідей</button>':''}${x.done&&i<9?'<button type="button" id="next" class="button">До наступного кроку →</button>':''}${i>0?'<button type="button" id="prev" class="button secondary">← Попередній крок</button>':''}</div>`;
  }
  function renderSubmission(){
    const ready=Boolean(configured());
    const text=sending?'Зберігаємо роботу…':sendError||(!ready?'Відповіді зафіксовано. Підсумок буде доступний після збереження.':'Очікуємо підтвердження збереження.');
    $('submission').innerHTML=`<div class="email-panel"><h3>Збереження роботи</h3><p role="status" class="${sendError?'email-status error':''}">${esc(text)}</p>${sendError&&ready&&!sending?'<button id="retry" class="button" type="button">Повторити збереження</button>':''}</div>`;
  }
  function renderSummary(){
    const s=state.snapshot;
    $('summary-content').innerHTML=`<div class="summary-hero"><h2>Роботу збережено</h2><p>${esc(s.name)} · ${esc(s.group)}</p></div><div class="stats"><div class="stat"><b>${PR5.firstTotal(course,s)}/50</b><span>Перші перевірки</span></div><div class="stat"><b>50/50</b><span>Після виправлень</span></div><div class="stat"><b>10/10</b><span>Кроків завершено</span></div></div><h3>Виробнича карта</h3><p class="prior-note report-note">${esc(s.steps[9].note)}</p><p class="summary-note">Текстові рішення перевіряє викладач.</p><button class="button" type="button" id="download">Завантажити звіт</button>`;
  }
  let show='step';
  function render(){
    renderNav();
    $('receiver').hidden=!setupMode;
    $('student-name').value=state.name;$('student-group').value=state.group;
    $('student-name').readOnly=$('student-group').readOnly=isFrozen()||storageFailed;
    $('endpoint').value=configured()||state.url;
    $('endpoint').readOnly=!!(state.submitUrl||endpoint(window.PR5_CONFIG?.webAppUrl))||storageFailed;
    $('save-receiver').disabled=state.mode==='done'||storageFailed;
    $('connection-label').textContent=configured()?'Адресу задано':'Адреса приймача не задана';
    $('step-content').hidden=show!=='step';$('submission').hidden=show!=='pending';$('summary-content').hidden=show!=='done';
    if(show==='pending')renderSubmission();else if(show==='done')renderSummary();else renderStep();
    if(storageFailed)notice('Збереження недоступне. Сайт не дозволить почати або зафіксувати спробу без робочого сховища браузера.');
  }
  function go(i){if(!Number.isInteger(i)||i<0||i>=10||i>total())return;if(commit(s=>{s.selected=i;})){diagramIndex=0;show='step';render();$('step-content').focus();$('step-content').scrollIntoView({block:'start'});}}
  function check(){
    const i=state.selected,step=course.steps[i],x=state.steps[i];
    if(isFrozen()||x.done||storageFailed||i>total())return;
    const alert=s=>{const el=$('check-status');el.textContent=s;el.classList.add('error');};
    if(!x.note.trim()){alert('Спочатку запишіть власне рішення для звіту.');$('solution').focus();return;}
    const bad=step.questions.findIndex((q,j)=>q.type==='number'?!Number.isFinite(numeric(x.answers[j])):!(/^[0-3]$/.test(x.answers[j])));
    if(bad>=0){alert(`Заповніть запитання ${bad+1}. Числа вводьте без одиниць, з комою або крапкою.`);document.querySelector(`[data-q="${bad}"]`)?.focus();return;}
    if(i===9&&(state.name.trim().length<2||!state.group.trim())){alert('Перед перевіркою останнього кроку заповніть ПІБ і групу вгорі сторінки.');$('student-name').focus();return;}
    const points=score(step,x.answers);
    const finish=i===9&&points===5, delta=finish&&hiddenAt!==null?Math.max(0,Date.now()-hiddenAt):0;
    if(!commit(s=>{
      const y=s.steps[i];if(!y.first)y.first=y.answers.slice();y.last=y.answers.slice();y.checks++;y.done=points===5;
      if(finish){
        s.visibility.ms+=delta;
        s.snapshot={version:course.version,id:token(),name:s.name.trim(),group:s.group.trim(),finishedAt:new Date().toISOString(),visibility:{...s.visibility},steps:s.steps.map(z=>({note:z.note.trim(),answers:z.answers.slice(),first:z.first.slice(),checks:z.checks}))};
        validate(course,s.snapshot);s.mode='pending';
      }
    }))return;
    if(finish){hiddenAt=null;show='pending';render();$('submission').focus();$('submission').scrollIntoView({block:'start'});void send();}
    else{render();$('check-status').scrollIntoView({block:'nearest'});}
  }
  function bindInputs(){
    for(const [id,k] of [['student-name','name'],['student-group','group']])$(id).addEventListener('input',e=>{if(!isFrozen())commit(s=>{s[k]=e.target.value.slice(0,k==='name'?120:40);});});
    $('step-content').addEventListener('input',e=>{
      const el=e.target,i=state.selected;if(isFrozen()||state.steps[i].done)return;
      if(el.id==='solution')commit(s=>{s.steps[i].note=el.value.slice(0,4000);s.started=true;});
      if(el.dataset.q!==undefined){const j=Number(el.dataset.q);if(commit(s=>{s.steps[i].answers[j]=el.value.slice(0,32);s.started=true;})){const card=el.closest('fieldset');card.classList.remove('correct','incorrect');card.querySelector('.feedback')?.remove();}}
    });
    $('step-content').addEventListener('click',e=>{
      const el=e.target.closest('button');if(!el)return;
      if(el.id==='check')check();if(el.id==='next')go(state.selected+1);if(el.id==='prev')go(state.selected-1);
      if(el.dataset.view!==undefined){diagramIndex=Number(el.dataset.view);$('diagram').innerHTML=diagram(course.steps[state.selected].diagram);$('diagram').querySelector(`[data-view="${diagramIndex}"]`)?.focus();}
    });
    $('step-nav').addEventListener('click',e=>{const b=e.target.closest('[data-step]');if(b&&!b.disabled)go(Number(b.dataset.step));});
    $('summary-button').addEventListener('click',()=>{if(state.mode==='done'){show='done';render();$('summary-content').focus();$('summary-content').scrollIntoView({block:'start'});}});
    $('submission').addEventListener('click',e=>{if(e.target.id==='retry')void send();});
    $('summary-content').addEventListener('click',e=>{
      if(e.target.id!=='download'||state.mode!=='done')return;
      const url=URL.createObjectURL(new Blob([PR5.report(course,state.snapshot,state.receipt)],{type:'text/html;charset=utf-8'}));
      const a=document.createElement('a');a.href=url;a.download=`ПР05_${state.snapshot.id}.html`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    $('receiver-form').addEventListener('submit',e=>{
      e.preventDefault();if(!setupMode||storageFailed||state.mode==='done')return;
      const url=state.submitUrl||endpoint(window.PR5_CONFIG?.webAppUrl)||endpoint($('endpoint').value.trim());
      if(!url){$('connection-status').textContent='Потрібна повна адреса script.google.com, яка закінчується /exec.';return;}
      if(!commit(s=>{s.url=url;}))return;
      sendError='';if(state.mode==='pending')show='pending';render();$('connection-status').textContent='Підключення збережено у браузері.';
      if(state.mode==='pending')void send();
    });
  }
  // POST into an isolated frame. Only a matching receipt from Apps Script counts as saved.
  function receive(url,snapshot){
    return new Promise((resolve,reject)=>{
      const nonce=token(),frame=document.createElement('iframe'),form=document.createElement('form');
      frame.name='pr5_'+nonce;frame.title='Квитанція Google Apps Script';frame.hidden=true;
      form.method='POST';form.action=url;form.target=frame.name;form.hidden=true;
      const origin=location.origin;
      for(const [name,value] of Object.entries({origin,nonce,payload:JSON.stringify(snapshot)})){const input=document.createElement('input');input.type='hidden';input.name=name;input.value=value;form.append(input);}
      const cleanup=()=>{clearTimeout(timer);window.removeEventListener('message',ack);form.remove();frame.remove();};
      const ack=e=>{
        let host;try{const u=new URL(e.origin);if(u.protocol!=='https:')return;host=u.hostname;}catch{return;}
        if(host!=='script.google.com'&&host!=='script.googleusercontent.com'&&!host.endsWith('.googleusercontent.com'))return;
        const x=e.data;
        if(!x||x.protocol!==course.version||x.nonce!==nonce||x.id!==snapshot.id)return;
        cleanup();
        if(x.status==='saved'&&typeof x.savedAt==='string'&&Number.isFinite(Date.parse(x.savedAt)))resolve({savedAt:x.savedAt});
        else reject(Error(x.status==='error'?String(x.code):'RECEIPT'));
      };
      const timer=setTimeout(()=>{cleanup();reject(Error('TIMEOUT'));},45000);
      window.addEventListener('message',ack);document.body.append(frame,form);
      try{form.submit();}catch{cleanup();reject(Error('NETWORK'));}
    });
  }
  const messages={CONFIG:'Не вдалося зберегти роботу. Повідомте викладача.',VALIDATION:'Не вдалося зберегти роботу. Повідомте викладача.',ANSWERS:'Не вдалося зберегти роботу. Повідомте викладача.',CONFLICT:'Не вдалося підтвердити збереження. Повідомте викладача.',BUSY:'Збереження затримується. Спробуйте ще раз.',STORAGE:'Не вдалося зберегти роботу. Повідомте викладача.'};
  async function send(){
    if(sending||state.mode!=='pending'||storageFailed||!configured())return;
    if(location.protocol!=='https:'||window.top!==window){sendError='Відкрийте опубліковану сторінку роботи в окремій вкладці.';render();return;}
    if(!state.submitUrl&&!commit(s=>{s.submitUrl=configured();}))return;
    sending=true;sendError='';show='pending';render();
    try{
      const receipt=await receive(state.submitUrl,state.snapshot);
      if(commit(s=>{s.receipt=receipt;s.mode='done';})){
        show='done';render();$('summary-content').focus();$('summary-content').scrollIntoView({block:'start'});
      }
    }catch(e){sendError=messages[e.message]||'Збереження не підтверджено. Перевірте інтернет і спробуйте ще раз.';}
    finally{sending=false;render();}
  }
  function visibility(closing=false){
    if(isFrozen()||!state.started||storageFailed)return;
    if(document.visibilityState==='hidden'&&!closing){
      if(hiddenAt===null&&commit(s=>{s.visibility.count++;}))hiddenAt=Date.now();
    }else if(hiddenAt!==null){const elapsed=Math.max(0,Date.now()-hiddenAt);hiddenAt=null;commit(s=>{s.visibility.ms+=elapsed;});}
  }
  document.addEventListener('visibilitychange',()=>visibility());
  window.addEventListener('pagehide',()=>visibility(true));
  window.addEventListener('storage',e=>{if(e.key!==key)return;try{state=load();show=state.mode==='active'?'step':state.mode;diagramIndex=0;render();}catch{storageFailed=true;render();}});
  show=state.mode==='active'?'step':state.mode;bindInputs();render();
  if(state.mode==='pending')void send();
})();
