/** 45 張牌組 — 全牌面圖已匯入 */

export const CARD_BACK = 'assets/ui/card-back.png';
export const BACKGROUND = 'assets/ui/background.png';

export const TIERS = {
  major: {
    id: 'major',
    label: '主星',
    subtitle: '從牌陣中抽出 2 張',
    pickCount: 2,
    mode: 'draw',
    color: '#1a237e',
    accent: '#c9a227',
  },
  tierB: {
    id: 'tierB',
    label: '乙級輔助星',
    subtitle: '洗牌後從牌堆抽選 2 張',
    pickCount: 2,
    mode: 'draw',
    color: '#1b4332',
    accent: '#52b788',
  },
  tierC: {
    id: 'tierC',
    label: '丙級輔助星',
    subtitle: '洗牌後從牌堆抽選 2 張',
    pickCount: 2,
    mode: 'draw',
    color: '#6a1b9a',
    accent: '#ce93d8',
  },
  mutagen: {
    id: 'mutagen',
    label: '四化與空牌',
    subtitle: '洗牌後從 5 張中抽選 1 張',
    pickCount: 1,
    mode: 'draw',
    color: '#b71c1c',
    accent: '#ef9a9a',
  },
};

export const ROUND_ORDER = ['major', 'tierB', 'tierC', 'mutagen'];

/** @typedef {{ id: string, name: string, image?: string, theme?: string, themeEn?: string, rank?: number|string, suit?: string, element?: string, fortune?: string, keywords?: string, keywordsEn?: string, variant?: string }} Card */

