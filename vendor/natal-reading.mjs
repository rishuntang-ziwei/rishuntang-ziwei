/** 本命簡易解盤 — 命宮、財帛、事業、夫妻、疾厄 */

const PALACE_DISPLAY = { 官祿: '事業宮', 僕役: '交友宮', 財帛: '財帛宮' }

const TOPICS = [
  {
    id: 'life',
    label: '命宮',
    palace: '命宮',
    intro: '命宮主性格、人生基調與整體格局。以下依本命主星簡述方向，供參考。',
    emptyHint: '命宮無主星時，性格常借對宮顯現，宜從環境與歷練中看見自己。',
  },
  {
    id: 'wealth',
    label: '財帛',
    palace: '財帛',
    intro: '財帛宮主財運、理財與資源進出。以下依本命主星簡述傾向，供參考。',
    emptyHint: '財運常受對宮與外出機會牽引，宜觀察收入來源並穩健累積。',
  },
  {
    id: 'career',
    label: '事業',
    palace: '官祿',
    intro: '事業宮主職場、仕途與社會成就。以下依本命主星簡述方向，供參考。',
    emptyHint: '事業方向常受對宮環境與外出機會牽引，宜觀察職場變化並主動歷練。',
  },
  {
    id: 'love',
    label: '夫妻',
    palace: '夫妻',
    intro: '夫妻宮主感情、婚姻與親密互動。以下依本命主星簡述傾向，供參考。',
    emptyHint: '感情表達較內斂或隨環境而動，需透過相處慢慢顯現真實需求。',
  },
  {
    id: 'health',
    label: '疾厄',
    palace: '疾厄',
    intro: '疾厄宮反映體質與身心負擔。以下為一般性參考，不能取代醫療診斷。',
    emptyHint: '體質強弱需綜合命宮與生活習慣觀察，宜定期檢查、規律作息。',
  },
]

const STAR_HINTS = {
  紫微: { theme: '自主', keywords: '掌控、領導、創造' },
  天機: { theme: '策劃', keywords: '思考、變通、勞心' },
  太陽: { theme: '能量', keywords: '付出、名望、忙碌' },
  武曲: { theme: '開拓', keywords: '執行、資源、剛毅' },
  天同: { theme: '分享', keywords: '享受、溫和、知足' },
  廉貞: { theme: '需求', keywords: '原則、情感、細膩' },
  天府: { theme: '儲存', keywords: '穩定、包容、積累' },
  太陰: { theme: '養分', keywords: '敏感、照顧、內斂' },
  貪狼: { theme: '資源', keywords: '才華、慾望、學習' },
  巨門: { theme: '協調', keywords: '溝通、分析、口舌' },
  天相: { theme: '操盤', keywords: '服務、協調、安排' },
  天梁: { theme: '背景', keywords: '庇護、原則、長輩' },
  七殺: { theme: '執行', keywords: '魄力、競爭、開創' },
  破軍: { theme: '整合', keywords: '變革、衝勁、破立' },
}

const TOPIC_PREFIX = {
  life: '在命格上',
  wealth: '在財運上',
  career: '在事業上',
  love: '在感情上',
  health: '在身心方面',
}

const BRIGHT_NOTE = {
  庙: '星力強旺，特質容易顯現在外。',
  旺: '星力充沛，發揮相對穩定。',
  得: '星力得所，需時間累積成果。',
  利: '星力尚可，配合努力可見成效。',
  平: '星力平和，起伏不至劇烈。',
  不: '星力稍弱，宜謹慎調整步調。',
  陷: '星力受阻，需多一份耐心與方法。',
}

const MUTAGEN_NOTE = {
  祿: '化祿同宮，資源與順遂感較佳。',
  權: '化權同宮，主動性與掌控力提升。',
  科: '化科同宮，名望與學習力加分。',
  忌: '化忌同宮，此領域宜多留心思經營。',
}

