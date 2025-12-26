// 全視窗畫布：背景 #606C38，支援多組動畫集（e5pig, c3, d4, b2）
// - e5pig: 原本的 idle 動畫（10 張，866x31）
// - c3: 跳躍動畫（15 張，970x55），由按上鍵啟動
// - d4: 左右移動動畫（7 張，408x34），由按左/右鍵啟動
// - b2: 下鍵動畫（11 張，666x51）

const ANIM_FPS = 12; // 動畫每秒幀數
let frameInterval = 1000 / ANIM_FPS;
let lastFrameTime = 0;

// 依資料夾預先定義每組的影格（明確列出檔名以避免 404）
const ANIM_SETS = {
  '123c': {
    path: '123c',
    files: ['0.png','1.png','2.png','3.png','4.png','5.png','6.png','7.png','8.png','9.png']
  },
  e5: { 
    path: 'e5pig', 
    files: ['0.png','1.png','2.png','3.png','4.png','7.png','8.png','9.png','10.png','11.png']
  },
  c3: { 
    path: 'c3', 
    files: ['0.png','1.png','2.png','3.png','4.png','5.png','6.png','7.png','8.png','9.png','10.png','11.png','12.png','13.png','14.png']
  },
  d4: { 
    path: 'd4', 
    files: ['0.png','1.png','2.png','3.png','4.png','5.png','6.png']
  },
  b2: { 
    path: 'b2', 
    files: ['0.png','1.png','2.png','3.png','4.png','5.png','6.png','7.png','8.png','9.png','10.png']
  }
  ,
  '122b': {
    path: '122b',
    files: ['0.png','1.png','2.png','3.png','4.png','5.png','6.png','7.png','8.png','9.png','10.png','11.png','12.png','13.png']
  },
  '121a': {
    path: '121a',
    files: ['0.png','1.png','2.png','3.png','4.png','5.png','6.png','7.png','8.png']
  },
  'b12': {
    path: 'b12',
    files: Array.from({length: 15}, (_, i) => 'b12' + String(i + 1).padStart(4, '0') + '.png')
  },
  'st': {
    path: 'st',
    files: Array.from({length: 12}, (_, i) => 'st' + String(i + 1).padStart(4, '0') + '.png')
  },
  'kk': {
    path: 'kk',
    files: ['kk0001.png', 'kk0002.png', 'kk0003.png', 'kk0004.png']
  }
};

// 載入後的影格陣列集合
let assets = {
  e5: [],
  c3: [],
  d4: [],
  b2: [],
  '123c': [],
  'b12': [],
  'st': [],
  'kk': []
};

// 各動畫當前的幀索引（保留各自進度）
let frameIndices = {
  e5: 0,
  c3: 0,
  d4: 0,
  b2: 0,
  '123c': 0,
  'b12': 0,
  'st': 0,
  'kk': 0
};

// 新增 NPC 動畫 (122b 與 121a)
assets['122b'] = [];
assets['121a'] = [];
frameIndices['122b'] = 0;
frameIndices['121a'] = 0;
frameIndices['b12'] = 0;
frameIndices['st'] = 0;
frameIndices['kk'] = 0;

// NPC 物件
let npc = {
  x: 0,
  y: 0,
  anim: '122b', // 預設播放 122b
  idle: '122b',
  contact: '121a'
};

// b12 NPC 物件 (Scene 2)
let npcB12 = {
  x: 0,
  y: 0,
  vx: 1,
  anim: 'b12',
  moveTimer: 0
};

// kk NPC 物件 (Scene 2)
let npcKK = {
  x: 0,
  y: 0,
  anim: 'kk'
};

// 地面位置（會在 setup 或 windowResized 設定）
let groundY = 0;

// NPC 動畫定時器（獨立於玩家）
let npcLastFrameTime = 0;
const NPC_FPS = 12;
const npcFrameInterval = 1000 / NPC_FPS;

// kk 專用的動畫計時（較慢）
let kkLastFrameTime = 0;
const KK_FPS = 4; // 每秒 4 張
const kkFrameInterval = 1000 / KK_FPS;

let talkingNPC = null; // 追蹤當前正在對話的 NPC

// 對話系統狀態
let dialogActive = false; // 是否正在對話流程中
let npcTyping = false; // NPC (122b) 正在逐字打字
let npcMessage = '找我有什麼事嗎？';
let npcTypedIndex = 0;
const TYPING_SPEED = 40; // 毫秒/字
let lastTypedTime = 0;

// 玩家輸入欄位（p5 DOM）
let playerInput = null;
let sendButton = null;
let playerMessage = '';
let showPlayerBubble = false;

// 改為使用 canvas 輸入（避免 DOM 顯示）
let canvasInputText = '';
let canvasInputActive = false; // 當 NPC 打字完畢，啟動 canvas 輸入


// NPC 回覆（模擬 AI 回覆）
let aiReply = '';
let aiReplyIndex = 0;
let npcReplying = false;

// 對話泡泡設定
const BUBBLE_MAX_W = 320;
const BUBBLE_PADDING = 10;

// 角色位置與移動（初始置中）
let px, py; // 中心座標
let vy = 0; // 垂直速度
let gravity = 0.6;
let jumpSpeed = -12;
let speed = 4; // 水平移動速度

// 朝向（1 = 面向右, -1 = 面向左）
let facing = 1;

// 追蹤上一次按的左/右方向（0 = 沒按, 1 = 右, -1 = 左）
let lastHorizontalDir = 0;
// 追蹤是否正在播放 d4 轉身動畫
let playingTurnAnim = false;

let bgImage; // 用於存放背景圖片
let bgImage1; // 第一張背景 (back.png)
let bgImage2; // 第二張背景
let transitionMode = 0; // 0:無, 1:覆蓋(Out), 2:揭示(In)
let transitionProg = 0;

