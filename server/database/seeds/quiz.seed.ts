// 疝鸡杯题库种子数据
// 题目均为真实事实、附可核验出处；correct 答案在玩家取题接口不下发（防作弊）。

export type QuizCategory = 'basic' | 'sugar';
export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export interface QuizSeedItem {
  /** 题干 */
  stem: string;
  /** 4 个选项 */
  options: string[];
  /** 正确选项下标 0-3 */
  answerIndex: number;
  /** 分类：basic 基础常识 / sugar 糖点细节 */
  category: QuizCategory;
  /** 难度 */
  difficulty: QuizDifficulty;
  /** 出处链接 */
  sourceUrl: string;
  /** 出处说明 */
  sourceNote: string;
}

export const quizSeed: QuizSeedItem[] = [
  // ===================== Part A · 基础常识 =====================

  {
    stem: '名井南（Mina）的生日是？',
    options: ['1996-12-29', '1997-03-24', '1996-11-09', '1997-02-01'],
    answerIndex: 1,
    category: 'basic',
    difficulty: 'easy',
    sourceUrl: 'https://twice.jype.com/Mobile/Profile',
    sourceNote: 'JYP 官方 Profile',
  },
  {
    stem: '凑崎纱夏（Sana）的生日是？',
    options: ['1996-12-29', '1997-03-24', '1996-11-09', '1995-12-29'],
    answerIndex: 0,
    category: 'basic',
    difficulty: 'easy',
    sourceUrl: 'https://www.twicejapan.com/feature/profile',
    sourceNote: 'TWICE Japan 官方 Profile',
  },
  {
    stem: 'Mina 出生于？',
    options: ['日本大阪', '美国得克萨斯州圣安东尼奥', '日本神户', '美国洛杉矶'],
    answerIndex: 1,
    category: 'basic',
    difficulty: 'easy',
    sourceUrl: 'https://kprofiles.com/twice-members-profile/amp/',
    sourceNote: 'Kprofiles（父母为日本人，幼年搬回神户）',
  },
  {
    stem: 'Sana 出生于？',
    options: ['大阪市天王寺区', '大阪市中央区', '大阪府堺市', '神户市中央区'],
    answerIndex: 0,
    category: 'basic',
    difficulty: 'medium',
    sourceUrl: 'https://elle.com.sg/life-culture/twice-members-profile-2025/',
    sourceNote: 'ELLE Singapore',
  },
  {
    stem: '关于「37line」得名，下列哪项正确？',
    options: [
      '按年龄顺位，Sana 第 3、Mina 第 7',
      '两人名字的日语发音都能拼出 37：3 可读 Mi 或 Sa，7 读 Na',
      '两人在《The Feels》中的号码都选了 37',
      'CP 名取自 MISAMO 出道日 7 月 3 日',
    ],
    answerIndex: 1,
    category: 'basic',
    difficulty: 'hard',
    sourceUrl: 'https://www.koreaboo.com/stories/twice-reveals-favorite-numbers-special-meaning-behind/',
    sourceNote: 'Koreaboo（年龄顺位其实是 46；号码仅 Mina 为 37、Sana 为 12）',
  },
  {
    stem: 'Mina 出道前持续练习超过十年的是？',
    options: ['钢琴', '芭蕾', '跆拳道', '现代舞'],
    answerIndex: 1,
    category: 'basic',
    difficulty: 'easy',
    sourceUrl: 'https://kpopbio.com/twice-members-profile-bio/',
    sourceNote: 'Kpopbio',
  },

  // ===================== Part B · 糖点细节 =====================

  {
    stem: '2023-03-13，Mina 被问“想从 Sana 那里得到什么生日礼物”，她的回答是？',
    options: ['项链', '啵啵', '糖果', '花'],
    answerIndex: 1,
    category: 'sugar',
    difficulty: 'medium',
    sourceUrl: 'https://m.weibo.cn/detail/4878934896807682',
    sourceNote: '「生日礼物想从杀下那里得到什么呢」「想要啵啵」',
  },
  {
    stem: '《Masterpiece》中 Mina 和 Sana 有著名双人舞，除了「It\'s not easy for you」，还有哪一首？',
    options: ['Do not touch', 'Funny Valentine', 'Behind The Curtain', 'Rewind You'],
    answerIndex: 1,
    category: 'sugar',
    difficulty: 'medium',
    sourceUrl: 'https://m.weibo.cn/detail/4926393408817346',
    sourceNote: '「Funny Valentine 双人舞」',
  },
  {
    stem: '2024-08-16 的名场面，Sana 对 Mina 说「爱你＿＿」？',
    options: ['一辈子', '到永远', '每一天', '不后悔'],
    answerIndex: 0,
    category: 'sugar',
    difficulty: 'medium',
    sourceUrl: 'https://m.weibo.cn/detail/5068043895964404',
    sourceNote: '「爱你一辈子」',
  },
  {
    stem: '2024-08-16 曝光的 Mina 手机备注是？',
    options: ['米糖mori🐧', '米糖🐧', '纱糖', 'Minari'],
    answerIndex: 0,
    category: 'sugar',
    difficulty: 'hard',
    sourceUrl: 'https://m.weibo.cn/detail/5068051385156638',
    sourceNote: 'B 只差 mori 最易混；「纱糖」是 Sana 的备注',
  },
  {
    stem: '2024-12-29（Sana 生日前后），Mina 对 Sana 的告白是？',
    options: ['新年快乐', '你知道我非常非常爱你吧？', '礼物收到了吗', '许个愿吧'],
    answerIndex: 1,
    category: 'sugar',
    difficulty: 'medium',
    sourceUrl: 'https://m.weibo.cn/detail/5117063993233909',
    sourceNote: '「你知道我非常非常爱你吧？」',
  },
];