const AUX_STARS = {
  life: {
    左輔: '身邊易有協助與扶持。',
    右弼: '人際協調力較佳。',
    天魁: '易遇貴人或長輩提點。',
    天鉞: '關鍵轉折常有助力。',
    文昌: '學習與表達能力加分。',
    文曲: '才藝與口才易被看見。',
    祿存: '重視穩健與自我積累。',
  },
  wealth: {
    祿存: '財源偏穩，宜長期累積。',
    天馬: '財運常隨移動、外出而動。',
    文昌: '文書、專業技能可換財。',
    文曲: '才藝或溝通能力有利進帳。',
    左輔: '合夥或貴人助財。',
    右弼: '協作帶來資源機會。',
  },
  career: {
    左輔: '有助力或貴人提攜。',
    右弼: '團隊協作機會增多。',
    天魁: '易遇長輩或貴人提點。',
    天鉞: '關鍵時刻常有轉機。',
    文昌: '文書、專業或考試有利。',
    文曲: '口才與技藝可發揮。',
    祿存: '重視穩健與資源累積。',
  },
  love: {
    紅鸞: '桃花與喜悅緣分較動。',
    天喜: '感情易有開心進展。',
    天姚: '社交與異性互動增加。',
    咸池: '重視親密與感官連結。',
  },
  health: {
    擎羊: '留意急性壓力或意外小傷。',
    陀羅: '慢性困擾或拖延性不適。',
    火星: '注意火氣、發炎或急躁。',
    鈴星: '隱性煩躁影響睡眠與神經。',
    地空: '易有虛耗感或思緒過多。',
    地劫: '作息失衡時體力下降快。',
  },
}