// --- 測驗遊戲變數 ---
let quizTable; // 存放從 CSV 載入的表格
let quizQuestions = []; // 處理過的題目陣列
let currentQuestion = null; // 當前正在問的題目物件
let quizState = 'IDLE'; // 測驗狀態: IDLE, ASKING, SHOWING_FEEDBACK

// --- 新增特效變數 ---
let celebrationActive = false;
let celebrationParticles = [];
let gameOverActive = false;
let restartButton = null;

// b12 的英文單字題庫
const b12Questions = [
  { question: '蘋果的英文是？', answer: 'apple', correct_feedback: '太棒了！你真聰明！', wrong_feedback: '不對喔，是 apple。' },
  { question: '狗的英文是？', answer: 'dog', correct_feedback: '答對了！好厲害！', wrong_feedback: '錯了，是 dog。' },
  { question: '貓的英文是？', answer: 'cat', correct_feedback: '沒錯！你真棒！', wrong_feedback: '不對，是 cat。' },
  { question: '書的英文是？', answer: 'book', correct_feedback: 'Excellent!', wrong_feedback: '是 book 啦。' },
  { question: '筆的英文是？', answer: 'pen', correct_feedback: 'Correct!', wrong_feedback: '是 pen。' },
  { question: '學校的英文是？', answer: 'school', correct_feedback: '你答對了！', wrong_feedback: '是 school。' },
  { question: '老師的英文是？', answer: 'teacher', correct_feedback: '好樣的！', wrong_feedback: '是 teacher。' },
  { question: '學生的英文是？', answer: 'student', correct_feedback: '沒錯！', wrong_feedback: '是 student。' },
  { question: '水的英文是？', answer: 'water', correct_feedback: '答對了！', wrong_feedback: '是 water。' },
  { question: '快樂的英文是？', answer: 'happy', correct_feedback: '太強了！', wrong_feedback: '是 happy。' }
];

// kk 的生活小知識題庫
const kkQuestions = [
  { question: '衣服沾到醬油可以用什麼清洗？', answer: 'suger', correct_feedback: '你好厲害！懂生活！', wrong_feedback: '試試看白糖喔！' },
  { question: '切洋蔥怎麼才不會流淚？', answer: 'ice', correct_feedback: '沒錯！冰過就不會辣眼睛了！', wrong_feedback: '可以先冰鎮一下喔。' },
  { question: '被蚊子叮可以用什麼止癢？', answer: 'soap water', correct_feedback: '答對了！鹼性中和酸性！', wrong_feedback: '肥皂水很有用喔。' },
  { question: '預防感冒要多喝什麼？', answer: 'water', correct_feedback: '沒錯！多喝水沒事！', wrong_feedback: '多喝水啦。' },
  { question: '牙刷建議多久換一次？', answer: 'three months', correct_feedback: '正確！衛生很重要！', wrong_feedback: '大約 3 個月喔。' },
  { question: '手機螢幕髒了可以用什麼擦？', answer: 'alcohol', correct_feedback: '對的！消毒又乾淨！', wrong_feedback: '酒精棉片很方便。' },
  { question: '什麼水果維生素C含量很高？', answer: 'guava', correct_feedback: '太強了！芭樂是C王！', wrong_feedback: '是芭樂喔！' },
  { question: '睡前做什麼有助於睡眠？', answer: 'foot bath', correct_feedback: '很懂養生喔！', wrong_feedback: '泡腳或是喝熱牛奶。' },
  { question: '鞋子臭臭的可以放什麼？', answer: 'tea bag', correct_feedback: '沒錯！乾燥又除臭！', wrong_feedback: '乾燥的茶包或咖啡渣。' },
  { question: '保溫瓶有異味可以用什麼洗？', answer: 'baking soda', correct_feedback: '答對了！去污除臭！', wrong_feedback: '小蘇打粉很好用。' }
];

function preload() {
  // 載入背景圖片
  bgImage1 = loadImage('back.png');
  bgImage = bgImage1;
  bgImage2 = loadImage('back2.png', null, () => {
    console.error("錯誤：找不到 back2.png。請確認該檔案是否位於專案資料夾 (251201) 內。");
  });
  // 依明確列表載入每組影格
  for (const key in ANIM_SETS) {
    const set = ANIM_SETS[key];
    for (let i = 0; i < set.files.length; i++) {
      const imgPath = set.path + '/' + set.files[i];
      assets[key].push(loadImage(imgPath, null, () => {
        console.error(`錯誤：找不到圖片 ${imgPath}。請確認資料夾 ${set.path} 是否存在且包含該檔案。`);
      }));
    }
  }

  // 載入新的測驗 CSV 檔案
  quizTable = loadTable('quiz.csv', 'csv', 'header');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
  noSmooth();
  frameRate(60);

  // 地面與角色起始位置
  groundY = height / 2;
  // 角色起始在畫面正中央（垂直以地面為基準）
  px = width / 2;
  py = groundY;

  // NPC 初始位置（右側三分之一處）
  npc.x = width * 0.75;
  npc.y = groundY;
  // 123c 位置設為與 122b 相對（左側）
  window.c123c_x = width * 0.25;
  window.c123c_y = py; // 與 e5pig 同平面
  
  // b12 初始位置
  npcB12.x = width * 0.5;
  npcB12.y = groundY;
  
  // kk 初始位置 (左邊)
  npcKK.x = width * 0.15;
  npcKK.y = groundY;

  // 將載入的 CSV 表格轉換為物件陣列
  for (const row of quizTable.getRows()) {
    quizQuestions.push(row.obj);
  }

  // 建立玩家輸入欄位與送出按鈕（預設隱藏）
  playerInput = createInput('');
  playerInput.size(BUBBLE_MAX_W - BUBBLE_PADDING*2, 26);
  // 不要顯示灰色 placeholder（依使用者要求）
  playerInput.attribute('placeholder', '');
  // 隱藏 DOM input，我們改用 canvas 輸入
  playerInput.hide();
  // 讓 input 看起來像在泡泡中：透明背景、無邊框
  playerInput.style('background', 'transparent');
  playerInput.style('border', 'none');
  playerInput.style('outline', 'none');
  playerInput.style('font-size', '16px');
  playerInput.style('padding', '4px');
  playerInput.style('color', '#000');

  sendButton = createButton('送出');
  sendButton.mousePressed(onSend);
  sendButton.hide();
  sendButton.style('font-size', '14px');

  // 建立重新開始按鈕
  restartButton = createButton('RESTART');
  restartButton.mousePressed(resetGame);
  restartButton.hide();
  restartButton.style('font-size', '24px');
  restartButton.style('font-family', 'monospace');
  restartButton.style('padding', '10px 20px');
  restartButton.style('background', '#000');
  restartButton.style('color', '#fff');
  restartButton.style('border', '2px solid #fff');
  restartButton.position(width / 2 - 60, height / 2 + 60);

  // 我們改為使用 canvas 鍵盤事件處理，不綁定 DOM 事件
}

