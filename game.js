const SAVE_KEY = "wayly_final_run_v1";

let gameState = { save: loadSave(), battle: null, pendingChoice: null };

function el(id){ return document.getElementById(id); }
function defaultSave(){ return { level:1, wins:0, losses:0, options:{music:60,sfx:70}, playerChoices:[], botChoices:[] }; }
function loadSave(){ try{ const raw=localStorage.getItem(SAVE_KEY); if(!raw) return defaultSave(); const parsed=JSON.parse(raw); return { ...defaultSave(), ...parsed, options:{...defaultSave().options, ...(parsed.options||{})} }; }catch(e){ return defaultSave(); } }
function saveSave(){ localStorage.setItem(SAVE_KEY, JSON.stringify(gameState.save)); renderMenuStats(); }
function showScreen(id){ document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active")); el(id).classList.add("active"); }
function clearDebug(){ const box=el("debugBox"); if(box){ box.style.display="none"; box.textContent=""; } }
function renderMenuStats(){ const unlocked = STARTER_CARDS.length + gameState.save.playerChoices.length; el("statUnlocked").textContent=unlocked; el("statDeckSize").textContent=buildDeckFromChoices(gameState.save.playerChoices).length; el("statMaxHand").textContent=MAX_HAND_SIZE; el("statLevel").textContent=gameState.save.level; el("statWins").textContent=gameState.save.wins; el("statLosses").textContent=gameState.save.losses; }

function openDeck(){
  const grid=el("deckGrid"); grid.innerHTML="";
  const unlocked=new Set([...STARTER_CARDS.map(c=>c.id), ...(gameState.save.playerChoices||[])]);
  el("deckCount").textContent=buildDeckFromChoices(gameState.save.playerChoices).length;
  el("deckLevel").textContent=gameState.save.level;
  ALL_CARDS.forEach(card=>{ const div=document.createElement("div"); div.className="deck-card"+(unlocked.has(card.id)?"":" locked"); div.innerHTML=`<strong>${card.name}</strong><div class="small">${card.desc}</div><div class="small" style="margin-top:6px;">Tipo: ${card.type}</div><div class="small">Raridade: ${card.rarity}</div><div class="small">Cópias no deck: ${card.copies}</div><div class="small">${unlocked.has(card.id)?"Liberada":"Bloqueada"}</div>`; grid.appendChild(div); });
  showScreen("deck");
}
function openOptions(){ el("musicRange").value=gameState.save.options.music; el("sfxRange").value=gameState.save.options.sfx; el("optionsModal").classList.add("show"); }
function closeOptions(){ el("optionsModal").classList.remove("show"); }
function saveOptions(){ gameState.save.options.music=Number(el("musicRange").value); gameState.save.options.sfx=Number(el("sfxRange").value); saveSave(); closeOptions(); alert("Opções salvas."); }
function goMenu(){ renderMenuStats(); showScreen("menu"); }
function exitGame(){ alert("Para sair, feche a aba do navegador."); }

function shuffle(arr){ const copy=arr.slice(); for(let i=copy.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [copy[i],copy[j]]=[copy[j],copy[i]]; } return copy; }
function createEntity(name,maxHp,deck){ return { name, maxHp, hp:maxHp, deck:shuffle(deck), hand:[], discard:[], effects:{block:0,blockAll:false,poison:0,regen:0,rebote:0,reboteOnce:0,buffatk:0,curse:0,stunTurns:0,comboNext:0}, lastOffense:null }; }
function addLog(text){ const log=el("battleLog"); const div=document.createElement("div"); div.textContent=text; log.appendChild(div); log.scrollTop=log.scrollHeight; }
function drawCard(entity,amount=1){ for(let i=0;i<amount;i++){ if(entity.deck.length===0){ if(entity.discard.length>0){ entity.deck=shuffle(entity.discard); entity.discard=[]; } else return; } const drawn=entity.deck.pop(); if(entity.hand.length>=MAX_HAND_SIZE){ entity.discard.push(drawn); addLog(entity.name+" comprou uma carta, mas a mão estava cheia."); continue; } entity.hand.push(drawn); } }

function renderEffectList(targetId, entity){
  const wrap=el(targetId); wrap.innerHTML="";
  const entries=[]; if(entity.effects.block>0) entries.push("Block "+entity.effects.block); if(entity.effects.blockAll) entries.push("Block Total"); if(entity.effects.poison>0) entries.push("Veneno "+entity.effects.poison); if(entity.effects.regen>0) entries.push("Imortal "+entity.effects.regen); if(entity.effects.rebote>0) entries.push("Rebote "+entity.effects.rebote); if(entity.effects.reboteOnce>0) entries.push("Rebote Master "+entity.effects.reboteOnce); if(entity.effects.buffatk>0) entries.push("Buff "+entity.effects.buffatk); if(entity.effects.curse>0) entries.push("Maldição "+entity.effects.curse); if(entity.effects.stunTurns>0) entries.push("Defesa "+entity.effects.stunTurns); if(entity.effects.comboNext>0) entries.push("Combo"); if(entries.length===0) entries.push("Sem efeitos");
  entries.forEach(t=>{ const chip=document.createElement("div"); chip.className="effect-chip"; chip.textContent=t; wrap.appendChild(chip); });
}
function renderHand(){
  const b=gameState.battle; const hand=el("hand"); hand.innerHTML=""; if(!b) return;
  const canPlay=b.turn==="player" && b.actionsLeft>0;
  if(b.player.hand.length===0){ hand.innerHTML="<div class='small'>Sem cartas na mão.</div>"; return; }
  b.player.hand.forEach((cardId,index)=>{ const card=getCard(cardId); if(!card) return; const cardEl=document.createElement("div"); cardEl.className="card"+(canPlay?"":" disabled"); cardEl.innerHTML=`<div class="card-type">${card.type}</div><div class="card-name">${card.name}</div><div class="card-desc">${card.desc}</div><div class="card-foot"><span>${card.rarity}</span><span>${card.copies}x</span></div>`; cardEl.onclick=function(){ if(!canPlay) return; playPlayerCard(index); }; hand.appendChild(cardEl); });
}
function renderBattle(){
  const b=gameState.battle; if(!b) return;
  el("turnText").textContent="Turno: "+(b.turn==="player"?"Player":b.enemy.name)+" • Ações: "+b.actionsLeft;
  el("playerHpText").textContent=b.player.hp; el("playerMaxHpText").textContent=b.player.maxHp; el("enemyHpText").textContent=b.enemy.hp; el("enemyMaxHpText").textContent=b.enemy.maxHp; el("enemyName").textContent=b.enemy.name;
  el("playerHpBar").style.width=((b.player.hp/b.player.maxHp)*100)+"%"; el("enemyHpBar").style.width=((b.enemy.hp/b.enemy.maxHp)*100)+"%";
  el("playerHandCount").textContent=b.player.hand.length; el("enemyHandCount").textContent=b.enemy.hand.length; el("playerDeckCount").textContent=b.player.deck.length; el("enemyDeckCount").textContent=b.enemy.deck.length;
  renderEffectList("playerEffects", b.player); renderEffectList("enemyEffects", b.enemy); renderHand();
}
function applyStartOfTurn(entity){
  if(entity.effects.poison>0){ entity.hp=Math.max(0, entity.hp-entity.effects.poison); addLog(entity.name+" sofreu "+entity.effects.poison+" de dano de veneno."); }
  if(entity.effects.regen>0){ entity.hp=Math.min(entity.maxHp, entity.hp+entity.effects.regen); addLog(entity.name+" recuperou "+entity.effects.regen+" HP de Imortal."); }
}
function consumeDefense(target, rawDamage){
  if(target.effects.blockAll){ addLog(target.name+" bloqueou todo o dano."); target.effects.blockAll=false; return 0; }
  if(target.effects.block>0){ const absorbed=Math.min(target.effects.block, rawDamage); target.effects.block-=absorbed; addLog(target.name+" bloqueou "+absorbed+" de dano."); return rawDamage-absorbed; }
  return rawDamage;
}
function strongerEffect(current,incoming){ return incoming>current; }
function recordOffense(target, offense){ target.lastOffense = offense; }
function effectiveAttackMod(source){ return Math.max(0,(source.effects.buffatk||0)-(source.effects.curse||0)); }
function removeNamedEffect(entity, key){ if(key==="regen") entity.effects.regen=0; if(key==="rebote") {entity.effects.rebote=0; entity.effects.reboteOnce=0;} if(key==="buffatk") entity.effects.buffatk=0; if(key==="curse") entity.effects.curse=0; if(key==="poison") entity.effects.poison=0; }

function applyRebote(attacker, defender){
  if(defender.effects.rebote>0){ attacker.hp=Math.max(0, attacker.hp-defender.effects.rebote); addLog(defender.name+" devolveu "+defender.effects.rebote+" de dano."); }
  if(defender.effects.reboteOnce>0){ attacker.hp=Math.max(0, attacker.hp-defender.effects.reboteOnce); addLog(defender.name+" ativou Rebote Master e devolveu "+defender.effects.reboteOnce+" de dano."); defender.effects.reboteOnce=0; }
}
function discardEnemyCards(entity, amount){
  for(let i=0;i<amount;i++){ if(entity.hand.length===0) return; const idx=Math.floor(Math.random()*entity.hand.length); const removed=entity.hand.splice(idx,1)[0]; entity.discard.push(removed); }
  addLog(entity.name+" descartou "+amount+" carta(s).");
}
function chaosEnemyCards(entity, amount){ discardEnemyCards(entity, amount); drawCard(entity, amount); addLog(entity.name+" recebeu novas cartas aleatórias."); }
function tradeRandomCard(source,target){
  if(target.hand.length===0 || source.hand.length===0){ addLog("Troca falhou."); return; }
  const enemyIndex=Math.floor(Math.random()*target.hand.length); const ownIndex=Math.floor(Math.random()*source.hand.length);
  const enemyCard=target.hand.splice(enemyIndex,1)[0]; const ownCard=source.hand.splice(ownIndex,1)[0]; source.hand.push(enemyCard); target.hand.push(ownCard); addLog(source.name+" trocou uma carta com o inimigo.");
}

function applySingleEffect(effect, source, target){
  const atkMod = effectiveAttackMod(source);
  if(effect.kind==="damage"){ let dmg=effect.value+atkMod; dmg=consumeDefense(target,dmg); target.hp=Math.max(0,target.hp-dmg); recordOffense(target,{kind:"damage",value:effect.value}); addLog(source.name+" causou "+dmg+" de dano."); applyRebote(source,target); return; }
  if(effect.kind==="heal"){ source.hp=Math.min(source.maxHp, source.hp+effect.value); addLog(source.name+" recuperou "+effect.value+" HP."); return; }
  if(effect.kind==="block"){ if(effect.value>source.effects.block) source.effects.block=effect.value; addLog(source.name+" ganhou bloqueio "+source.effects.block+"."); return; }
  if(effect.kind==="blockall"){ source.effects.blockAll=true; addLog(source.name+" ativou Block Total."); return; }
  if(effect.kind==="poison"){ if(strongerEffect(target.effects.poison,effect.value)){ target.effects.poison=effect.value; addLog(target.name+" recebeu Veneno "+effect.value+"."); } else addLog("Veneno mais fraco ignorado."); recordOffense(target,{kind:"poison",value:effect.value}); return; }
  if(effect.kind==="lifesteal"){ let dmg=effect.damage+atkMod; dmg=consumeDefense(target,dmg); target.hp=Math.max(0,target.hp-dmg); source.hp=Math.min(source.maxHp, source.hp+effect.heal); recordOffense(target,{kind:"lifesteal",damage:effect.damage}); addLog(source.name+" causou "+dmg+" e recuperou "+effect.heal+" HP."); applyRebote(source,target); return; }
  if(effect.kind==="buffatk"){ if(strongerEffect(source.effects.buffatk,effect.value)){ source.effects.buffatk=effect.value; addLog(source.name+" recebeu Buff ATK "+effect.value+"."); } else addLog("Buff mais fraco ignorado."); return; }
  if(effect.kind==="curse"){ if(strongerEffect(target.effects.curse,effect.value)){ target.effects.curse=effect.value; addLog(target.name+" recebeu Maldição "+effect.value+"."); } else addLog("Maldição mais fraca ignorada."); recordOffense(target,{kind:"curse",value:effect.value}); return; }
  if(effect.kind==="regen"){ if(strongerEffect(source.effects.regen,effect.value)){ source.effects.regen=effect.value; addLog(source.name+" recebeu Imortal "+effect.value+"."); } else addLog("Imortal mais fraco ignorado."); return; }
  if(effect.kind==="rebote"){ if(strongerEffect(source.effects.rebote,effect.value)){ source.effects.rebote=effect.value; addLog(source.name+" recebeu Rebote "+effect.value+"."); } else addLog("Rebote mais fraco ignorado."); return; }
  if(effect.kind==="reboteonce"){ source.effects.reboteOnce=Math.max(source.effects.reboteOnce, effect.value); addLog(source.name+" recebeu Rebote Master."); return; }
  if(effect.kind==="cleanse"){ removeNamedEffect(source,effect.targetEffect); addLog(source.name+" removeu o efeito "+effect.targetEffect+"."); return; }
  if(effect.kind==="removeEnemyEffect"){ removeNamedEffect(target,effect.targetEffect); addLog(source.name+" removeu o efeito "+effect.targetEffect+" do inimigo."); return; }
  if(effect.kind==="stunTurns"){ target.effects.stunTurns=Math.max(target.effects.stunTurns,effect.value); addLog(target.name+" ficará sem agir por "+effect.value+" turno(s)."); return; }
  if(effect.kind==="discardEnemy"){ discardEnemyCards(target,effect.value); return; }
  if(effect.kind==="chaosEnemy"){ chaosEnemyCards(target,effect.value); return; }
  if(effect.kind==="swapHands"){ const temp=source.hand; source.hand=target.hand; target.hand=temp; addLog("As mãos foram trocadas."); return; }
  if(effect.kind==="troco"){ if(source.lastOffense){ addLog(source.name+" ativou Troco."); if(source.lastOffense.kind==="damage") applySingleEffect({kind:"damage",value:source.lastOffense.value},source,target); else if(source.lastOffense.kind==="poison") applySingleEffect({kind:"poison",value:source.lastOffense.value},source,target); else if(source.lastOffense.kind==="lifesteal") applySingleEffect({kind:"damage",value:source.lastOffense.damage},source,target); else if(source.lastOffense.kind==="curse") applySingleEffect({kind:"curse",value:source.lastOffense.value},source,target);} else addLog("Troco não tinha ataque anterior para devolver."); return; }
  if(effect.kind==="tradeCard"){ tradeRandomCard(source,target); return; }
  if(effect.kind==="selfdamage"){ source.hp=Math.max(0,source.hp-effect.value); addLog(source.name+" sacrificou "+effect.value+" HP."); return; }
  if(effect.kind==="metamorph"){ const copyId=source.hand.find(id=>getCard(id)); if(copyId){ const copyCard=getCard(copyId); addLog(source.name+" copiou o efeito de "+copyCard.name+"."); copyCard.effects.forEach(e=>applySingleEffect(e,source,target)); } else addLog("Metamorfosis falhou."); return; }
  if(effect.kind==="combo"){ source.effects.comboNext=3; addLog(source.name+" preparou Combo para o próximo turno."); return; }
}
function applyCard(card, source, target){ addLog(source.name+" usou "+card.name+"."); card.effects.forEach(effect=>applySingleEffect(effect,source,target)); }

function startBattle(){
  const level=gameState.save.level; const hp=getHpForLevel(level); const playerDeck=buildDeckFromChoices(gameState.save.playerChoices); const enemyDeck=buildDeckFromChoices(gameState.save.botChoices);
  gameState.battle={ level, turn:"player", locked:false, actionsLeft:1, player:createEntity("Player",hp,playerDeck), enemy:createEntity(getEnemyNameForLevel(level),hp,enemyDeck) };
  drawCard(gameState.battle.player,5); drawCard(gameState.battle.enemy,5);
  el("battleLog").innerHTML=""; addLog("Batalha iniciada."); addLog("Ambos começam com "+hp+" HP."); addLog("Regra: 1 carta por turno, mão máxima 5."); renderBattle(); showScreen("battle");
}
function endTurnToEnemy(){ const b=gameState.battle; if(checkBattleEnd()) return; b.turn="enemy"; b.actionsLeft=1; renderBattle(); setTimeout(runEnemyTurn,650); }
function beginPlayerTurn(){ const b=gameState.battle; applyStartOfTurn(b.player); if(checkBattleEnd()) return; if(b.player.effects.stunTurns>0){ b.player.effects.stunTurns-=1; addLog("Player perdeu o turno por Defesa."); drawCard(b.player,1); drawCard(b.enemy,1); endTurnToEnemy(); return; } b.turn="player"; b.actionsLeft=b.player.effects.comboNext>0?3:1; b.player.effects.comboNext=0; addLog("Seu turno."); renderBattle(); }
function playPlayerCard(handIndex){ const b=gameState.battle; if(!b || b.turn!=="player" || b.actionsLeft<=0) return; const cardId=b.player.hand[handIndex]; const card=getCard(cardId); if(!card) return; b.player.hand.splice(handIndex,1); b.player.discard.push(cardId); applyCard(card,b.player,b.enemy); b.actionsLeft-=1; if(checkBattleEnd()) return; if(b.actionsLeft>0){ renderBattle(); return; } drawCard(b.player,1); drawCard(b.enemy,1); endTurnToEnemy(); }

function scoreCardForBot(card, bot, player){
  let score=0;
  card.effects.forEach(e=>{ if(e.kind==="damage") score+=e.value; if(e.kind==="heal") score+=(bot.hp<bot.maxHp?e.value:1); if(e.kind==="block") score+=e.value/2; if(e.kind==="lifesteal") score+=e.damage+e.heal; if(e.kind==="poison") score+=e.value*2; if(e.kind==="buffatk") score+=e.value*2; if(e.kind==="curse") score+=e.value*2; if(e.kind==="regen") score+=e.value*2; if(e.kind==="rebote") score+=e.value*2; if(e.kind==="stunTurns") score+=7; if(e.kind==="discardEnemy") score+=4*e.value; if(e.kind==="chaosEnemy") score+=4*e.value; if(e.kind==="combo") score+=9; if(e.kind==="selfdamage") score-=e.value;});
  return score;
}
function runEnemyTurn(){
  const b=gameState.battle; if(!b) return;
  applyStartOfTurn(b.enemy); if(checkBattleEnd()) return;
  if(b.enemy.effects.stunTurns>0){ b.enemy.effects.stunTurns-=1; addLog(b.enemy.name+" perdeu o turno por Defesa."); drawCard(b.player,1); drawCard(b.enemy,1); beginPlayerTurn(); return; }
  let actions=b.enemy.effects.comboNext>0?3:1; b.enemy.effects.comboNext=0; addLog("Turno do "+b.enemy.name+".");
  while(actions>0 && b.enemy.hand.length>0){
    let bestIndex=0,bestScore=-999;
    b.enemy.hand.forEach((id,idx)=>{ const c=getCard(id); if(!c) return; const s=scoreCardForBot(c,b.enemy,b.player); if(s>bestScore){bestScore=s;bestIndex=idx;} });
    const cardId=b.enemy.hand.splice(bestIndex,1)[0]; const card=getCard(cardId); b.enemy.discard.push(cardId); applyCard(card,b.enemy,b.player);
    if(checkBattleEnd()) return;
    actions-=1;
  }
  drawCard(b.player,1); drawCard(b.enemy,1); beginPlayerTurn();
}

function renderChoice(){
  const grid=el("choiceGrid"); grid.innerHTML=""; el("choiceLevel").textContent=gameState.save.level;
  gameState.pendingChoice.forEach((card,index)=>{ const div=document.createElement("div"); div.className="deck-card choice-card"; div.innerHTML=`<strong>${card.name}</strong><div class="small">${card.desc}</div><div class="small" style="margin-top:6px;">Tipo: ${card.type}</div><div class="small">Raridade: ${card.rarity}</div><button class="btn-main" onclick="chooseLevelCard(${index})">Escolher</button>`; grid.appendChild(div); });
  showScreen("choice");
}
function chooseLevelCard(index){
  const chosen=gameState.pendingChoice[index]; const other=gameState.pendingChoice[index===0?1:0]; if(!chosen||!other) return;
  gameState.save.playerChoices.push(chosen.id); gameState.save.botChoices.push(other.id); saveSave();
  el("resultTitle").textContent="Nova carta";
  el("resultText").textContent="Você escolheu "+chosen.name+". O bot recebeu "+other.name+".";
  el("resultStats").innerHTML=`<div class="row"><span>Sua nova carta</span><strong>${chosen.name}</strong></div><div class="row"><span>Carta do bot</span><strong>${other.name}</strong></div><button class="btn-main" onclick="startBattle()">Próximo nível</button>`;
  showScreen("result");
}

function finishBattle(win){
  const previousLevel=gameState.save.level;
  if(win){ gameState.save.wins+=1; if(gameState.save.level<MAX_LEVEL) gameState.save.level+=1; } else gameState.save.losses+=1;
  saveSave();
  el("resultTitle").textContent=win?"Vitória":"Derrota";
  el("resultText").textContent=win?(gameState.save.level>previousLevel?"Você venceu e subiu de nível.":"Você venceu no nível máximo."):"Você perdeu. Ajuste sua estratégia e tente novamente.";
  el("resultStats").innerHTML=`<div class="row"><span>Nível atual</span><strong>${gameState.save.level}</strong></div><div class="row"><span>Cartas desbloqueadas</span><strong>${STARTER_CARDS.length + gameState.save.playerChoices.length}</strong></div><div class="row"><span>Cartas ativas no deck</span><strong>${buildDeckFromChoices(gameState.save.playerChoices).length}</strong></div><div class="row"><span>HP base atual</span><strong>${getHpForLevel(gameState.save.level)}</strong></div><div class="row"><span>Vitórias / Derrotas</span><strong>${gameState.save.wins} / ${gameState.save.losses}</strong></div>`;
  showScreen("result");
  if(win && gameState.save.level<=MAX_LEVEL && gameState.save.level>previousLevel){
    const taken=[...gameState.save.playerChoices,...gameState.save.botChoices];
    const pair=getChoicePair(gameState.save.level,taken);
    if(pair.length===2){ gameState.pendingChoice=pair; setTimeout(renderChoice,500); }
    else el("resultStats").innerHTML += '<button class="btn-main" onclick="startBattle()">Próximo nível</button>';
  }
}
function checkBattleEnd(){ const b=gameState.battle; if(!b) return false; if(b.enemy.hp<=0){ finishBattle(true); return true; } if(b.player.hp<=0){ finishBattle(false); return true; } return false; }
function concedeBattle(){ if(!gameState.battle) return; gameState.battle.player.hp=0; checkBattleEnd(); }
function resetSave(){ const ok=confirm("Apagar todo o save?"); if(!ok) return; gameState.save=defaultSave(); saveSave(); closeOptions(); goMenu(); alert("Save resetado."); }

window.startBattle=startBattle; window.openDeck=openDeck; window.openOptions=openOptions; window.closeOptions=closeOptions; window.saveOptions=saveOptions; window.exitGame=exitGame; window.goMenu=goMenu; window.concedeBattle=concedeBattle; window.resetSave=resetSave; window.chooseLevelCard=chooseLevelCard;
clearDebug(); renderMenuStats();