/** 依主星／四化／宮位組合選小提示（每盤不同） */
const STAR_TIPS = {
  life: {
    紫微: ['人生節奏偏自主，宜先立方向再帶人同行。', '責任感強時，記得為自己留喘息空間。'],
    天機: ['想法靈活是優勢，落地前先排優先序。', '多變中找一條主軸，人生更穩。'],
    太陽: ['樂於付出與照亮他人，也要學會被照顧。', '忙碌之外，固定留給自己的時間很重要。'],
    武曲: ['剛毅執行力是本錢，柔和溝通能走更遠。', '現實與紀律幫你築底，偶爾允許自己放鬆。'],
    天同: ['知足與溫和是福氣，主動爭取舒適節奏。', '享受生活之餘，也要訂下小目標推進。'],
    廉貞: ['原則清楚是優點，先講規則再談感情。', '細膩觀察局勢，比急著表態更有利。'],
    天府: ['穩健積累比爆發更適合你，慢就是快。', '包容與保管能力，能成為人生的底氣。'],
    太陰: ['內斂敏感是天賦，先照顧情緒再應對外事。', '幕後滋養的角色，往往比前台更順。'],
    貪狼: ['才華與慾望並存，選一項深耕才能變現。', '多元興趣可保留，人生主軸需明確。'],
    巨門: ['溝通與分析是你的舞台，少在氣頭上定案。', '口舌來自誤會，重要事留文字紀錄。'],
    天相: ['服務與協調易得信任，界線清楚才長久。', '幫人之前先顧自己，責任才不會過重。'],
    天梁: ['長輩貴人可多請益，穩扎穩打比搶快好。', '原則與庇護特質，適合需要經驗的路。'],
    七殺: ['魄力與開創是優勢，設休息點避免透支。', '競爭環境能激發你，但退場機制也要有。'],
    破軍: ['變革衝勁強，每段破立後記得整理成果。', '舊方法該放就放手，新局才站得穩。'],
  },
  wealth: {
    紫微: ['財運偏掌控型，宜主導預算與長期布局。', '資源愈多愈要分工，別事事親力親為。'],
    天機: ['靈活理財適合你，但計畫要留修改空間。', '資訊與策劃能力可轉化為收入來源。'],
    太陽: ['付出換名望時，別忽略實際現金流。', '公開輸出與服務，容易帶來機會與報酬。'],
    武曲: ['財務控管是優勢，可主動爭取實務職。', '剛性執行之外，適度分散風險更穩。'],
    天同: ['安穩進帳比冒險投機更適合你。', '享受消費時設上限，知足才能長久。'],
    廉貞: ['原則清楚有助守財，先訂規則再談合夥。', '細膩觀察市場，比衝動出手更有利。'],
    天府: ['儲存與累積是你的財運主軸。', '保管、行政、資源整合類工作易生財。'],
    太陰: ['幕後理財或耐心型投資，往往比炒短線順。', '情緒消費也是成本，記帳能幫你看清。'],
    貪狼: ['才華變現要搭配紀律，學一項就學到能賣。', '多元收入可保留，但主財源需明確。'],
    巨門: ['溝通、教學、分析類工作易帶來財。', '合約與口頭承諾都要留紀錄，避免糾紛。'],
    天相: ['服務與協調角色容易得信任與報酬。', '幫人理財前先劃清界線，避免責任過重。'],
    天梁: ['長輩資源與經驗可轉為穩健財源。', '慢累積比搶快更符合你的節奏。'],
    七殺: ['開創期辛苦，建立系統後現金流會穩。', '競爭中求財，要設停損與休息點。'],
    破軍: ['變革與新創可帶來財，但每段衝刺後要結算。', '破舊立新時，先保住基本生活費。'],
  },
  career: {
    紫微: ['領導角色宜先定方向，再分工給團隊執行。', '職位愈高，愈要留時間給長期布局。'],
    天機: ['多變的環境適合你，但計畫要留修改空間。', '用書面或流程把想法固定下來，執行會更穩。'],
    太陽: ['忙於對外時，別忽略後勤與資源補給。', '名望來自持續輸出，選一兩個方向深耕即可。'],
    武曲: ['財務與流程控管是你的優勢，可主動爭取實務職。', '剛毅之外，適度柔軟有助協調資源。'],
    天同: ['找能發揮服務與協調的工作，比硬拚更長久。', '安穩不代表被動，主動爭取舒適的節奏。'],
    廉貞: ['原則清楚是優點，職場上先講規則再講感情。', '細膩觀察局勢，比急著表態更有利。'],
    天府: ['穩健累積比短期爆發更適合你的步調。', '保管、行政、資源整合類工作易發揮。'],
    太陰: ['幕後策劃或需要耐心的工作，往往比前台更順。', '情緒消耗也是成本，工作節奏宜留白。'],
    貪狼: ['才華要搭配紀律，學一項就學到能變現。', '多元興趣可保留，但主業需有明確主軸。'],
    巨門: ['溝通、教學、分析類工作是你的舞台。', '口舌是非來自誤會，重要事留文字紀錄。'],
    天相: ['協調與服務他人的角色，容易得到信任。', '幫人之前先劃清界線，避免責任過重。'],
    天梁: ['適合需要經驗與原則的職務，長輩貴人可多請益。', '穩扎穩打比搶快更符合你的節奏。'],
    七殺: ['競爭環境能激發你，但要設定休息與退場點。', '開創期辛苦，建立系統後會輕鬆許多。'],
    破軍: ['變革與新創適合你，但每段衝刺後要整理戰果。', '破立並行，舊方法該放就放手。'],
  },
  love: {
    紫微: ['感情裡也需要傾聽，不必事事做主。', '給對方舞台，關係會更平衡。'],
    天機: ['想法多變時，直接說出需求比讓對方猜測好。', '約會與相處可多一點新鮮安排。'],
    太陽: ['付出很多時，記得也要接收對方的關心。', '忙碌不是藉口，固定相處時間很重要。'],
    武曲: ['剛硬之外，偶爾柔軟一句話勝過百件禮物。', '金錢與現實議題宜公開討論，別悶在心裡。'],
    天同: ['享受相處之餘，也要談談對未來的期待。', '太遷就容易委屈，溫和地說出底線。'],
    廉貞: ['情感細膩是優點，忌諱時別用試探代替溝通。', '原則與親密可以並存，先講清楚規則。'],
    天府: ['穩定是你想要的，但別用沉默代替表達。', '一起規劃生活，比只談浪漫更踏實。'],
    太陰: ['敏感時先照顧自己，再回應對方會更清楚。', '內斂不是冷淡，適時說出感受。'],
    貪狼: ['吸引力強時，更要把界線與承諾說明白。', '新鮮感需要經營，老關係也要製造小驚喜。'],
    巨門: ['口角常因誤會，換方式表達比爭贏重要。', '深度對話是優勢，少在情緒高點做決定。'],
    天相: ['太配合對方時，問問自己是否也快樂。', '服務型人格記得：被愛也需要被看見。'],
    天梁: ['長輩意見可參考，但主導權仍在兩人手中。', '慢熱沒關係，信任建立後會很穩。'],
    七殺: ['激情過後，日常相處的規則同樣重要。', '競爭心別帶進親密關係，合作比輸贏重要。'],
    破軍: ['關係有起伏時，先穩住再談改變。', '新階段開始前，把舊帳與期待說開。'],
  },
  health: {
    紫微: ['壓力常來自責任過重，學會授權也是養生。', '心血管與睡眠宜定期留意。'],
    天機: ['思慮過多易失眠，睡前減少資訊刺激。', '頭肩頸放鬆運動，對你特別有幫助。'],
    太陽: ['過勞是隱憂，再忙也要保留固定休息。', '眼睛與心血管，避免長期熬夜。'],
    武曲: ['緊繃時易有筋骨問題，拉伸別省略。', '工作節奏宜張弛有度，別硬撐到極限。'],
    天同: ['享受之餘注意飲食均衡，避免過度放縱。', '少動時也要散步，代謝才會穩。'],
    廉貞: ['情緒悶住會反映在身體，找出口很重要。', '過敏或內分泌，生活規律有助改善。'],
    天府: ['體重與代謝宜長期管理，別靠短期節食。', '消化系統怕暴飲暴食，定時定量較佳。'],
    太陰: ['陰虛或手腳冰冷體質，保暖與作息要優先。', '情緒與內分泌連動，少鑽牛角尖。'],
    貪狼: ['應酬多時節制菸酒，肝膽與腎水宜保養。', '慾望與作息失衡時，先調睡眠。'],
    巨門: ['口舌是非帶來壓力，少生悶氣也是養生。', '留意口腔、呼吸與腸胃的慢性不適。'],
    天相: ['替人操心過度會累，學會說「不」也是保健。', '水腫或循環問題，少鹽多走動。'],
    天梁: ['老毛病宜追蹤，別因習慣而忽略檢查。', '長輩式操勞心態，該休息就休息。'],
    七殺: ['急性壓力與意外風險，運動前要充分熱身。', '競爭心強時更忌硬撐，受傷常來自過度。'],
    破軍: ['作息劇變易耗神，變動期更要固定睡眠。', '發炎、發熱等小症狀，別拖到變慢性。'],
  },
}