function draw() {
  if (bgImage) {
    // 繪製背景圖片並使其填滿整個畫布
    image(bgImage, width / 2, height / 2, width, height);
  } else {
    background('#606C38'); // 如果圖片載入失敗，顯示備用顏色
  }

  if (bgImage === bgImage1) {

  // 123c 角色顯示：預設循環 0~6.png，e5pig 靠近時循環 7~9.png（單一動畫，與 122b 一樣模式）
  let c123x = window.c123c_x || width * 0.25;
  let c123y = py;
  let distToE5 = abs(px - c123x);
  let maxDist = width * 0.4;
  let frame = 0;
  let showBubble = false;
  let showFar = false;
  let showNear = false;
  // 判斷 e5pig 是否碰到 123c（以影像寬高簡單包圍盒）
  let pImgE5 = assets['e5'][frameIndices['e5']];
  let cImg = assets['123c'][frame];
  let overlap123c = false;
  if (pImgE5 && cImg) {
    let pw = pImgE5.width, ph = pImgE5.height;
    let cw = cImg.width, ch = cImg.height;
    overlap123c = (Math.abs(px - c123x) * 2 < (pw + cw)) && (Math.abs(py - c123y) * 2 < (ph + ch));
  }
  if (distToE5 < maxDist) {
    // 靠近時循環 0~6.png
    frame = Math.floor((millis()/200)%7);
    showNear = true;
  } else {
    // 沒靠近時循環 0~2.png
    frame = Math.floor((millis()/200)%3);
    showFar = true;
  }
  // 顯示 0~6.png
  let img123c = assets['123c'][frame];
  if (img123c) {
    push();
    translate(c123x, c123y);
    scale(-2, 2); // 放大兩倍並水平翻轉
    image(img123c, 0, -img123c.height/2);
    pop();
  }
  // 7~9.png 平移到右側視窗外
  // 7~9.png 平移動畫狀態
  if (!window.c123c_anim) window.c123c_anim = {t: 0, lastNear: false, attack: false, attackT: 0};
  let anim = window.c123c_anim;
  let frame6Visible = (Math.floor((millis()/200)%7) === 6);
  // 攻擊觸發：e5pig 碰到 123c 時
  if (overlap123c && !anim.attack) {
    anim.attack = true;
    anim.attackT = 0;
  }
  if (!overlap123c) {
    anim.attack = false;
    anim.attackT = 0;
  }
  // 攻擊動畫（7~9.png 連續快速播放一次）
  if (anim.attack) {
    anim.attackT += deltaTime/600; // 更快
    let baseX = c123x;
    let endX = width + 100;
    for (let i = 7; i <= 9; i++) {
      let img = assets['123c'][i];
      if (img) {
        let tx = lerp(baseX, endX, anim.attackT + (i-7)*0.15);
        push();
        translate(tx, c123y); // 攻擊動畫
        scale(-2, 2); // 同樣放大兩倍並翻轉
        image(img, 0, -img.height/2);
        pop();
      }
    }
    showBubble = true; // 只有碰撞時顯示泡泡
  }
  // 泡泡只在 9.png 完全移出時出現，且固定在 123c 原始座標
  if (showBubble && overlap123c) {
    const lines = wrapTextToLines('不要靠近我', BUBBLE_MAX_W, 16);
    let imgH = (assets['123c'][9]) ? assets['123c'][9].height : 40;
    drawSpeechBubble(c123x, c123y - imgH/2 - 30, lines);
  }
  
  } // end if bgImage === bgImage1 (123c)

  // 判斷按鍵（支援同時按）
  const up = keyIsDown(UP_ARROW);
  const down = keyIsDown(DOWN_ARROW);
  const left = keyIsDown(LEFT_ARROW);
  const right = keyIsDown(RIGHT_ARROW);
  const run = keyIsDown(SHIFT);

  // 決定當前水平方向
  let currentHorizontalDir = 0;
  if (left) currentHorizontalDir = -1;
  else if (right) currentHorizontalDir = 1;

  // 檢查是否發生方向改變（例如從按右變成按左，或從按右變成放開）
  // 只有當：(1) 之前有按左/右，(2) 現在改變了，或 (3) 現在改變方向時
  if (currentHorizontalDir !== 0 && currentHorizontalDir !== lastHorizontalDir && lastHorizontalDir !== 0) {
    // 方向改變了（例如從 1 變成 -1，或從 -1 變成 1），播放一次 d4
    playingTurnAnim = true;
    frameIndices['d4'] = 0; // 重置 d4 的幀索引
  }

  // 如果 d4 轉身動畫播放完一遍，就回到 e5
  if (playingTurnAnim && frameIndices['d4'] === 0 && lastFrameTime > 0) {
    // 動畫結束判定：當幀推進回到 0 時
    // （需要額外邏輯來判定「剛好轉過一圈」）
  }

  // 簡化邏輯：如果正在轉身且轉身動畫已播放至最後一幀，標記完成
  // 這邊我們用一個計數器來追蹤 d4 播放的次數
  
  // 決定當前動畫集（優先順序：Up > Down > 轉身中(d4) > idle(e5)）
  let active = 'e5';
  if (up) {
    active = 'c3';
    playingTurnAnim = false;
  }
  else if (down) {
    active = 'b2';
    playingTurnAnim = false;
  }
  else if (playingTurnAnim) {
    active = 'd4';
  }
  else if (left || right) {
    // 持續按左/右但沒有轉身，就用 e5
    active = 'e5';
  }

  // 更新上一次的方向
  lastHorizontalDir = currentHorizontalDir;

  // 計算當前速度（按住 Shift 加速）
  let currentSpeed = run ? speed * 2.5 : speed;

  // 水平移動（可與其他鍵並行）
  if (left) {
    px -= currentSpeed;
    facing = -1;
  }
  if (right) {
    px += currentSpeed;
    facing = 1;
  }

  // 簡單跳躍：當按上鍵時啟動向上速度（只有在地面時才可再次跳）
  // 使用全域 groundY
  // 如果按上就嘗試跳（但避免一直套用初速度）
  if (up && abs(py - groundY) < 0.5 && vy === 0) {
    vy = jumpSpeed;
  }

  // 應用重力與位置更新
  vy += gravity;
  py += vy;

  // 碰地處理
  if (py > groundY) {
    py = groundY;
    vy = 0;
  }

  // 時間驅動的幀更新（每組保有自己的幀索引）
  if (millis() - lastFrameTime >= frameInterval) {
    lastFrameTime = millis();
    // 進到下一幀
    frameIndices[active] = (frameIndices[active] + 1) % assets[active].length;
    
    // 如果 d4 動畫播放完整一圈，結束轉身狀態
    if (playingTurnAnim && active === 'd4' && frameIndices[active] === 0) {
      playingTurnAnim = false;
    }
  }

  // NPC 動畫獨立更新（讓 NPC 的兩組動畫都能持續循環）
  if (millis() - npcLastFrameTime >= npcFrameInterval) {
    npcLastFrameTime = millis();
    if (assets['122b'] && assets['122b'].length > 0) {
      frameIndices['122b'] = (frameIndices['122b'] + 1) % assets['122b'].length;
    }
    if (assets['121a'] && assets['121a'].length > 0) {
      frameIndices['121a'] = (frameIndices['121a'] + 1) % assets['121a'].length;
    }
    if (assets['b12'] && assets['b12'].length > 0) {
      frameIndices['b12'] = (frameIndices['b12'] + 1) % assets['b12'].length;
    }
    if (assets['st'] && assets['st'].length > 0) {
      frameIndices['st'] = (frameIndices['st'] + 1) % assets['st'].length;
    }
  }

  // kk 動畫獨立更新（較慢）
  if (millis() - kkLastFrameTime >= kkFrameInterval) {
    kkLastFrameTime = millis();
    if (assets['kk'] && assets['kk'].length > 0) {
      frameIndices['kk'] = (frameIndices['kk'] + 1) % assets['kk'].length;
    }
  }

  if (bgImage === bgImage1) {
  // 碰撞偵測（矩形包圍盒，基於當前顯示的影像尺寸）
  // 取得玩家顯示影格（可能為 e5/c3/d4/b2）
  const pImg = assets[active] && assets[active][frameIndices[active]];
  const npcImg = assets[npc.anim] && assets[npc.anim][frameIndices[npc.anim]];
  if (pImg && npcImg) {
    const pw = pImg.width;
    const ph = pImg.height;
    const nw = npcImg.width;
    const nh = npcImg.height;
    const overlap = (Math.abs(px - npc.x) * 2 < (pw + nw)) && (Math.abs(py - npc.y) * 2 < (ph + nh));
    if (overlap) {
      if (npc.anim !== npc.contact) {
        talkingNPC = npc; // 設定當前對話對象
        npc.anim = npc.contact;
        // 從頭播放 contact 動畫
        frameIndices[npc.anim] = 0;
      }
      // 啟動對話（若尚未啟動）
      if (!dialogActive) startDialog();
      // 當 NPC 打字完成後，切換為 canvas 輸入模式
      // （由 drawDialog 中在打字完成時設定 canvasInputActive）
    } else {
      if (npc.anim !== npc.idle) {
        npc.anim = npc.idle;
        frameIndices[npc.anim] = 0;
      }
      // 結束對話（若正在對話）
      if (dialogActive) {
        endDialog();
        // 關閉 canvas 輸入
        canvasInputActive = false;
        canvasInputText = '';
      }
    }
  }
  }

  // --- Scene 2: b12 邏輯 ---
  if (bgImage === bgImage2) {
    // b12 隨機移動
    let overlapB12 = false;
    let overlapKK = false;

    if (!dialogActive) {
      if (millis() > npcB12.moveTimer) {
        npcB12.vx = random([-1.5, -0.5, 0, 0.5, 1.5]);
        npcB12.moveTimer = millis() + random(1000, 3000);
      }
      npcB12.x += npcB12.vx;
      npcB12.x = constrain(npcB12.x, 50, width - 50);
    }

    // 繪製 b12
    const imgB12 = assets['b12'][frameIndices['b12']];
    if (imgB12) {
      push();
      translate(npcB12.x, npcB12.y);
      // 根據移動方向翻轉
      let dir = npcB12.vx >= 0 ? 1 : -1;
      scale(dir * 2, 2); 
      image(imgB12, 0, 0);
      pop();
    }

    // 碰撞偵測
    const pImg = assets[active][frameIndices[active]];
    if (pImg && imgB12) {
      const pw = pImg.width;
      const ph = pImg.height;
      const bw = imgB12.width;
      const bh = imgB12.height;
      overlapB12 = (Math.abs(px - npcB12.x) * 2 < (pw + bw)) && (Math.abs(py - npcB12.y) * 2 < (ph + bh));
    }
    
    // 繪製 st 動畫 (懸崖頂部)
    const imgSt = assets['st'][frameIndices['st']];
    if (imgSt) {
      push();
      translate(width * 0.60, height * 0.15); // 設定在懸崖頂部大概位置
      scale(2, 2);
      image(imgSt, 0, 0);
      pop();
    }

    // 繪製 kk (左邊)
    const imgKK = assets['kk'][frameIndices['kk']];
    if (imgKK) {
      push();
      translate(npcKK.x, npcKK.y);
      scale(1, 1); // 縮小為 1 倍 (原本是 2)
      image(imgKK, 0, 0);
      pop();
    }

    // kk 碰撞偵測
    if (pImg && imgKK) {
      const pw = pImg.width;
      const ph = pImg.height;
      const kw = imgKK.width;
      const kh = imgKK.height;
      overlapKK = (Math.abs(px - npcKK.x) * 2 < (pw + kw)) && (Math.abs(py - npcKK.y) * 2 < (ph + kh));
    }

    // 統一處理 Scene 2 的對話觸發與結束
    if (overlapB12) {
      talkingNPC = npcB12;
      if (!dialogActive) startDialog();
      canvasInputActive = true;
    } else if (overlapKK) {
      talkingNPC = npcKK;
      if (!dialogActive) startDialog();
      canvasInputActive = true;
    } else {
      // 如果都沒有碰到任何 NPC，且正在對話中，則結束對話
      if (dialogActive) endDialog();
    }
    
    drawDialog(); // 繪製對話泡泡
  }

  // 取得當前影格
  const img = assets[active][frameIndices[active]];

  // 畫出 NPC（在 npc.x, npc.y） — 先畫 NPC，使玩家疊在上方
  const imgNpc = assets[npc.anim] && assets[npc.anim][frameIndices[npc.anim]];
  if (imgNpc && bgImage === bgImage1) {
    push();
    translate(npc.x, npc.y);
    scale(2, 2); // 將 NPC 放大兩倍
    image(imgNpc, 0, 0); // imageMode(CENTER)
    pop();
  }

  // 對話顯示：若 NPC 正在打字或有回覆/玩家氣泡，要在畫面上繪製泡泡
  if (bgImage === bgImage1) {
    drawDialog();
  }

  // 畫出角色（在 px,py）
  if (img) {
    push();
    translate(px, py);
    // 水平翻轉以反映朝向
    scale(facing * 2, 2); // 將玩家角色放大兩倍，並保持朝向
    image(img, 0, 0); // imageMode(CENTER)
    pop();
  } else {
    // 若該組沒影格，顯示提示文字
    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(16);
    text('Animation "' + active + '" not loaded', width / 2, height / 2);
  }

  // 可選：保持角色在畫布內
  px = constrain(px, 0 + 1, width - 1);

  // --- 轉場邏輯 ---
  // 觸發條件：Scene 1 右邊界 -> Scene 2; Scene 2 左邊界 -> Scene 1
  if (transitionMode === 0) {
    if (bgImage === bgImage1 && px >= width - 10) {
      transitionMode = 1;
      transitionProg = 0;
    } else if (bgImage === bgImage2 && px <= 10) {
      transitionMode = 1;
      transitionProg = 0;
    }
  }

  if (transitionMode !== 0) {
    // 更新轉場進度
    if (transitionMode === 1) {
      transitionProg += 0.04;
      if (transitionProg >= 1.2) { // 稍微停留在全黑
        transitionMode = 2;
        // 切換背景與位置
        if (bgImage === bgImage1) {
          bgImage = bgImage2;
          px = 60; // 到達 Scene 2 左側
          endDialog(); // 清除對話狀態
        } else {
          bgImage = bgImage1;
          px = width - 60; // 回到 Scene 1 右側
        }
      }
    } else {
      transitionProg -= 0.04;
      if (transitionProg <= 0) {
        transitionMode = 0;
        transitionProg = 0;
      }
    }

    // 繪製圓形縮放轉場 (Circle Wipe)
    push();
    noStroke();
    fill(0);
    
    // 計算圓孔半徑 (transitionProg 0->1 變黑, 半徑大->0)
    // 螢幕對角線一半作為最大半徑
    let maxR = Math.sqrt(width*width + height*height) / 2;
    // 限制 t 在 0~1
    let t = constrain(transitionProg, 0, 1);
    // 當 t=0, r=maxR; t=1, r=0
    let r = maxR * (1 - t);

    // 使用 beginShape 繪製帶有圓孔的矩形
    beginShape();
    // 外圍矩形 (順時針)
    vertex(0, 0);
    vertex(width, 0);
    vertex(width, height);
    vertex(0, height);
    
    // 內部圓孔 (逆時針)
    beginContour();
    for (let a = 0; a <= TWO_PI; a += 0.1) {
      // 逆時針畫圓
      let angle = TWO_PI - a;
      vertex(width/2 + r * cos(angle), height/2 + r * sin(angle));
    }
    endContour();
    endShape(CLOSE);
    pop();
  }

  // --- 繪製特效 ---
  if (celebrationActive) {
    drawCelebration();
  }
  if (gameOverActive) {
    drawGameOver();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // 重新計算地面與 NPC 位置
  groundY = height / 2;
  py = groundY;
  npc.y = groundY;
  npcB12.y = groundY;
  npcKK.y = groundY;
  // 若輸入欄顯示，重新定位到玩家上方
  if (playerInput && playerInput.style('display') !== 'none') {
    const imgH = (assets['e5'] && assets['e5'][0]) ? assets['e5'][0].height : 40;
    const inputW = BUBBLE_MAX_W - BUBBLE_PADDING*2;
    const estimatedTop = Math.round(py - imgH - 40);
    playerInput.position(Math.round(px - inputW/2 + BUBBLE_PADDING), estimatedTop);
  }
  if (sendButton && sendButton.style('display') !== 'none') {
    const inputW = BUBBLE_MAX_W - BUBBLE_PADDING*2;
    const estimatedTop = Math.round(py - ((assets['e5'] && assets['e5'][0]) ? assets['e5'][0].height : 40) - 40);
    sendButton.position(Math.round(px - inputW/2 + BUBBLE_PADDING) + inputW + 8, estimatedTop);
  }
  if (restartButton) {
    restartButton.position(width / 2 - 60, height / 2 + 60);
  }
}

function keyPressed() {
  // 防止瀏覽器滾動箭頭鍵的預設行為
  if ([LEFT_ARROW, RIGHT_ARROW, UP_ARROW, DOWN_ARROW].includes(keyCode)) {
    return false; // p5.js 會 preventDefault
  }
  // 在 canvas 輸入模式下，處理 Backspace 與 Enter
  if (canvasInputActive) {
    if (keyCode === BACKSPACE) {
      // 移除最後一個字元
      canvasInputText = canvasInputText.slice(0, -1);
      return false;
    }
    if (keyCode === ENTER || keyCode === RETURN) {
      // 提交文字
      onSend();
      return false;
    }
  } else if (quizState === 'SHOWING_FEEDBACK') {
    // 當回饋顯示完畢後，按任意鍵繼續下一題
    // 避免在輸入時觸發
    if (!canvasInputActive) {
      startDialog(); // 開始新一輪問答
    }
  }
}

function keyTyped() {
  // 只在 canvas 輸入模式下捕捉可印字元
  if (!canvasInputActive) return;
  // 過濾控制字元
  if (key === '\b' || key === '\r' || key === '\n') return;
  // 限制最大長度（避免過長）
  if (canvasInputText.length < 200) {
    canvasInputText += key;
  }
  return false; // 取消預設
}

// ------------ 對話相關函式 ------------
function startDialog() {
  dialogActive = true;
  quizState = 'ASKING';

  // 根據場景選擇題庫
  let questions = quizQuestions; // 預設 Scene 1
  if (bgImage === bgImage2) {
    // Scene 2: 判斷是 b12 還是 kk
    if (talkingNPC === npcKK) questions = kkQuestions;
    else if (talkingNPC === npcB12) questions = b12Questions;
    else questions = b12Questions; // fallback
  }

  if (questions.length > 0) {
    currentQuestion = random(questions);
    npcMessage = currentQuestion.question; // 設定 NPC 的問題
  } else {
    npcMessage = '題庫載入失敗...';
  }

  // 重置並開始 NPC 打字動畫
  npcTyping = true;
  npcTypedIndex = 0;
  lastTypedTime = millis();

  showPlayerBubble = false;
  aiReply = '';
  aiReplyIndex = 0;
  npcReplying = false;
}

function endDialog() {
  dialogActive = false;
  npcTyping = false;
  quizState = 'IDLE';
  currentQuestion = null;
  canvasInputActive = false;
  canvasInputText = '';
  npcTypedIndex = 0;
  if (playerInput) {
    playerInput.hide();
    playerInput.value('');
  }
  if (sendButton) sendButton.hide();
  showPlayerBubble = false;
  aiReply = '';
  npcReplying = false;
}

async function onSend() {
  // 支援從 canvas 提交或 DOM 提交（DOM 被隱藏，但保留支援）
  let txt = '';
  if (canvasInputActive) {
    txt = canvasInputText.trim();
  } else if (playerInput) {
    txt = playerInput.value().trim();
  }
  if (!txt || txt.length === 0) return;

  // --- 新的問答遊戲邏輯 ---
  if (quizState === 'ASKING' && currentQuestion) {
    // 關閉輸入狀態，準備顯示回饋
    canvasInputActive = false;
    quizState = 'SHOWING_FEEDBACK';

    // 比較答案
    if (txt.toLowerCase() === currentQuestion.answer.toLowerCase()) {
      // 答對了
      aiReply = currentQuestion.correct_feedback;
      startCelebration();
      
      // 啟動 NPC 回覆動畫
      npcReplying = true;
      aiReplyIndex = 0;
      lastTypedTime = millis();
    } else {
      // 答錯了
      triggerGameOver();
    }
    return; // 到此為止，不執行下面的舊 AI 邏輯
  }

  // 新問題到來：清除舊回覆顯示
  aiReply = '';
  aiReplyIndex = 0;
  npcReplying = false;
  // 設定玩家訊息（不要注音：直接使用玩家原始輸入作為顯示文字）
  playerMessage = txt;
  // 不使用後端回傳的注音，直接把輸入文字顯示在畫布輸入欄
  canvasInputText = txt;
  playerMessage = txt;
  showPlayerBubble = false; // 不顯示玩家泡泡
  // 關閉輸入狀態
  canvasInputActive = false;
  canvasInputText = '';
  if (playerInput) playerInput.hide();
  if (sendButton) sendButton.hide();

  // 呼叫本地 proxy（/api/chat）以取得注音與 GPT 回覆
  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: playerMessage })
    });
    if (!resp.ok) {
      const txtErr = await resp.text();
      console.warn('Chat API error', resp.status, txtErr);
      // fallback to local reply
      aiReply = generateAIReply(playerMessage);
    } else {
      const j = await resp.json();
      // j: { zhuyin_input, reply }
      if (j.zhuyin_input) {
        // 顯示中文文字為玩家可見文字（優先使用後端回傳的 chinese_input，若無則以 zhuyin_input 作為 fallback）
        if (j.chinese_input && j.chinese_input.length > 0) {
          canvasInputText = j.chinese_input;
        }
      }
      aiReply = j.reply || '';
    }
  } catch (err) {
    console.error('Failed to call /api/chat', err);
    aiReply = generateAIReply(playerMessage);
  }

  // 啟動 NPC 逐字回覆（或顯示立即的回覆）
  aiReplyIndex = 0;
  npcReplying = true;
  lastTypedTime = millis();
}

