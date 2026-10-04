const $ = (id) => document.getElementById(id);
const state = { score: 0, answered: new Set(), data: [], model: null };

function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
function gaussian(rand){let u=0,v=0;while(u===0)u=rand();while(v===0)v=rand();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function linspace(a,b,n){if(n===1)return[a];return Array.from({length:n},(_,i)=>a+(b-a)*i/(n-1))}
function mean(xs){return xs.reduce((a,b)=>a+b,0)/xs.length}

function fitLinear(data){
  const xs=data.map(d=>d.x), ys=data.map(d=>d.y), mx=mean(xs), my=mean(ys);
  const num=xs.reduce((s,x,i)=>s+(x-mx)*(ys[i]-my),0);
  const den=xs.reduce((s,x)=>s+(x-mx)**2,0) || 1;
  const slope=num/den, intercept=my-slope*mx;
  const preds=xs.map(x=>intercept+slope*x);
  const residuals=ys.map((y,i)=>y-preds[i]);
  const mae=mean(residuals.map(Math.abs));
  const rmse=Math.sqrt(mean(residuals.map(r=>r*r)));
  const ssRes=residuals.reduce((s,r)=>s+r*r,0);
  const ssTot=ys.reduce((s,y)=>s+(y-my)**2,0);
  const r2=ssTot===0?1:1-ssRes/ssTot;
  return {slope,intercept,preds,residuals,mae,rmse,r2};
}

function regenerate(){
  const n=+$('numPoints').value,slope=+$('slope').value,intercept=+$('intercept').value,noise=+$('noise').value,seed=+$('seed').value;
  const rand=mulberry32(seed+1), xs=linspace(1,10,n);
  state.data=xs.map(x=>({x,y:slope*x+intercept+gaussian(rand)*noise}));
  state.model=fitLinear(state.data);
  updateUI();
}

function updateUI(){
  const m=state.model;
  $('numPointsValue').textContent=$('numPoints').value;
  $('slopeValue').textContent=(+$('slope').value).toFixed(1);
  $('interceptValue').textContent=(+$('intercept').value).toFixed(1);
  $('noiseValue').textContent=(+$('noise').value).toFixed(1);
  $('seedValue').textContent=$('seed').value;
  $('modelExplanation').innerHTML=`Aktuell hat das Modell ungefähr <strong>b₀ = ${m.intercept.toFixed(2)}</strong> und <strong>b₁ = ${m.slope.toFixed(2)}</strong> gelernt. b₀ verschiebt die Gerade nach oben oder unten; b₁ bestimmt die Steigung.`;
  $('metricSlope').textContent=m.slope.toFixed(2); $('metricIntercept').textContent=m.intercept.toFixed(2); $('metricR2').textContent=m.r2.toFixed(3); $('metricMae').textContent=m.mae.toFixed(2); $('metricRmse').textContent=m.rmse.toFixed(2);
  const msg=$('fitMessage');
  if(m.r2>0.8){msg.className='feedback good';msg.textContent='Die Gerade erklärt die Daten hier ziemlich gut.'}
  else if(m.r2>0.4){msg.className='feedback warn';msg.textContent='Mittlerer Zusammenhang: klare Tendenz, aber auch sichtbare Streuung.'}
  else{msg.className='feedback bad';msg.textContent='Die lineare Gerade beschreibt diese Daten nur schwach.'}
  syncGuessRange(); drawAll(); fillTable();
}

function extent(values,pad=.12){let min=Math.min(...values),max=Math.max(...values);if(min===max){min-=1;max+=1}const p=(max-min)*pad;return [min-p,max+p]}
function svgEl(name,attrs={}){const e=document.createElementNS('http://www.w3.org/2000/svg',name);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e}
function drawChart(svg,{showResiduals=false,predictionX=null}){
  svg.innerHTML=''; const W=800,H=predictionX===null?480:430, M={l:62,r:24,t:24,b:52};
  const xs=[...state.data.map(d=>d.x),0,12], predY=predictionX===null?null:state.model.intercept+state.model.slope*predictionX;
  const ys=[...state.data.map(d=>d.y),...state.model.preds]; if(predY!==null)ys.push(predY);
  const [xmin,xmax]=extent(xs,.02),[ymin,ymax]=extent(ys,.15);
  const sx=x=>M.l+(x-xmin)/(xmax-xmin)*(W-M.l-M.r), sy=y=>H-M.b-(y-ymin)/(ymax-ymin)*(H-M.t-M.b);
  for(let i=0;i<=5;i++){
    const y=ymin+(ymax-ymin)*i/5, yy=sy(y); svg.appendChild(svgEl('line',{x1:M.l,x2:W-M.r,y1:yy,y2:yy,class:'grid'}));
    const t=svgEl('text',{x:M.l-10,y:yy+4,'text-anchor':'end',class:'tick'});t.textContent=y.toFixed(1);svg.appendChild(t);
  }
  for(let i=0;i<=6;i++){
    const x=xmin+(xmax-xmin)*i/6,xx=sx(x);svg.appendChild(svgEl('line',{x1:xx,x2:xx,y1:M.t,y2:H-M.b,class:'grid'}));
    const t=svgEl('text',{x:xx,y:H-M.b+24,'text-anchor':'middle',class:'tick'});t.textContent=x.toFixed(1);svg.appendChild(t);
  }
  svg.appendChild(svgEl('line',{x1:M.l,x2:W-M.r,y1:H-M.b,y2:H-M.b,class:'axis'}));svg.appendChild(svgEl('line',{x1:M.l,x2:M.l,y1:M.t,y2:H-M.b,class:'axis'}));
  if(showResiduals)state.data.forEach((d,i)=>svg.appendChild(svgEl('line',{x1:sx(d.x),x2:sx(d.x),y1:sy(d.y),y2:sy(state.model.preds[i]),class:'residual'})));
  const x1=xmin,x2=xmax,y1=state.model.intercept+state.model.slope*x1,y2=state.model.intercept+state.model.slope*x2;
  svg.appendChild(svgEl('line',{x1:sx(x1),y1:sy(y1),x2:sx(x2),y2:sy(y2),class:'reg-line'}));
  state.data.forEach(d=>svg.appendChild(svgEl('circle',{cx:sx(d.x),cy:sy(d.y),r:7,class:'point'})));
  if(predictionX!==null){
    svg.appendChild(svgEl('line',{x1:sx(predictionX),x2:sx(predictionX),y1:M.t,y2:H-M.b,class:'residual'}));
    svg.appendChild(svgEl('circle',{cx:sx(predictionX),cy:sy(predY),r:10,class:'prediction-point'}));
  }
  let tx=svgEl('text',{x:(M.l+W-M.r)/2,y:H-10,'text-anchor':'middle',class:'axis-label'});tx.textContent='x';svg.appendChild(tx);
  let ty=svgEl('text',{x:18,y:(M.t+H-M.b)/2,transform:`rotate(-90 18 ${(M.t+H-M.b)/2})`,'text-anchor':'middle',class:'axis-label'});ty.textContent='y';svg.appendChild(ty);
}
function drawAll(){drawChart($('exploreChart'),{showResiduals:true});drawChart($('predictChart'),{predictionX:+$('predictionX').value})}

function syncGuessRange(){
  const x=+$('predictionX').value, pred=state.model.intercept+state.model.slope*x; const ys=state.data.map(d=>d.y);
  let min=Math.floor(Math.min(...ys,pred)-10), max=Math.ceil(Math.max(...ys,pred)+10); if(min===max)max=min+10;
  $('guess').min=min;$('guess').max=max;
  let g=+$('guess').value;if(g<min||g>max||Number.isNaN(g))g=(min+max)/2;$('guess').value=g.toFixed(1);
  $('predictionXValue').textContent=x.toFixed(1);$('guessValue').textContent=(+$('guess').value).toFixed(1);
}

function checkPrediction(){
  const x=+$('predictionX').value,guess=+$('guess').value,pred=state.model.intercept+state.model.slope*x,error=Math.abs(guess-pred),box=$('predictionFeedback');
  if(error<=1){box.className='feedback good';box.innerHTML=`Sehr gut! Deine Schätzung <strong>${guess.toFixed(1)}</strong> liegt sehr nah an <strong>${pred.toFixed(1)}</strong>.`;award('prediction')}
  else if(error<=3){box.className='feedback warn';box.innerHTML=`Fast! Das Modell sagt ungefähr <strong>${pred.toFixed(1)}</strong> voraus.`}
  else{box.className='feedback bad';box.innerHTML=`Noch nicht. Das Modell sagt ungefähr <strong>${pred.toFixed(1)}</strong> voraus. Achte auf Steigung und Achsenabschnitt.`}
}
function award(key){if(!state.answered.has(key)){state.answered.add(key);state.score+=10;$('score').textContent=state.score;updateQuizSummary()}}

const questions=[
  {key:'q1',q:'Was sagt eine lineare Regression typischerweise voraus?',options:['Eine Klasse','Einen kontinuierlichen Zahlenwert','Ein Bild'],correct:1,ok:'Genau. Beispiele sind Preis, Temperatur, Gewicht oder Verbrauch.'},
  {key:'q2',q:'Was bedeutet eine positive Steigung?',options:['Wenn x steigt, steigt y tendenziell','Wenn x steigt, fällt y immer','x und y haben keinen Zusammenhang'],correct:0,ok:'Richtig. Eine positive Steigung bedeutet einen positiven linearen Zusammenhang.'},
  {key:'q3',q:'Was passiert meistens, wenn das Rauschen stark zunimmt?',options:['Die Punkte liegen näher an der Geraden','Die Daten streuen stärker und das Modell passt oft schlechter','Die Steigung wird automatisch null'],correct:1,ok:'Richtig. Mehr Streuung erschwert eine präzise lineare Anpassung.'}
];
function buildQuiz(){
  const c=$('quizContainer');c.innerHTML='';questions.forEach((q,qi)=>{const card=document.createElement('div');card.className='quiz-card';card.innerHTML=`<h3>${qi+1}. ${q.q}</h3>`;q.options.forEach((opt,oi)=>{const label=document.createElement('label');label.className='option';label.innerHTML=`<input type="radio" name="${q.key}" value="${oi}"> ${opt}`;label.querySelector('input').addEventListener('change',()=>answerQuiz(q,oi,card));card.appendChild(label)});const fb=document.createElement('div');fb.className='feedback neutral';fb.textContent='Wähle eine Antwort.';fb.dataset.feedback='1';card.appendChild(fb);c.appendChild(card)});updateQuizSummary()}
function answerQuiz(q,oi,card){const fb=card.querySelector('[data-feedback]');if(oi===q.correct){fb.className='feedback good';fb.textContent=q.ok;award(q.key)}else{fb.className='feedback bad';fb.textContent='Noch nicht richtig. Probiere es erneut und nutze die Erklärung aus Schritt 1.'}}
function updateQuizSummary(){const q=$('quizSummary');if(state.score>=30){q.className='feedback good';q.textContent=`🏆 Stark! Du hast aktuell ${state.score} Punkte gesammelt.`}else{q.className='feedback neutral';q.textContent=`Aktueller Punktestand: ${state.score}. Ziel: mindestens 30 Punkte.`}}
function fillTable(){const body=$('dataRows');body.innerHTML='';state.data.forEach((d,i)=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${d.x.toFixed(2)}</td><td>${d.y.toFixed(2)}</td><td>${state.model.preds[i].toFixed(2)}</td><td>${state.model.residuals[i].toFixed(2)}</td>`;body.appendChild(tr)})}

['numPoints','slope','intercept','noise','seed'].forEach(id=>$(id).addEventListener('input',regenerate));
$('predictionX').addEventListener('input',()=>{syncGuessRange();drawAll()});$('guess').addEventListener('input',()=>{$('guessValue').textContent=(+$('guess').value).toFixed(1)});$('checkPrediction').addEventListener('click',checkPrediction);
$('resetScore').addEventListener('click',()=>{state.score=0;state.answered.clear();$('score').textContent='0';document.querySelectorAll('#quizContainer input').forEach(i=>i.checked=false);document.querySelectorAll('#quizContainer [data-feedback]').forEach(f=>{f.className='feedback neutral';f.textContent='Wähle eine Antwort.'});$('predictionFeedback').className='feedback neutral';$('predictionFeedback').textContent='Schätze zuerst einen Wert und prüfe anschließend.';updateQuizSummary()});
document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));btn.classList.add('active');$(btn.dataset.tab).classList.add('active')}));

buildQuiz();regenerate();