const MUTAGEN_TIPS = {
  life: {
    祿: ['化祿在命宮，人生資源較順，把握當下機會。', '順遂時仍要立長遠目標，避免飄忽。'],
    權: ['化權在命宮，主動性強，宜學習授權與彈性。', '掌控欲高時，留空間給他人與自己。'],
    科: ['化科在命宮，學習與名望加分，可多曝光專長。', '公開形象宜謹慎經營，口碑是資產。'],
    忌: ['化忌在命宮，自我要求高，宜溫柔對待自己。', '卡關時先調整心態與方法，比硬撐有效。'],
  },
  wealth: {
    祿: ['化祿在財帛宮，進帳窗口較開，但仍要記帳控管。', '有餘裕時先存緊急金，再考慮擴張。'],
    權: ['化權在財帛宮，適合主動爭取報酬與主導財務。', '掌控財源很好，別忽略合夥與稅務規則。'],
    科: ['化科在財帛宮，專業名聲有助開源，可規劃證照或作品。', '公開報價前先準備充分，口碑換財。'],
    忌: ['化忌在財帛宮，大筆支出與投資宜多評估。', '財務卡關時先修現金流，比冒險翻本穩。'],
  },
  career: {
    祿: ['化祿在事業宮，把握資源進帳的窗口，但別過度擴張。', '有機會時先穩固本業，再考慮副業。'],
    權: ['化權在事業宮，適合主動爭取主導，但要顧及團隊感受。', '權力增大時，制度比個人英雄主義重要。'],
    科: ['化科在事業宮，名望與考證有利，可安排進修或曝光。', '口碑是資產，公開發言宜謹慎準備。'],
    忌: ['化忌在事業宮，轉職或重大決策宜多評估，避免衝動。', '職場卡關時先修內功，比硬換跑道穩。'],
  },
  love: {
    祿: ['化祿在夫妻宮，相處易有甜蜜感，也要談現實與承諾。', '桃花旺時，更要把界線說清楚。'],
    權: ['化權在夫妻宮，關係中誰說了算要取得平衡。', '主動經營感情很好，但別變成控制。'],
    科: ['化科在夫妻宮，外在形象與溝通品質能加分。', '用溫和方式表達需求，比指責有效。'],
    忌: ['化忌在夫妻宮，小誤會易放大，少在氣頭上做決定。', '老問題反覆時，尋求第三方協調也有幫助。'],
  },
  health: {
    祿: ['化祿在疾厄宮，整體恢復力尚可，但仍要規律作息。', '有餘裕時建立運動習慣，勝過病後才補救。'],
    權: ['化權在疾厄宮，過度操勞是風險，學會授權與休息。', '對身體過度要求，反而容易受傷。'],
    科: ['化科在疾厄宮，宜重視預防醫學與定期健檢。', '學習正確的養生知識，比道聽塗說有效。'],
    忌: ['化忌在疾厄宮，小症狀別拖，情緒壓力也要紓解。', '忌諱過度解讀，該看醫生就看醫生。'],
  },
}