// 簡單本地 AI 回覆（可替換為遠端 API）
function generateAIReply(q) {
  const s = q.replace(/\s/g, '').toLowerCase();
  if (s.includes('ㄋㄧˇㄐㄧㄠˋㄕㄜˊㄇㄜ˙')) return '你不需要知道';
  if (s.includes('ㄐㄧㄣㄊㄧㄢㄍㄨㄛˋㄉㄜ˙ㄖㄨˊㄏㄜˊ')) return '有你在就是很好的一天';
  if (s.includes('ㄨㄛˇㄏㄣˇㄔㄚㄐㄧㄥˋㄇㄚ')) return '怎麼會！你是最好的';
  if (s.includes('ㄧㄡˇㄖㄣˊㄕㄨㄛㄨㄛˇㄏㄣˇㄆㄤˋ')) return '誰說的 我幫你去揍他';
  if (s.includes('ㄨㄛˇㄇㄣˇㄕˋㄏㄠˇㄆㄥˊㄧㄡˇㄇㄚ')) return '是比好朋友還要好的那種好朋友';
  // 其他問題預設回覆
  return '不跟泥說';
}

// 將文字斷行成符合寬度的多行陣列（支援中文按字分行）
function wrapTextToLines(txt, maxW, textSizeVal) {
  textSize(textSizeVal);
  let lines = [];
  let cur = '';
  for (let i = 0; i < txt.length; i++) {
    cur += txt[i];
    if (textWidth(cur) > maxW - BUBBLE_PADDING*2) {
      // 如果單字也超過，強制斷
      if (cur.length === 1) {
        lines.push(cur);
        cur = '';
      } else {
        // 把最後一個字移到下一行
        const lastChar = cur.slice(-1);
        const line = cur.slice(0, -1);
        lines.push(line);
        cur = lastChar;
      }
    }
  }
  if (cur.length > 0) lines.push(cur);
  return lines;
}

