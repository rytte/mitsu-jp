export type ConjugationTableRow = {
  form: string;
  ichidan: string;
  godan: string;
  suru: string;
  kuru: string;
};

export type ConjugationOverviewRow = {
  form: string;
  meaning: string;
  godanRule: string;
  ichidanRule: string;
};

export const CONJUGATION_OVERVIEW_ROWS: ConjugationOverviewRow[] = [
  { form: '辞书形', meaning: '词典原形，是所有变形起点。', godanRule: '词尾保持 u 段原形', ichidanRule: '原形常以「る」结尾' },
  { form: 'ます形', meaning: '礼貌体基础形。', godanRule: '词尾改 i 段 + ます', ichidanRule: '词干 + ます' },
  { form: 'て形', meaning: '连接、请求、进行时等高频形。', godanRule: '按音便变化（て）', ichidanRule: '词干 + て' },
  { form: 'た形', meaning: '过去时基础形。', godanRule: '按音便变化（た）', ichidanRule: '词干 + た' },
  { form: 'ない形', meaning: '否定基础形。', godanRule: '词尾改 a 段 + ない', ichidanRule: '词干 + ない' },
  { form: '意向形', meaning: '表示“要做……”“打算……”。', godanRule: '词尾改 o 段 + う', ichidanRule: '词干 + よう' },
  { form: '命令形', meaning: '直接命令语气。', godanRule: '词尾改 e 段', ichidanRule: '词干 + ろ / よ' },
  { form: '条件形', meaning: '表示“如果……就……”。', godanRule: '词尾改 e 段 + ば', ichidanRule: '词干 + れば' },
  { form: '可能形', meaning: '表示“能做……”。', godanRule: '词尾改 e 段 + る', ichidanRule: '词干 + られる' },
  { form: '被动形', meaning: '表示“被……”。', godanRule: '词尾改 a 段 + れる', ichidanRule: '词干 + られる' },
  { form: '使役形', meaning: '表示“让/使某人做……”。', godanRule: '词尾改 a 段 + せる', ichidanRule: '词干 + させる' },
  { form: '使役被动形', meaning: '表示“被迫做……”。', godanRule: '词尾改 a 段 + せられる', ichidanRule: '词干 + させられる' },
];

export const CONJUGATION_TABLE_ROWS: ConjugationTableRow[] = [
  { form: '辞书形', ichidan: '食べる', godan: '書く', suru: 'する', kuru: '来る（くる）' },
  { form: 'ます形', ichidan: '食べます', godan: '書きます', suru: 'します', kuru: '来ます（きます）' },
  { form: 'て形', ichidan: '食べて', godan: '書いて', suru: 'して', kuru: '来て（きて）' },
  { form: 'た形', ichidan: '食べた', godan: '書いた', suru: 'した', kuru: '来た（きた）' },
  { form: 'ない形', ichidan: '食べない', godan: '書かない', suru: 'しない', kuru: '来ない（こない）' },
  { form: '意向形', ichidan: '食べよう', godan: '書こう', suru: 'しよう', kuru: '来よう（こよう）' },
  { form: '命令形', ichidan: '食べろ / 食べよ', godan: '書け', suru: 'しろ / せよ', kuru: '来い（こい）' },
  { form: '条件形', ichidan: '食べれば', godan: '書けば', suru: 'すれば', kuru: '来れば（くれば）' },
  { form: '可能形', ichidan: '食べられる', godan: '書ける', suru: 'できる', kuru: '来られる（こられる）' },
  { form: '被动形', ichidan: '食べられる', godan: '書かれる', suru: 'される', kuru: '来られる（こられる）' },
  { form: '使役形', ichidan: '食べさせる', godan: '書かせる', suru: 'させる', kuru: '来させる（こさせる）' },
  { form: '使役被动形', ichidan: '食べさせられる', godan: '書かせられる', suru: 'させられる', kuru: '来させられる（こさせられる）' },
];