const BORROWED_TIPS = {
  life: ['命宮借對宮之星，性格常透過環境與他人映照出來。', '多接觸不同圈子，有助看清自己真正想要的。'],
  wealth: ['財帛借對宮之星，財運常與外出、轉換環境有關。', '本業收入不穩時，可從對宮代表的領域找靈感。'],
  career: ['事業借對宮之星，外出、轉換環境常帶來機會。', '本業不順時，可從對宮代表的領域找靈感。'],
  love: ['夫妻宮借星，緣分常與工作、社交圈有關。', '感情模式受環境影響大，換圈子有時就換緣分。'],
  health: ['疾厄借對宮，身心狀態與生活圈、家庭氛圍連動。', '調整環境與人際，有時比補品更見效。'],
}

const WEAK_BRIGHT_TIPS = {
  life: ['主星稍弱時，先累積小成就建立自信。', '找能互補的伙伴，比單打獨鬥省力。'],
  wealth: ['財星稍弱時，先穩現金流，再談擴張。', '小額紀律存錢，比一次求暴利穩。'],
  career: ['主星稍弱時，先累積作品與口碑，再求職位跳躍。', '找能互補的搭檔，比單打獨鬥省力。'],
  love: ['感情運起伏時，慢一點確認，比快點定案穩。', '先經營自己，吸引力會自然提升。'],
  health: ['體力偏弱時，小步調整作息，勝過劇烈改變。', '慢性不適宜追蹤紀錄，找規律給醫師參考。'],
}

const GENERAL_TIPS = {
  life: [
    '認識自己的節奏，比追趕別人更重要。',
    '每年檢視一次人生優先序。',
    '小習慣複利，勝过大起大落。',
    '貴人與環境會放大你的特質。',
    '允許自己慢一點，也允許自己重來。',
  ],
  wealth: [
    '先存緊急金，再考慮投資與擴張。',
    '收入來源宜多元，但主軸要清楚。',
    '記帳兩週，就能看見漏財點。',
    '會賺也要會留，紀律比運氣重要。',
    '大額決策前，睡一晚再決定。',
  ],
  career: [
    '設定階段性目標，比一次求成更穩。',
    '貴人與合作比單打獨鬥省力。',
    '技能可複利，選一項持續精進。',
    '職場變動前，先存好六個月生活費。',
    '會做也要會說，適度展示成果。',
  ],
  love: [
    '直接溝通期待，勝過猜測對方心思。',
    '保留個人空間，關係反而長久。',
    '爭執時先處理情緒，再處理問題。',
    '共同目標比浪漫口號更能撐久。',
    '定期約會，老關係也需要儀式感。',
  ],
  health: [
    '固定睡眠與飲食節奏，是最基本的養生。',
    '壓力大時先減量再硬撐。',
    '每週至少三次中等強度活動。',
    '水分與纖維足夠，腸胃會感謝你。',
    '情緒也是健康指標，別只顧身體不管心。',
  ],
}

function hashPick(seed, options) {
  if (!options?.length) return ''
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  return options[Math.abs(hash) % options.length]
}