// 繪製對話泡泡（x,y 為中心點上方位置），lines 為文字陣列
function drawSpeechBubble(cx, cy, lines, alignRight=false) {
  textSize(16);
  const maxLineWidth = (lines && lines.length) ? Math.max(...lines.map(l => textWidth(l))) : 0;
  const w = Math.min(BUBBLE_MAX_W, Math.max(80, maxLineWidth) + BUBBLE_PADDING*2);
  const lineCount = (lines && lines.length) ? lines.length : 1;
  const h = lineCount * (16 + 4) + BUBBLE_PADDING*2;
  let bx = cx - w/2;
  if (alignRight) bx = cx - w/2; // 預留未來調整
  const by = cy - h - 20; // 20 px above the character

  // 限制不要超出畫面
  const bxClamped = constrain(bx, 8, width - w - 8);

  // 背景與邊框
  push();
  fill(255);
  stroke(0);
  rect(bxClamped, by, w, h, 8);
  // 文字
  noStroke();
  fill(0);
  textAlign(LEFT, TOP);
  let ty = by + BUBBLE_PADDING;
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], bxClamped + BUBBLE_PADDING, ty);
    ty += 16 + 4;
  }
  pop();
}

// 在畫面上處理並繪製對話（NPC 打字、玩家輸入、AI 回覆）
function drawDialog() {
  // 決定當前對話的 NPC 對象
  let activeNpc = talkingNPC || npc;

  // NPC 打字階段
  if (dialogActive && npcTyping) {
    // 逐字更新
    if (millis() - lastTypedTime >= TYPING_SPEED) {
      lastTypedTime = millis();
      if (npcTypedIndex < npcMessage.length) {
        npcTypedIndex++;
      } else {
        // NPC 問題問完
        npcTyping = false;
        // 如果是問答狀態，則啟用玩家輸入
        if (quizState === 'ASKING') {
          canvasInputActive = true;
          canvasInputText = '';
        }
        canvasInputActive = true;
        canvasInputText = '';
        // 清除之前的 AI 顯示（若有），新問題到來前隱藏舊回覆
        aiReply = '';
        aiReplyIndex = 0;
        npcReplying = false;
      }
    }
    const shown = npcMessage.slice(0, npcTypedIndex);
    const lines = wrapTextToLines(shown, BUBBLE_MAX_W, 16);
    drawSpeechBubble(activeNpc.x, activeNpc.y - (assets[activeNpc.anim] && assets[activeNpc.anim][frameIndices[activeNpc.anim]] ? assets[activeNpc.anim][frameIndices[activeNpc.anim]].height/2 : 0), lines);
  }

  // 玩家送出訊息後顯示玩家氣泡
  if (showPlayerBubble) {
    const lines = wrapTextToLines(playerMessage, BUBBLE_MAX_W, 16);
    drawSpeechBubble(px, py - (assets['e5'] && assets['e5'][0] ? assets['e5'][0].height/2 : 0), lines);
  }

  // 玩家正在輸入（尚未送出）時，在玩家上方顯示與 NPC 相同格式的泡泡，並把 input DOM 放到同位置
  // Canvas 輸入模式：以 canvas 文字顯示，不使用 DOM input
  if (dialogActive && !npcTyping && canvasInputActive) {
    // --- 新的黃色作答框邏輯 ---
    const imgH = (assets['e5'] && assets['e5'][0]) ? assets['e5'][0].height : 40;
    const boxCenterY = py - imgH / 2 - 40; // 方塊的垂直中心點

    const labelText = "請作答：";
    const inputText = canvasInputText;

    push();
    textSize(16);
    textAlign(LEFT, CENTER);

    // 計算總寬度
    const labelWidth = textWidth(labelText);
    const inputWidth = textWidth(inputText);
    const totalTextWidth = labelWidth + inputWidth;
    const boxWidth = totalTextWidth + BUBBLE_PADDING * 2 + 10; // 加上左右邊距和一點額外空間
    const boxHeight = 16 + BUBBLE_PADDING * 2; // 文字高度 + 上下邊距

    // 計算方塊位置
    let boxX = px - boxWidth / 2;
    const boxY = boxCenterY - boxHeight / 2;

    // 繪製黃色背景方塊
    fill(255, 255, 204); // 淡黃色
    stroke(150, 150, 0); // 深黃色邊框
    rect(boxX, boxY, boxWidth, boxHeight, 8);

    // 繪製文字
    noStroke();
    fill(0);
    const textY = boxY + boxHeight / 2;
    text(labelText, boxX + BUBBLE_PADDING, textY);
    text(inputText, boxX + BUBBLE_PADDING + labelWidth, textY);

    pop();
  }

  // NPC 正在回覆（逐字顯示 aiReply）
  if (npcReplying) {
    if (millis() - lastTypedTime >= TYPING_SPEED) {
      lastTypedTime = millis();
      if (aiReplyIndex < aiReply.length) aiReplyIndex++;
      else {
        // NPC 回饋顯示完畢
        npcReplying = false; 
        // 流程變更：不再自動問下一題，等待玩家按鍵觸發 (見 keyPressed)
      }
    }
    const shown = aiReply.slice(0, aiReplyIndex);
    const lines = wrapTextToLines(shown, BUBBLE_MAX_W, 16);
    drawSpeechBubble(activeNpc.x, activeNpc.y - (assets[activeNpc.anim] && assets[activeNpc.anim][frameIndices[activeNpc.anim]] ? assets[activeNpc.anim][frameIndices[activeNpc.anim]].height/2 : 0), lines);
  }
  // 若已完成回覆且 npcReplying 為 false，但 aiReply 有內容，則顯示完整回覆（直到下一次提問或離開）
  else if (!npcReplying && aiReply && aiReply.length > 0) {
    const lines = wrapTextToLines(aiReply, BUBBLE_MAX_W, 16);
    drawSpeechBubble(activeNpc.x, activeNpc.y - (assets[activeNpc.anim] && assets[activeNpc.anim][frameIndices[activeNpc.anim]] ? assets[activeNpc.anim][frameIndices[activeNpc.anim]].height/2 : 0), lines);
  }
}

