/* Shared scoring, validation and report rendering. Also embedded in Code.gs. */
const PR5 = (() => {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const int = (v,min,max) => Number.isSafeInteger(v) && v>=min && v<=max;
  const attemptOK = v => typeof v==='string' && /^[a-f0-9]{32}$/.test(v);
  const numeric = v => {
    const s=String(v ?? '').trim().replace(/[\u00a0\u202f ]/g,'');
    return s.length<=32 && /^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(s) ? Number(s.replace(',','.')) : NaN;
  };
  function right(q,v){
    if(q.type==='choice')return typeof v==='string' && /^[0-3]$/.test(v) && Number(v)===q.key;
    // Match the requested rounded answer; decimal zeroes and decimal comma are accepted.
    return Math.abs(numeric(v)-q.key)<1e-8;
  }
  const score=(step,values)=>step.questions.reduce((sum,q,i)=>sum+Number(right(q,values[i])),0);
  const answer=(q,v)=>q.type==='choice' ? q.options[Number(v)] ?? '—' : `${v} ${q.unit}`;
  const firstTotal=(course,s)=>course.steps.reduce((sum,step,i)=>sum+score(step,s.steps[i].first),0);
  const minutes=ms=>`${Math.floor(ms/60000)} хв ${Math.floor(ms/1000)%60} с`;
  function validate(course,s){
    const str=(x,min,max)=>typeof x==='string'&&x.trim().length>=min&&x.length<=max;
    if(!s||s.version!==course.version||!attemptOK(s.id)||!str(s.name,2,120)||!str(s.group,1,40)||!Array.isArray(s.steps)||s.steps.length!==10||!str(s.finishedAt,1,40)||!Number.isFinite(Date.parse(s.finishedAt)))throw Error('VALIDATION');
    if(!s.visibility||!int(s.visibility.count,0,100000)||!int(s.visibility.ms,0,31536000000))throw Error('VALIDATION');
    s.steps.forEach((x,i)=>{
      if(!x||!str(x.note,1,4000)||!int(x.checks,1,10000)||![x.first,x.answers].every(a=>Array.isArray(a)&&a.length===5&&a.every(v=>str(v,1,32))))throw Error('VALIDATION');
      if(score(course.steps[i],x.answers)!==5)throw Error('ANSWERS');
    });
    return s;
  }
  function report(course,s,receipt,digest=''){
    validate(course,s);
    const sections=course.steps.map((step,i)=>{
      const x=s.steps[i];
      return `<section><h2>${i+1}. ${esc(step.title)}</h2><p class="meta">Перша перевірка: ${score(step,x.first)}/5 · Після виправлень: 5/5 · Перевірок: ${x.checks}</p><h3>Завдання</h3><p>${esc(step.task)}</p><h3>Рішення студента</h3><div class="note">${esc(x.note)}</div><h3>Відповіді й пояснення</h3><ol>${step.questions.map((q,j)=>`<li><b>${esc(q.text)}</b><br>Перша відповідь: ${esc(answer(q,x.first[j]))} (${right(q,x.first[j])?'правильно':'помилка'})<br>Фінальна відповідь: ${esc(answer(q,x.answers[j]))}<br>${esc(q.explain)}</li>`).join('')}</ol></section>`;
    }).join('');
    const meta=digest?`<meta name="pr05-digest" content="${esc(digest)}">`:'';
    return `<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${meta}<title>ПР05 — ${esc(s.name)}</title><style>body{max-width:940px;margin:32px auto;padding:0 20px;font:16px/1.65 system-ui,Arial,sans-serif;color:#183a34}h1{font-size:29px}h2{font-size:23px;margin-top:34px;border-bottom:1px solid #dadfd5}h3{font-size:17px}.meta{font-size:13px;color:#50645b}.note{white-space:pre-wrap;overflow-wrap:anywhere;background:#edf2e5;padding:16px}li{margin:14px 0}p{overflow-wrap:anywhere}@media print{body{margin:0;font-size:11pt}h2{break-after:avoid}li{break-inside:avoid}}</style></head><body><h1>Практична робота №5<br>${esc(course.title)}</h1><p><b>ПІБ:</b> ${esc(s.name)}<br><b>Група:</b> ${esc(s.group)}</p><p class="meta">Номер спроби: ${esc(s.id)}<br>Версія: ${esc(s.version)}<br>Зафіксовано: ${esc(s.finishedAt)}<br>Збереження підтверджено: ${esc(receipt.savedAt)}</p><p><b>Перші перевірки:</b> ${firstTotal(course,s)}/50.<br><b>Після виправлень:</b> 50/50.</p><p class="meta">Перші відповіді й кількість перевірок отримано з браузера. Це навчальний тренажер. Текстові рішення оцінює викладач.</p><h2>Виробнича карта студента</h2><div class="note">${esc(s.steps[9].note)}</div><h2>Видимість сторінки</h2><p>Сторінка ставала невидимою: <b>${s.visibility.count}</b> раз(ів). Приблизний сумарний час: <b>${minutes(s.visibility.ms)}</b>.</p><p class="meta">Причина невідома. Показник не є доказом списування; час між закриттям і повторним відкриттям сторінки не враховується.</p>${sections}</body></html>`;
  }
  return {esc,numeric,right,score,answer,firstTotal,minutes,attemptOK,validate,report};
})();