function buildTipSeed(topicId, palace, stars, borrowed, borrowFrom, minors) {
  const starPart = stars
    .map((s) => `${s.name}:${s.brightness || ''}:${s.mutagen || ''}`)
    .join('|')
  return [
    topicId,
    `${palace.heavenlyStem}${palace.earthlyBranch}`,
    starPart,
    borrowed ? `借${borrowFrom}` : '本宮',
    minors.slice(0, 4).join(','),
    palace.isBodyPalace ? '身宮' : '',
  ].join(';')
}

function pickTopicTip(topicId, palace, stars, borrowed, borrowFrom, minors) {
  const seed = buildTipSeed(topicId, palace, stars, borrowed, borrowFrom, minors)
  const primary = stars[0]

  if (primary?.mutagen && MUTAGEN_TIPS[topicId]?.[primary.mutagen]) {
    return hashPick(`${seed};mutagen`, MUTAGEN_TIPS[topicId][primary.mutagen])
  }

  if (primary?.name && STAR_TIPS[topicId]?.[primary.name]) {
    return hashPick(`${seed};star`, STAR_TIPS[topicId][primary.name])
  }

  if (borrowed && BORROWED_TIPS[topicId]) {
    return hashPick(`${seed};borrowed`, BORROWED_TIPS[topicId])
  }

  if (primary && ['陷', '不'].includes(primary.brightness)) {
    return hashPick(`${seed};weak`, WEAK_BRIGHT_TIPS[topicId])
  }

  for (const minor of minors) {
    const auxMap = AUX_STARS[topicId]
    if (auxMap?.[minor]) {
      return `留意${minor}的影響：${auxMap[minor].replace(/。$/, '')}。`
    }
  }

  if (palace.isBodyPalace) {
    const bodyTips = {
      life: '身宮在命宮，性格與人生選擇高度一致，宜真誠活出自己。',
      wealth: '身宮在財帛宮，財務決策會深刻影響人生節奏，宜穩健規劃。',
      career: '身宮在事業宮，工作選擇會深刻影響人生走向，宜慎重但不畏試。',
      love: '身宮在夫妻宮，親密關係是你人生的重要課題，值得用心經營。',
      health: '身宮在疾厄宮，身心平衡是一生的功課，規律生活優先。',
    }
    if (bodyTips[topicId]) return bodyTips[topicId]
  }

  return hashPick(`${seed};general`, GENERAL_TIPS[topicId])
}