// --- 特效與遊戲控制函式 ---

function startCelebration() {
  celebrationActive = true;
  celebrationParticles = [];
  // 產生 300 個隨機顏色的粒子
  for (let i = 0; i < 300; i++) {
    celebrationParticles.push({
      x: width / 2,
      y: height / 2,
      vx: random(-15, 15), // 擴大水平噴發範圍
      vy: random(-20, -5), // 擴大垂直噴發高度
      color: color(random(255), random(255), random(255)),
      life: 255
    });
  }
  // 3秒後自動結束
  setTimeout(() => {
    celebrationActive = false;
  }, 3000);
}

function drawCelebration() {
  push();
  noStroke();
  for (let i = celebrationParticles.length - 1; i >= 0; i--) {
    let p = celebrationParticles[i];
    fill(p.color);
    rect(p.x, p.y, 8, 8); // 繪製方形像素粒子
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.2; // 重力
    p.life -= 3; // 讓粒子存活久一點，飛得更遠
    if (p.life <= 0) celebrationParticles.splice(i, 1);
  }
  pop();
}

function triggerGameOver() {
  gameOverActive = true;
  if (restartButton) restartButton.show();
  endDialog(); // 結束對話狀態
}

function drawGameOver() {
  push();
  // 紅色半透明遮罩
  fill(255, 0, 0, 150);
  rect(0, 0, width, height);
  
  // GAME OVER 文字
  fill(255);
  textSize(80);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  text("GAME OVER", width / 2, height / 2 - 20);
  pop();
}

function resetGame() {
  gameOverActive = false;
  if (restartButton) restartButton.hide();
  
  // 回到起始畫面 (Scene 1)
  bgImage = bgImage1;
  px = width / 2;
  py = groundY;
  
  // 重置 NPC 位置
  npc.x = width * 0.75;
  npcB12.x = width * 0.5;
  npcKK.x = width * 0.15;
  
  // 重置狀態
  endDialog();
  transitionMode = 0;
  transitionProg = 0;
}