/** @type {Record<string, Card[]>} */
export const DECK = {
  major: [
    { id: 'm01', name: '紫微', theme: '自主', themeEn: 'Autonomy', rank: 'A', suit: 'spade', element: '土', fortune: '君', keywords: '擁有、掌控、創造', keywordsEn: 'Be the owner, Take control, Create', image: 'assets/cards/major/zi-wei.png' },
    { id: 'm02', name: '天機', theme: '策劃', themeEn: 'Strategize', rank: 'A', suit: 'club', element: '木', fortune: '佐', keywords: '智商、創意、勞心', keywordsEn: 'IQ, Creativity, Mind laborious', image: 'assets/cards/major/tian-ji.png' },
    { id: 'm03', name: '太陽', theme: '能量', themeEn: 'Energy', rank: 'Q', suit: 'spade', element: '火', fortune: '使', keywords: '提供、執著、粗心', keywordsEn: 'Provide, Persistent, Careless', image: 'assets/cards/major/tai-yang.png' },
    { id: 'm04', name: '武曲', theme: '開拓', themeEn: 'Pioneer', rank: 'K', suit: 'spade', element: '金', fortune: '君', keywords: '資源、工作、新創', keywordsEn: 'Resource, Work, Innovation', image: 'assets/cards/major/wu-qu.png' },
    { id: 'm05', name: '天同', theme: '分享', themeEn: 'Sharing', rank: 'J', suit: 'heart', element: '水', fortune: '佐', keywords: '擁有、滿足、自在', keywordsEn: 'Enjoy, Satisfy, Comfortable', image: 'assets/cards/major/tian-tong.png' },
    { id: 'm06', name: '廉貞', theme: '需求', themeEn: 'Demand', rank: 'J', suit: 'spade', element: '火', fortune: '君', keywords: '主觀、想法、細膩', keywordsEn: 'Subjective, Idea, Exquisite', image: 'assets/cards/major/lian-zhen.png' },
    { id: 'm07', name: '天府', theme: '儲存', themeEn: 'Abundant', rank: 'K', suit: 'heart', element: '土', fortune: '臣', keywords: '福祿、順暢、有得', keywordsEn: 'Knighthood, Favorable, Gain', image: 'assets/cards/major/tian-fu.png' },
    { id: 'm08', name: '太陰', theme: '養分', themeEn: 'Nourish', rank: 'Q', suit: 'heart', element: '水', fortune: '使', keywords: '提供、多變、掛心', keywordsEn: 'Provide, Change, Care', image: 'assets/cards/major/tai-yin.png' },
    { id: 'm09', name: '貪狼', theme: '資源', themeEn: 'Resources', rank: 'Q', suit: 'diamond', element: '水', fortune: '臣', keywords: '才華、能力、學習', keywordsEn: 'Talent, Ability, Learning', image: 'assets/cards/major/tan-lang.png' },
    { id: 'm10', name: '巨門', theme: '協調', themeEn: 'Coordination', rank: 'Q', suit: 'club', element: '水', fortune: '佐', keywords: '溝通、顯示、好評', keywordsEn: 'Communicate, Display, Praise', image: 'assets/cards/major/ju-men.png' },
    { id: 'm11', name: '天相', theme: '操盤', themeEn: 'Manage', rank: 'A', suit: 'heart', element: '水', fortune: '臣', keywords: '經手、掌控、安排', keywordsEn: 'Handle, Take control, Lay out', image: 'assets/cards/major/tian-xiang.png' },
    { id: 'm12', name: '天梁', theme: '背景', themeEn: 'Background', rank: 'K', suit: 'club', element: '土', fortune: '使', keywords: '能量、助力、成就', keywordsEn: 'Energy, Boost, Achievement', image: 'assets/cards/major/tian-liang.png' },
    { id: 'm13', name: '七殺', theme: '執行', themeEn: 'Execution', rank: 'J', suit: 'diamond', element: '金', fortune: '臣', keywords: '領導、動能、提升', keywordsEn: 'Leader, Kinetic energy, Promote', image: 'assets/cards/major/qi-sha.png' },
    { id: 'm14', name: '破軍', theme: '整合', themeEn: 'Integration', rank: 'A', suit: 'diamond', element: '火', fortune: '臣', keywords: '管理、資源、籌碼', keywordsEn: 'Administer, Resource, Bargaining chip', image: 'assets/cards/major/po-jun.png' },
  ],

  tierB: [
    { id: 'b01', name: '天魁', theme: '顯示', themeEn: 'Display', rank: 10, suit: 'spade', element: '火', fortune: '吉', keywords: '貴人相助、完滿', keywordsEn: 'Noble help, Perfect', image: 'assets/cards/tierB/tian-kui.png' },
    { id: 'b02', name: '天鉞', theme: '能量', themeEn: 'Power', rank: 10, suit: 'heart', element: '火', fortune: '吉', keywords: '神助、逢凶、求神', keywordsEn: "God's help, Disaster, Praying to God", image: 'assets/cards/tierB/tian-yue.png' },
    { id: 'b03', name: '左輔', theme: '推動', themeEn: 'Promote', rank: 8, suit: 'spade', element: '土', fortune: '吉', keywords: '助力、外力幫助', keywordsEn: 'Assistance, External force help', image: 'assets/cards/tierB/zuo-fu.png' },
    { id: 'b04', name: '右弼', theme: '協力', themeEn: 'Aid', rank: 8, suit: 'club', element: '金', fortune: '吉', keywords: '助力、得力助手', keywordsEn: 'Assistance, Right-hand man', image: 'assets/cards/tierB/you-bi.png' },
    { id: 'b05', name: '文昌', theme: '質感', themeEn: 'Classy', rank: 8, suit: 'heart', element: '金', fortune: '吉', keywords: '學習、專業、圓潤', keywordsEn: 'Learning, Professional, Mellow', image: 'assets/cards/tierB/wen-chang.png' },
    { id: 'b06', name: '文曲', theme: '程度', themeEn: 'Level', rank: 6, suit: 'heart', element: '金', fortune: '吉', keywords: '才華、技術、圓潤', keywordsEn: 'Talent, Technology, Mellow', image: 'assets/cards/tierB/wen-qu.png' },
    { id: 'b07', name: '祿存', theme: '多變', themeEn: 'Changeable', rank: 5, suit: 'heart', element: '土', fortune: '形', keywords: '失而復得、好事', keywordsEn: 'Lost and found, Good things', image: 'assets/cards/tierB/lu-cun.png' },
    { id: 'b08', name: '天馬', theme: '改變', themeEn: 'Change', rank: 4, suit: 'club', element: '火', fortune: '形', keywords: '不穩、距離、外出', keywordsEn: 'Instability, Distance, Going out', image: 'assets/cards/tierB/tian-ma.png' },
    { id: 'b09', name: '擎羊', theme: '動能', themeEn: 'Momentum', rank: 5, suit: 'diamond', element: '金', fortune: '凶', keywords: '破壞、創造、獨立', keywordsEn: 'Destroy, Create, Independence', image: 'assets/cards/tierB/qing-yang.png' },
    { id: 'b10', name: '陀羅', theme: '週轉', themeEn: 'Spin', rank: 8, suit: 'diamond', element: '金', fortune: '凶', keywords: '延遲、多磨、空轉', keywordsEn: 'Delay, Hard work, Idling', image: 'assets/cards/tierB/tuo-luo.png' },
    { id: 'b11', name: '火星', theme: '灰燼', themeEn: 'Ash', rank: 4, suit: 'diamond', element: '火', fortune: '凶', keywords: '傷害、能量、急躁', keywordsEn: 'Damage, Energy, Impatience', image: 'assets/cards/tierB/huo-xing.png' },
    { id: 'b12', name: '鈴星', theme: '提醒', themeEn: 'Remind', rank: 3, suit: 'diamond', element: '火', fortune: '凶', keywords: '干擾、暗火、煩躁', keywordsEn: 'Disturbance, Dark fire, Irritability', image: 'assets/cards/tierB/ling-xing.png' },
    { id: 'b13', name: '地空', theme: '天道', themeEn: 'Spirituality', rank: 2, suit: 'heart', element: '火', fortune: '凶', keywords: '捨棄、直覺、宗教', keywordsEn: 'Renunciation, Intuition, Religion', image: 'assets/cards/tierB/di-kong.png' },
    { id: 'b14', name: '地劫', theme: '淨空', themeEn: 'Clear out', rank: 2, suit: 'diamond', element: '火', fortune: '凶', keywords: '清除、失去、不好', keywordsEn: 'Clear, Lose, Bad', image: 'assets/cards/tierB/di-jie.png' },
  ],

  tierC: [
    { id: 'c01', name: '大耗', theme: '損失', themeEn: 'Heavy Loss', rank: 'K', suit: 'diamond', element: '火', fortune: '耗', keywords: '衰、滅、失', keywordsEn: 'Attenuation, Reduction, Loss', image: 'assets/cards/tierC/da-hao.png' },
    { id: 'c02', name: '咸池', theme: '享樂', themeEn: 'Pleasure', rank: 7, suit: 'diamond', element: '火', fortune: '桃', keywords: '親密、生活關係', keywordsEn: 'Intimacy, Life relationship', image: 'assets/cards/tierC/xian-chi.png' },
    { id: 'c03', name: '天廚', theme: '常態', themeEn: 'Normal', rank: 4, suit: 'heart', element: '土', fortune: '佑', keywords: '生活、飲食、技藝', keywordsEn: 'Life, Food, Skill', image: 'assets/cards/tierC/tian-chu.png' },
    { id: 'c04', name: '解神', theme: '反轉', themeEn: 'Reversal', rank: 9, suit: 'spade', element: '金', fortune: '佑', keywords: '逢凶化解、放鬆', keywordsEn: 'Turn bad luck into good luck', image: 'assets/cards/tierC/jie-shen.png' },
    { id: 'c05', name: '天姚', theme: '社交', themeEn: 'Social', rank: 7, suit: 'spade', element: '金', fortune: '桃', keywords: '異性、互動、交往', keywordsEn: 'Opposite sex, Interaction, Communication', image: 'assets/cards/tierC/tian-yao.png' },
    { id: 'c06', name: '封誥', theme: '庇蔭', themeEn: 'Patronize', rank: 9, suit: 'heart', element: '土', fortune: '佑', keywords: '肯定、受獎、酬庸', keywordsEn: 'Affirmation, Award, Reward', image: 'assets/cards/tierC/feng-gao.png' },
    { id: 'c07', name: '紅鸞', theme: '喜悅', themeEn: 'Joy', rank: 7, suit: 'heart', element: '土', fortune: '桃', keywords: '感情交往、正緣', keywordsEn: 'Relationship, Main fate', image: 'assets/cards/tierC/hong-luan.png' },
    { id: 'c08', name: '陰煞', theme: '被害', themeEn: 'Victim', rank: 'JOKER', suit: 'joker', element: '火', fortune: '耗', keywords: '小人、阻礙、不順', keywordsEn: 'A base person, Obstacle, Trouble', image: 'assets/cards/tierC/yin-sha.png' },
    { id: 'c09', name: '喜神', theme: '對的', themeEn: 'Right', rank: 3, suit: 'heart', element: '金', fortune: '佑', keywords: '好事臨門、愉悅', keywordsEn: 'Good things come, Happy', image: 'assets/cards/tierC/xi-shen.png' },
    { id: 'c10', name: '蜚廉', theme: '不定', themeEn: 'Undecided', rank: 'JOKER', suit: 'joker', element: '金', fortune: '耗', keywords: '爭執、爭議、雙面', keywordsEn: 'Dispute, Controversy, Two-Face', image: 'assets/cards/tierC/fei-lian.png' },
    { id: 'c11', name: '破碎', theme: '沒了', themeEn: 'Broken', rank: 9, suit: 'diamond', element: '金', fortune: '耗', keywords: '好夢、醒、沒指望', keywordsEn: 'Good dream, Wake up, Hopeless', image: 'assets/cards/tierC/po-sui.png' },
    { id: 'c12', name: '華蓋', theme: '背景', themeEn: 'Forces behind', rank: 9, suit: 'club', element: '木', fortune: '佑', keywords: '朝中有人、保護', keywordsEn: 'With background, Protect', image: 'assets/cards/tierC/hua-gai.png' },
  ],

  mutagen: [
    { id: 'h01', name: '化祿', theme: '好事', themeEn: 'Positive', rank: 3, suit: 'spade', element: '木', fortune: '化', keywords: '圓滿、財富、佳況', keywordsEn: 'Fulfillment, Wealth, Prosperity', variant: 'lu', image: 'assets/cards/mutagen/hua-lu.png' },
    { id: 'h02', name: '化權', theme: '逾越', themeEn: 'Exceed', rank: 4, suit: 'spade', element: '金', fortune: '化', keywords: '明顯、更多、嚴厲', keywordsEn: 'Obvious, More, Severe', variant: 'quan', image: 'assets/cards/mutagen/hua-quan.png' },
    { id: 'h03', name: '化科', theme: '加成', themeEn: 'Boost', rank: 5, suit: 'spade', element: '水', fortune: '化', keywords: '獲得、實至名歸', keywordsEn: 'Get, Well deserved', variant: 'ke', image: 'assets/cards/mutagen/hua-ke.png' },
    { id: 'h04', name: '化忌', theme: '不通', themeEn: 'Blockage', rank: 6, suit: 'diamond', element: '火', fortune: '化', keywords: '阻礙、不順困難', keywordsEn: 'Hindrance, Difficulty', variant: 'ji', image: 'assets/cards/mutagen/hua-ji.png' },
    { id: 'h05', name: '空牌', theme: '空', themeEn: 'Void', rank: 2, suit: 'spade', element: '', fortune: '', keywords: '', keywordsEn: '', variant: 'void', image: 'assets/cards/mutagen/void.png' },
  ],
};