function formatPalaceName(name) {
  if (PALACE_DISPLAY[name]) return PALACE_DISPLAY[name]
  if (name.endsWith('宮')) return name
  return `${name}宮`
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getPalaceStars(astrolabe, palaceName) {
  const palace = astrolabe.palace(palaceName)
  if (!palace) return { palace: null, stars: [], borrowed: false, borrowFrom: '' }

  if (palace.majorStars?.length) {
    return { palace, stars: palace.majorStars, borrowed: false, borrowFrom: '' }
  }

  const surrounded = astrolabe.surroundedPalaces(palaceName)
  const opposite = surrounded?.opposite
  return {
    palace,
    stars: opposite?.majorStars || [],
    borrowed: true,
    borrowFrom: opposite?.name || '',
  }
}

function collectMinorNames(palace) {
  if (!palace) return []
  const list = []
  for (const group of [palace.minorStars, palace.adjectiveStars]) {
    if (!group) continue
    for (const star of group) {
      if (star?.name) list.push(star.name)
    }
  }
  return list
}

function describeStar(star, topicId) {
  const hint = STAR_HINTS[star.name]
  const prefix = TOPIC_PREFIX[topicId] || ''
  if (!hint) {
    return `${prefix}，${star.name}坐守此宮，相關特質值得細細觀察。`
  }
  let line = `${prefix}，${star.name}星帶有「${hint.theme}」色彩，常見${hint.keywords.split('、').slice(0, 2).join('、')}等表現。`
  if (star.brightness && BRIGHT_NOTE[star.brightness]) {
    line += BRIGHT_NOTE[star.brightness]
  }
  if (star.mutagen && MUTAGEN_NOTE[star.mutagen]) {
    line += MUTAGEN_NOTE[star.mutagen]
  }
  return line
}

function describeAuxStars(minors, topicId) {
  const map = AUX_STARS[topicId]
  if (!map) return []
  const lines = []
  for (const name of minors) {
    if (map[name]) lines.push(`${name}：${map[name]}`)
  }
  return lines.slice(0, 2)
}

function buildTopicReading(astrolabe, topic) {
  const { palace, stars, borrowed, borrowFrom } = getPalaceStars(astrolabe, topic.palace)
  const minors = palace ? collectMinorNames(palace) : []
  const paragraphs = [topic.intro]

  if (!palace) {
    paragraphs.push('未能讀取此宮資料，請重新排盤。')
    return {
      id: topic.id,
      label: topic.label,
      title: `${topic.label}解盤`,
      paragraphs,
      tip: hashPick(topic.id, GENERAL_TIPS[topic.id]),
    }
  }

  const gz = `${palace.heavenlyStem}${palace.earthlyBranch}`
  const palaceLine = borrowed
    ? `${formatPalaceName(topic.palace)}（${gz}）無主星，借對宮${formatPalaceName(borrowFrom)}星曜。${topic.emptyHint}`
    : `${formatPalaceName(topic.palace)}（${gz}）有主星坐守。`
  paragraphs.push(palaceLine)

  if (stars.length) {
    const mainNames = stars.map((s) => s.name).join('、')
    paragraphs.push(`主星為 ${mainNames}。`)
    for (const star of stars.slice(0, 2)) {
      paragraphs.push(describeStar(star, topic.id))
    }
  } else {
    paragraphs.push(topic.emptyHint)
  }

  const auxLines = describeAuxStars(minors, topic.id)
  if (auxLines.length) {
    paragraphs.push(`輔星提示：${auxLines.join(' ')}`)
  }

  if (palace.isBodyPalace) {
    paragraphs.push('此宮為身宮，上述特質在人生選擇上會格外明顯。')
  }

  const soul = astrolabe.palace('命宮')
  if (soul?.majorStars?.length && (topic.id === 'career' || topic.id === 'wealth')) {
    const domain = topic.id === 'wealth' ? '財運取捨' : '職涯取捨'
    const withPalace = topic.id === 'wealth' ? '財帛宮' : '事業宮'
    paragraphs.push(
      `綜合命宮主星 ${soul.majorStars.map((s) => s.name).join('、')}，整體人生節奏會影響${domain}，宜與${withPalace}一併參考。`,
    )
  }

  return {
    id: topic.id,
    label: topic.label,
    title: `${topic.label}解盤`,
    paragraphs,
    tip: pickTopicTip(topic.id, palace, stars, borrowed, borrowFrom, minors),
  }
}

export function buildNatalReading(astrolabe, personName) {
  const sections = TOPICS.map((topic) => buildTopicReading(astrolabe, topic))
  return {
    personName: personName || '命主',
    sections,
    byId: Object.fromEntries(sections.map((s) => [s.id, s])),
  }
}

export function renderReadingPanel(reading, activeTab, personName) {
  const tab = reading.byId[activeTab] ? activeTab : 'life'
  const section = reading.byId[tab]
  const tabsHtml = reading.sections
    .map(
      (s) =>
        `<button type="button" class="mobile-reading-tab${s.id === tab ? ' is-active' : ''}" data-tab="${s.id}">${escapeHtml(s.label)}</button>`,
    )
    .join('')

  const bodyHtml = section.paragraphs
    .map((p) => `<p class="mobile-reading-p">${escapeHtml(p)}</p>`)
    .join('')

  return (
    `<div class="mobile-reading-inner">` +
    `<div class="mobile-reading-header">` +
    `<h3 class="mobile-reading-title">本命簡易解盤</h3>` +
    `<p class="mobile-reading-sub">${escapeHtml(personName || reading.personName)} · 僅供參考</p>` +
    `</div>` +
    `<div class="mobile-reading-tabs" role="tablist">${tabsHtml}</div>` +
    `<div class="mobile-reading-body">` +
    `<h4 class="mobile-reading-section-title">${escapeHtml(section.title)}</h4>` +
    bodyHtml +
    `<p class="mobile-reading-tip"><strong>小提示：</strong>${escapeHtml(section.tip)}</p>` +
    `<p class="mobile-reading-disclaimer">簡易解盤依星曜組合作概括說明，詳細命勢請洽專業老師。</p>` +
    `</div>` +
    `</div>`
  )
}
