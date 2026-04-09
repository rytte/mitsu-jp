import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import { colors, radius, spacing } from '../theme';
import { useScreenTopPadding } from '../utils/useScreenTopPadding';

type KeigoRow = {
  plain: string;
  respectful: string;
  humble: string;
  polite: string;
  gloss: string;
  respectfulIntro: string;
  humbleIntro: string;
  respectfulExampleJa: string;
  respectfulExampleZh: string;
  humbleExampleJa: string;
  humbleExampleZh: string;
  politeExampleJa: string;
  politeExampleZh: string;
};

type GiveRow = {
  scene: string;
  plain: string;
  keigo: string;
  intro: string;
  plainExampleJa: string;
  plainExampleZh: string;
  exampleJa: string;
  exampleZh: string;
};

type RequestRow = {
  pattern: string;
  usage: string;
  intro: string;
  exampleJa: string;
  exampleZh: string;
};

type KeigoPracticeField = 'respectful' | 'humble' | 'polite';
type KeigoPracticeMode = 'plain_to_keigo' | 'gloss_to_keigo' | 'keigo_to_plain' | 'keigo_to_gloss';

type KeigoPracticeQuestion = {
  id: string;
  plain: string;
  gloss: string;
  keigo: string;
  field: KeigoPracticeField;
  label: string;
  answer: string;
  options: string[];
};

const ROWS: KeigoRow[] = [
  {
    plain: '見る',
    respectful: 'ご覧になる',
    humble: '拝見する',
    polite: '見ます',
    gloss: '看',
    respectfulIntro: '对上级或客户说“看”时，用「ご覧になる」。',
    humbleIntro: '自己“看”对方资料或作品时，用「拝見する」。',
    respectfulExampleJa: '社長は資料をご覧になります。',
    respectfulExampleZh: '社长会过目资料。',
    humbleExampleJa: '私が企画書を拝見します。',
    humbleExampleZh: '我来拜读企划书。',
    politeExampleJa: 'その資料を見ます。',
    politeExampleZh: '我看那份资料。',
  },
  {
    plain: '見せる',
    respectful: 'お見せになる',
    humble: 'ご覧に入れる / お目にかける',
    polite: '見せます',
    gloss: '给人看 / 出示',
    respectfulIntro: '描述对方展示资料、作品时，可用「お見せになる」。',
    humbleIntro: '把东西给上级或客户过目时，常用「ご覧に入れる / お目にかける」。',
    respectfulExampleJa: '先生が新作をお見せになります。',
    respectfulExampleZh: '老师会展示新作品。',
    humbleExampleJa: '資料を先生にお目にかけます。',
    humbleExampleZh: '我把资料呈给老师过目。',
    politeExampleJa: '写真をみなさんに見せます。',
    politeExampleZh: '我把照片给大家看。',
  },
  {
    plain: '行く',
    respectful: 'いらっしゃる / おいでになる',
    humble: '伺う / 参る',
    polite: '行きます',
    gloss: '去',
    respectfulIntro: '谈对方前往某地时，可用「いらっしゃる / おいでになる」。',
    humbleIntro: '自己去拜访对方时，多用「伺う / 参る」。',
    respectfulExampleJa: '部長はこのあと本社へいらっしゃいます。',
    respectfulExampleZh: '部长等会儿会去总公司。',
    humbleExampleJa: '明日、私が先方へ伺います。',
    humbleExampleZh: '明天我去拜访对方。',
    politeExampleJa: '明日、東京へ行きます。',
    politeExampleZh: '明天我去东京。',
  },
  {
    plain: '来る',
    respectful: 'いらっしゃる / おいでになる / お見えになる / お越しになる',
    humble: '参る',
    polite: '来ます',
    gloss: '来',
    respectfulIntro: '谈对方来访、到场时，常用「いらっしゃる / おいでになる」，较正式也常见「お見えになる / お越しになる」。',
    humbleIntro: '自己来到对方处或活动现场时，可用「参る」。',
    respectfulExampleJa: '本日、田中様がお見えになります。',
    respectfulExampleZh: '田中先生今天会到场。',
    humbleExampleJa: 'のちほど私も会場に参ります。',
    humbleExampleZh: '稍后我也会到会场。',
    politeExampleJa: '友だちは夕方に来ます。',
    politeExampleZh: '朋友傍晚会来。',
  },
  {
    plain: 'いる',
    respectful: 'いらっしゃる',
    humble: 'おる',
    polite: 'います',
    gloss: '在 / 存在',
    respectfulIntro: '描述对方“在”某地时，用「いらっしゃる」。',
    humbleIntro: '描述自己或己方“在”时，可用「おる」。',
    respectfulExampleJa: '先生は研究室にいらっしゃいます。',
    respectfulExampleZh: '老师在研究室。',
    humbleExampleJa: '私は受付におります。',
    humbleExampleZh: '我在前台。',
    politeExampleJa: '彼は今、教室にいます。',
    politeExampleZh: '他现在在教室。',
  },
  {
    plain: '言う',
    respectful: 'おっしゃる',
    humble: '申す / 申し上げる',
    polite: '言います',
    gloss: '说',
    respectfulIntro: '引用客户、老师发言时，用「おっしゃる」。',
    humbleIntro: '自己发言对外表达时，用「申す / 申し上げる」。',
    respectfulExampleJa: '先生がそうおっしゃいました。',
    respectfulExampleZh: '老师是这么说的。',
    humbleExampleJa: '私から申します。',
    humbleExampleZh: '由我来讲。',
    politeExampleJa: '後で詳しく言います。',
    politeExampleZh: '我之后会详细说明。',
  },
  {
    plain: 'する',
    respectful: 'なさる',
    humble: 'いたす',
    polite: 'します',
    gloss: '做',
    respectfulIntro: '谈对方动作时，用「なさる」。',
    humbleIntro: '谈自己动作时，用「いたす / いたします」。',
    respectfulExampleJa: '社長が最終確認なさいます。',
    respectfulExampleZh: '社长会做最终确认。',
    humbleExampleJa: '私が対応いたします。',
    humbleExampleZh: '我来处理。',
    politeExampleJa: '私が確認します。',
    politeExampleZh: '我来确认。',
  },
  {
    plain: '食べる / 飲む',
    respectful: '召し上がる',
    humble: 'いただく',
    polite: '食べます / 飲みます',
    gloss: '吃 / 喝',
    respectfulIntro: '请对方用餐、饮用时，用「召し上がる」。',
    humbleIntro: '自己受邀或受赠进食时，用「いただく」。',
    respectfulExampleJa: '先生はお茶を召し上がります。',
    respectfulExampleZh: '老师会喝茶。',
    humbleExampleJa: '私は昼食をいただきます。',
    humbleExampleZh: '我来用午餐。',
    politeExampleJa: '私は水を飲みます。',
    politeExampleZh: '我喝水。',
  },
  {
    plain: '知る',
    respectful: 'ご存じだ',
    humble: '存じる',
    polite: '知っています',
    gloss: '知道',
    respectfulIntro: '询问对方是否知道时，用「ご存じだ / ご存じですか」。',
    humbleIntro: '表达自己“知道”时，用「存じる / 存じております」。',
    respectfulExampleJa: '田中様はその件をご存じです。',
    respectfulExampleZh: '田中先生知道那件事。',
    humbleExampleJa: 'その件は存じております。',
    humbleExampleZh: '那件事我知道。',
    politeExampleJa: 'その件を知っています。',
    politeExampleZh: '我知道那件事。',
  },
  {
    plain: '思う',
    respectful: 'お思いになる',
    humble: '存じる',
    polite: '思います',
    gloss: '想 / 认为',
    respectfulIntro: '陈述对方看法时，用「お思いになる」。',
    humbleIntro: '自谦表达自己的意见时，可用「存じる / 存じます」。',
    respectfulExampleJa: '部長は難しいとお思いになります。',
    respectfulExampleZh: '部长认为这很难。',
    humbleExampleJa: '私も同じだと存じます。',
    humbleExampleZh: '我也认为是一样的。',
    politeExampleJa: '私は良いと思います。',
    politeExampleZh: '我觉得很好。',
  },
  {
    plain: 'あげる / くれる',
    respectful: 'くださる',
    humble: '差し上げる',
    polite: 'あげます / くれます',
    gloss: '给（授受）',
    respectfulIntro: '对方给我方时，用「くださる」来抬高对方的行为。',
    humbleIntro: '我方给对方时，用「差し上げる」来压低自己一方的动作。',
    respectfulExampleJa: '部長が資料をくださいます。',
    respectfulExampleZh: '部长会给我资料。',
    humbleExampleJa: '私が先生に資料を差し上げます。',
    humbleExampleZh: '我把资料给老师。',
    politeExampleJa: '私が友だちに本をあげます。',
    politeExampleZh: '我把书给朋友。',
  },
  {
    plain: 'もらう',
    respectful: 'お受け取りになる',
    humble: 'いただく',
    polite: 'もらいます',
    gloss: '得到 / 收到',
    respectfulIntro: '谈对方“收下、领取”时，可用「お受け取りになる」。',
    humbleIntro: '自己收到他人给予时，常用「いただく」。',
    respectfulExampleJa: 'お客様がお土産をお受け取りになりました。',
    respectfulExampleZh: '客户收下了伴手礼。',
    humbleExampleJa: '先生に本をいただきました。',
    humbleExampleZh: '我从老师那里收到了书。',
    politeExampleJa: '友だちに本をもらいました。',
    politeExampleZh: '我从朋友那里收到了书。',
  },
  {
    plain: '会う',
    respectful: 'お会いになる',
    humble: 'お目にかかる',
    polite: '会います',
    gloss: '见面',
    respectfulIntro: '描述对方见面会面时，用「お会いになる」。',
    humbleIntro: '自己见客户或老师时，用「お目にかかる」。',
    respectfulExampleJa: '社長はお客様にお会いになります。',
    respectfulExampleZh: '社长会见客户。',
    humbleExampleJa: '明日、先生にお目にかかります。',
    humbleExampleZh: '明天我去拜见老师。',
    politeExampleJa: '明日、友だちに会います。',
    politeExampleZh: '明天我见朋友。',
  },
  {
    plain: '聞く / 尋ねる',
    respectful: 'お聞きになる / お尋ねになる',
    humble: '伺う / お聞きする / 承る',
    polite: '聞きます / 尋ねます',
    gloss: '听 / 询问',
    respectfulIntro: '谈对方“听、询问”时，用「お聞きになる / お尋ねになる」。',
    humbleIntro: '自己向对方请教、询问时，用「伺う / お聞きする」；接受预约、委托、意见时，也常用「承る」。',
    respectfulExampleJa: '部長がお客様のご意見をお聞きになります。',
    respectfulExampleZh: '部长会听取客户的意见。',
    humbleExampleJa: '不明点は私が伺います。',
    humbleExampleZh: '有不明白的地方我来请教。',
    politeExampleJa: '受付で道を尋ねます。',
    politeExampleZh: '我在前台问路。',
  },
  {
    plain: '借りる',
    respectful: 'お借りになる',
    humble: '拝借する',
    polite: '借ります',
    gloss: '借',
    respectfulIntro: '描述对方借用某物时，可用「お借りになる」。',
    humbleIntro: '自己向上级、客户借用东西时，常用「拝借する」。',
    respectfulExampleJa: '社長がお車をお借りになります。',
    respectfulExampleZh: '社长会借用车子。',
    humbleExampleJa: '少々お時間を拝借します。',
    humbleExampleZh: '占用您一点时间。',
    politeExampleJa: '図書館で本を借ります。',
    politeExampleZh: '我在图书馆借书。',
  },
];

const RESPECTFUL_PATTERN_ROWS: RequestRow[] = [
  {
    pattern: 'お/ご～になる',
    usage: '最常见的一般尊敬句型',
    intro: '把对方动作抬高的标准做法。和语动词多接「お+ます形去ます」，汉语词多接「ご+汉语词干+になる」。',
    exampleJa: '先生は先にお帰りになりました。',
    exampleZh: '老师已经先回去了。',
  },
  {
    pattern: 'お/ご～なさる',
    usage: '「する」系动词和部分固定搭配的郑重尊敬',
    intro: '比单纯「～する」更郑重，常见于说明、連絡、案内等サ变词。',
    exampleJa: '部長がご説明なさいます。',
    exampleZh: '部长会进行说明。',
  },
  {
    pattern: 'お/ご～になれる',
    usage: '尊敬可能表达“您能……”',
    intro: '表示“对方能够……、可以……”，比直接用可能形更礼貌。',
    exampleJa: '先生は明日の会にご出席になれますか。',
    exampleZh: '老师明天能出席会议吗？',
  },
  {
    pattern: 'お/ご～ください',
    usage: '礼貌请求对方做某事',
    intro: '常见于店铺提示、现场引导、商务邮件，比直接命令更柔和正式。',
    exampleJa: '内容をご確認ください。',
    exampleZh: '请确认内容。',
  },
  {
    pattern: 'お/ご～です',
    usage: '把对方的状态或动作结果说得更郑重',
    intro: '多用于到达、外出、在宅、就座等场景，带有说明状态的语感。',
    exampleJa: '社長はただ今お出かけです。',
    exampleZh: '社长现在外出了。',
  },
  {
    pattern: '～(a)れる / られる',
    usage: '敬意较轻的尊敬说法',
    intro: '语法上像被动/可能，但在敬语里可表示尊敬。正式度通常低于固定敬语或「お/ご～になる」。',
    exampleJa: '先生はもう帰られました。',
    exampleZh: '老师已经回去了。',
  },
  {
    pattern: '～ていらっしゃる / ～ておいでになる',
    usage: '「～ている」的尊敬表达',
    intro: '描述对方正在做、持续处于某状态时很常用，口语里「～ていらっしゃる」最常见。',
    exampleJa: '部長は今、会議をしていらっしゃいます。',
    exampleZh: '部长现在正在开会。',
  },
  {
    pattern: '寝る → お休みになる',
    usage: '固定尊敬词',
    intro: '「寝る」不太用一般句型直改，实际表达里更常直接用固定说法「お休みになる」。',
    exampleJa: '社長はもうお休みになりました。',
    exampleZh: '社长已经休息了。',
  },
  {
    pattern: '着る → 召す',
    usage: '固定尊敬词',
    intro: '谈对方穿衣时，可直接用「召す」或状态说法「お召しです」。',
    exampleJa: '先生は黒いスーツをお召しです。',
    exampleZh: '老师穿着黑色西装。',
  },
];

const HUMBLE_PATTERN_ROWS: RequestRow[] = [
  {
    pattern: 'お/ご～する',
    usage: '最常见的一般自谦句型',
    intro: '表示“我来为您做……”。适合服务、说明、帮助等朝向对方的动作。',
    exampleJa: '私がお荷物をお持ちします。',
    exampleZh: '我来帮您拿行李。',
  },
  {
    pattern: 'お/ご～いたす',
    usage: '比「お/ご～する」更郑重',
    intro: '商务场合很常见，用来进一步压低自己一方的动作。',
    exampleJa: 'こちらでご案内いたします。',
    exampleZh: '这边由我来为您带路。',
  },
  {
    pattern: 'お/ご～できる',
    usage: '自谦可能表达“我能为您……”',
    intro: '强调自己有能力为对方做某事，常带服务、应对的语感。',
    exampleJa: '私がご説明できます。',
    exampleZh: '这部分我可以为您说明。',
  },
  {
    pattern: 'お/ご～いただく',
    usage: '承蒙对方做某事 / 受益表达',
    intro: '说“请对方做”或“承蒙对方做了”时非常常见，重点在自己接受了对方的行为。',
    exampleJa: '先生に原稿をご確認いただきました。',
    exampleZh: '承蒙老师确认了稿件。',
  },
  {
    pattern: 'お/ご～申し上げる',
    usage: '郑重地向对方进行说明、报告、感谢等',
    intro: '常和「報告・案内・連絡・説明・挨拶」等名词搭配，语气很郑重。',
    exampleJa: '結果をご報告申し上げます。',
    exampleZh: '谨向您汇报结果。',
  },
  {
    pattern: '～ておる',
    usage: '「～ている」的自谦/郑重说法',
    intro: '用于自己或己方状态，也常见于公司对外说明。',
    exampleJa: '担当はただ今席を外しております。',
    exampleZh: '负责人目前暂时离席。',
  },
  {
    pattern: 'ご覧いただく',
    usage: '「見てもらう」的固定谦让表达',
    intro: '不是“我看”，而是“承蒙您看/请您看”，所以更适合放在受益型自谦里记。',
    exampleJa: '資料を先にご覧いただければ幸いです。',
    exampleZh: '如果您能先过目资料就太好了。',
  },
  {
    pattern: '承る',
    usage: '「聞く / 受ける / 引き受ける」的固定谦让词',
    intro: '接电话、接预约、受理意见时很常见，商务感很强。',
    exampleJa: 'ご予約はお電話でも承っております。',
    exampleZh: '预约也可以通过电话受理。',
  },
  {
    pattern: '承知する',
    usage: '表示“知道了 / 明白了 / 接受安排”的自谦应答',
    intro: '比「分かりました」更正式，也更适合职场对上、对外回应。',
    exampleJa: '承知しました。すぐ対応いたします。',
    exampleZh: '知道了，我马上处理。',
  },
];

const POLITE_PATTERN_ROWS: RequestRow[] = [
  {
    pattern: 'ございます',
    usage: '「ある」的郑重丁宁语',
    intro: '比「あります」更郑重，店铺、通知、接待场景特别常见。',
    exampleJa: 'お席はまだございます。',
    exampleZh: '座位还有。',
  },
  {
    pattern: 'でございます',
    usage: '「です」的更郑重商务说法',
    intro: '常用于接待、广播、客服、店员说明，比「です」更正式。',
    exampleJa: 'こちらが来月の予定でございます。',
    exampleZh: '这边是下个月的安排。',
  },
];

const GIVE_ROWS: GiveRow[] = [
  {
    scene: '我 → 他人',
    plain: 'あげる',
    keigo: '差し上げる（谦）',
    intro: '当“我方把东西给对方（上级/客户）”时，用「差し上げる」更礼貌。',
    plainExampleJa: '資料を先生にあげます。',
    plainExampleZh: '我把资料给老师。',
    exampleJa: '資料を先生に差し上げます。',
    exampleZh: '我把资料交给老师。',
  },
  {
    scene: '他人 → 我/我方',
    plain: 'くれる',
    keigo: 'くださる（尊）',
    intro: '当“对方给我方”时，用「くださる」来抬高对方的行为。',
    plainExampleJa: '部長が本をくれました。',
    plainExampleZh: '部长给了我一本书。',
    exampleJa: '部長が本をくださいました。',
    exampleZh: '部长给了我一本书。',
  },
  {
    scene: '从他人得到',
    plain: 'もらう',
    keigo: 'いただく（谦）',
    intro: '当“我方从对方得到东西”时，用「いただく」表示谦逊。',
    plainExampleJa: '先輩にアドバイスをもらいました。',
    plainExampleZh: '我从前辈那里得到了建议。',
    exampleJa: '先輩にアドバイスをいただきました。',
    exampleZh: '我得到了前辈的建议。',
  },
];

const REQUEST_ROWS: RequestRow[] = [
  {
    pattern: 'ご覧ください',
    usage: '请看 / 请过目',
    intro: '是「ご覧になる」的请求形，比单纯「見てください」更正式，适合资料、公告、现场提示。',
    exampleJa: 'こちらの資料をご覧ください。',
    exampleZh: '请看这份资料。',
  },
  {
    pattern: '～をください / ～をちょうだい',
    usage: '请求对方给东西（ちょうだい较随意）',
    intro: '「ください」较正式，适用于店铺、职场、陌生场合；「ちょうだい」更口语化。',
    exampleJa: 'お水をください。',
    exampleZh: '请给我一杯水。',
  },
  {
    pattern: '～てください / ～てちょうだい',
    usage: '请求对方做某事（ちょうだい较随意）',
    intro: '用于提出动作请求；正式场景优先用「～てください」。',
    exampleJa: 'ここに名前を書いてください。',
    exampleZh: '请在这里写上名字。',
  },
  {
    pattern: 'お/ご～願う',
    usage: '书面或通知里的郑重请求',
    intro: '常见于公告、表格、邮件标题，如「ご確認願います」。语气郑重，但比会话表达更书面。',
    exampleJa: '内容のご確認願います。',
    exampleZh: '敬请确认内容。',
  },
  {
    pattern: 'お/ご～願えませんか',
    usage: '请对方做某事的委婉请求',
    intro: '比直接请求更绕一步，常见于较郑重但仍想保留距离感的场合。',
    exampleJa: 'もう一度ご説明願えませんか。',
    exampleZh: '能否请您再说明一次？',
  },
  {
    pattern: 'お/ご～いただけませんか',
    usage: '请对方做某事的高礼貌请求',
    intro: '商务和服务场景很常见，语气比「～てください」更柔和、更抬高对方。',
    exampleJa: 'こちらにご記入いただけませんか。',
    exampleZh: '能否请您在这里填写一下？',
  },
  {
    pattern: '～ていただけますか',
    usage: '请对方帮忙做某事',
    intro: '比「～てください」更客气，也带有“拜托您帮我做”的受益感。',
    exampleJa: '窓を閉めていただけますか。',
    exampleZh: '能否请您把窗户关上？',
  },
  {
    pattern: '～ていただけるとありがたいんですが',
    usage: '非常委婉地提出请求',
    intro: '把请求说成“如果能……我会很感激”，柔和度高，适合邮件、对上或对外沟通。',
    exampleJa: '明日までにご返信いただけるとありがたいんですが。',
    exampleZh: '如果您能在明天前回复就太感谢了。',
  },
  {
    pattern: '～てもよろしいでしょうか',
    usage: '请求许可“我可以……吗”',
    intro: '比「～てもいいですか」正式得多，适合向客户、老师、上级确认许可。',
    exampleJa: 'こちらで写真を撮ってもよろしいでしょうか。',
    exampleZh: '我可以在这里拍照吗？',
  },
  {
    pattern: '～させてください',
    usage: '请求许可“让我做…”',
    intro: '用于向对方申请许可，语气是“请允许我……”。',
    exampleJa: '先に失礼させてください。',
    exampleZh: '请允许我先告辞。',
  },
  {
    pattern: '（さ）せていただく',
    usage: '在获得许可或受益前提下“由我来……”',
    intro: '商务场合常见，但前提最好真有许可、照顾或受益关系，否则容易显得过度敬语。',
    exampleJa: '本日は私からご説明させていただきます。',
    exampleZh: '今天由我来向您说明。',
  },
  {
    pattern: '（さ）せていただけませんか',
    usage: '请求对方允许自己去做某事',
    intro: '比「～させてください」更委婉、更正式，常用于争取担当或发言机会。',
    exampleJa: 'その件は私に担当させていただけませんか。',
    exampleZh: '那件事能否由我来负责？',
  },
  {
    pattern: '（さ）せてやっていただけませんか',
    usage: '请求对方允许己方晚辈/第三者去做某事',
    intro: '带有“请您让他/她做一下”的语感，多用于替晚辈、孩子、下属争取机会。',
    exampleJa: 'この子にも参加させてやっていただけませんか。',
    exampleZh: '也能让这孩子参加一下吗？',
  },
  {
    pattern: '～ないでください',
    usage: '请求不要做某事',
    intro: '用于礼貌地制止对方行为，语气比命令式更柔和。',
    exampleJa: 'ここで写真を撮らないでください。',
    exampleZh: '请不要在这里拍照。',
  },
];

const NOTES: string[] = [
  '尊敬语：抬高对方的动作或状态',
  '谦让语：降低自己的动作或状态',
  '丁宁语：用礼貌形式表达',
  '第一张“核心词条”会进入练习，后面的句型表和请求表用于补规则，不混进主练习',
];

const KEIGO_PRACTICE_SIZE = 18;
const KEIGO_PRACTICE_FIELDS: KeigoPracticeField[] = ['respectful', 'humble', 'polite'];
const KEIGO_FIELD_LABEL: Record<KeigoPracticeField, string> = {
  respectful: '尊敬语',
  humble: '谦让语',
  polite: '丁宁语',
};
const KEIGO_MODE_ITEMS: Array<{ id: KeigoPracticeMode; label: string }> = [
  { id: 'plain_to_keigo', label: '原型选敬语' },
  { id: 'gloss_to_keigo', label: '释义选敬语' },
  { id: 'keigo_to_plain', label: '敬语选原型' },
  { id: 'keigo_to_gloss', label: '敬语选释义' },
];
const KEIGO_MODE_LABEL: Record<KeigoPracticeMode, string> = {
  plain_to_keigo: '原型选敬语',
  gloss_to_keigo: '释义选敬语',
  keigo_to_plain: '敬语选原型',
  keigo_to_gloss: '敬语选释义',
};
const PRACTICE_OPTION_LABELS = ['A', 'B', 'C', 'D'];

function shuffle<T>(list: T[]) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function buildKeigoPracticeSession(mode: KeigoPracticeMode): KeigoPracticeQuestion[] {
  const questions: KeigoPracticeQuestion[] = [];

  for (const row of ROWS) {
    for (const field of KEIGO_PRACTICE_FIELDS) {
      const keigo = row[field];
      const label = KEIGO_FIELD_LABEL[field];
      let answer = '';
      let pool: string[] = [];

      if (mode === 'plain_to_keigo' || mode === 'gloss_to_keigo') {
        answer = keigo;
        pool = ROWS.map((item) => item[field]);
      } else if (mode === 'keigo_to_plain') {
        answer = row.plain;
        pool = ROWS.map((item) => item.plain);
      } else {
        answer = row.gloss;
        pool = ROWS.map((item) => item.gloss);
      }

      const uniquePool = [...new Set(pool.filter((item) => item !== answer))];
      const options: string[] = [answer];

      for (const candidate of shuffle(uniquePool)) {
        if (options.length >= 4) break;
        options.push(candidate);
      }

      questions.push({
        id: `${mode}-${row.plain}-${field}`,
        plain: row.plain,
        gloss: row.gloss,
        keigo,
        field,
        label,
        answer,
        options: shuffle(options),
      });
    }
  }

  return shuffle(questions).slice(0, KEIGO_PRACTICE_SIZE);
}

function HeaderRow() {
  return (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={[styles.cell, styles.headerText]}>普通形</Text>
      <Text style={[styles.cell, styles.headerText]}>尊敬语</Text>
      <Text style={[styles.cell, styles.headerText]}>谦让语</Text>
      <Text style={[styles.cell, styles.headerText]}>丁宁语</Text>
    </View>
  );
}

type KeigoRowItemProps = KeigoRow & {
  active: boolean;
  onPress: () => void;
};

function KeigoRowItem({ plain, respectful, humble, polite, active, onPress }: KeigoRowItemProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, styles.pressableRow, active ? styles.activeRow : null, pressed ? styles.pressedRow : null]}>
      <Text style={[styles.cell, active ? styles.activeCell : null]}>{plain}</Text>
      <Text style={[styles.cell, active ? styles.activeCell : null]}>{respectful}</Text>
      <Text style={[styles.cell, active ? styles.activeCell : null]}>{humble}</Text>
      <Text style={[styles.cell, active ? styles.activeCell : null]}>{polite}</Text>
    </Pressable>
  );
}

function GiveHeaderRow() {
  return (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={[styles.cell, styles.headerText]}>场景</Text>
      <Text style={[styles.cell, styles.headerText]}>普通形</Text>
      <Text style={[styles.cell, styles.headerText]}>敬语</Text>
    </View>
  );
}

type GiveRowItemProps = GiveRow & {
  active: boolean;
  onPress: () => void;
};

function GiveExpandableRowItem({ scene, plain, keigo, active, onPress }: GiveRowItemProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, styles.pressableRow, active ? styles.activeRow : null, pressed ? styles.pressedRow : null]}>
      <Text style={[styles.cell, active ? styles.activeCell : null]}>{scene}</Text>
      <Text style={[styles.cell, active ? styles.activeCell : null]}>{plain}</Text>
      <Text style={[styles.cell, active ? styles.activeCell : null]}>{keigo}</Text>
    </Pressable>
  );
}

function RequestHeaderRow() {
  return (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={[styles.cell, styles.headerText]}>表达</Text>
      <Text style={[styles.cell, styles.headerText]}>用途</Text>
    </View>
  );
}

type RequestRowItemProps = RequestRow & {
  active: boolean;
  onPress: () => void;
};

function RequestRowItem({ pattern, usage, active, onPress }: RequestRowItemProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, styles.pressableRow, active ? styles.activeRow : null, pressed ? styles.pressedRow : null]}>
      <Text style={[styles.cell, active ? styles.activeCell : null]}>{pattern}</Text>
      <Text style={[styles.cell, active ? styles.activeCell : null]}>{usage}</Text>
    </Pressable>
  );
}

type ExpandablePatternTableProps = {
  rows: RequestRow[];
  selectedKey: string | null;
  onToggle: (key: string) => void;
};

function ExpandablePatternTable({ rows, selectedKey, onToggle }: ExpandablePatternTableProps) {
  return (
    <View style={[styles.card, styles.sectionCard]}>
      <RequestHeaderRow />
      {rows.map((row) => {
        const rowKey = row.pattern;
        const expanded = selectedKey === rowKey;
        return (
          <View key={rowKey} style={[styles.expandWrap, expanded ? styles.expandWrapActive : null]}>
            <RequestRowItem
              {...row}
              active={expanded}
              onPress={() => onToggle(rowKey)}
            />
            {expanded ? (
              <View style={styles.inlineIntroCard}>
                <Text style={styles.introDetailText}>{row.intro}</Text>
                <View style={styles.introLine}>
                  <Text style={[styles.introLabel, styles.exampleLabel]}>例</Text>
                  <Text style={styles.introValue}>{row.exampleJa}</Text>
                </View>
                <Text style={styles.exampleZh}>{row.exampleZh}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function KeigoPracticePanel() {
  const [mode, setMode] = useState<KeigoPracticeMode>('plain_to_keigo');
  const [session, setSession] = useState<KeigoPracticeQuestion[]>(() => buildKeigoPracticeSession('plain_to_keigo'));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const finished = index >= session.length;
  const current = finished ? null : session[index];
  const answered = selected !== null;
  const currentCorrect = useMemo(() => (current ? selected === current.answer : false), [current, selected]);
  const progressRatio = session.length ? (finished ? 1 : (index + 1) / session.length) : 0;
  const promptMain =
    mode === 'plain_to_keigo'
      ? current?.plain ?? ''
      : mode === 'gloss_to_keigo'
        ? current?.gloss ?? ''
        : current?.keigo ?? '';

  const resetSession = (targetMode: KeigoPracticeMode = mode) => {
    setSession(buildKeigoPracticeSession(targetMode));
    setIndex(0);
    setSelected(null);
    setCorrectCount(0);
  };

  const handleSelect = (option: string) => {
    if (!current || answered) return;
    setSelected(option);
    if (option === current.answer) {
      setCorrectCount((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (!answered) return;
    setSelected(null);
    setIndex((prev) => prev + 1);
  };

  const handleModeChange = (nextMode: KeigoPracticeMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    resetSession(nextMode);
  };

  if (finished) {
    const percent = session.length ? Math.round((correctCount / session.length) * 100) : 0;
    return (
      <View style={styles.practiceCard}>
        <View style={styles.practiceModeRow}>
          {KEIGO_MODE_ITEMS.map((item) => {
            const active = item.id === mode;
            return (
              <Pressable
                key={item.id}
                onPress={() => handleModeChange(item.id)}
                style={[styles.practiceModeChip, active ? styles.practiceModeChipActive : null]}
              >
                <Text style={[styles.practiceModeChipText, active ? styles.practiceModeChipTextActive : null]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.practiceTitle}>练习完成</Text>
        <Text style={styles.practiceResultRate}>{percent}%</Text>
        <Text style={styles.practiceSummary}>正确 {correctCount} / {session.length}</Text>
        <Text style={styles.practiceSummary}>当前题型：{KEIGO_MODE_LABEL[mode]}</Text>
        <PrimaryButton title="再来一组" onPress={resetSession} style={styles.practiceButton} />
      </View>
    );
  }

  if (!current) return null;

  return (
    <>
      <View style={[styles.practiceCard, answered ? styles.practiceCardWithResult : null]}>
        <View style={styles.practiceModeRow}>
          {KEIGO_MODE_ITEMS.map((item) => {
            const active = item.id === mode;
            return (
              <Pressable
                key={item.id}
                onPress={() => handleModeChange(item.id)}
                style={[styles.practiceModeChip, active ? styles.practiceModeChipActive : null]}
              >
                <Text style={[styles.practiceModeChipText, active ? styles.practiceModeChipTextActive : null]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.practiceHeadRow}>
          <Text style={styles.practiceProgress}>第 {index + 1} / {session.length} 题</Text>
        </View>
        <View style={styles.practiceProgressTrack}>
          <View style={[styles.practiceProgressFill, { width: `${Math.max(0, Math.min(100, Math.round(progressRatio * 100)))}%` }]} />
        </View>

        <View style={styles.practicePromptCard}>
          <View style={styles.practiceTargetRow}>
            <Text style={styles.practiceTargetLabel}>目标敬语</Text>
            <Text style={styles.practiceTargetValue}>{current.label}</Text>
          </View>
          <Text style={styles.practicePrompt}>「{promptMain}」</Text>
        </View>

        {current.options.map((option, optionIndex) => {
          const isSelected = option === selected;
          const isCorrect = option === current.answer;
          return (
            <Pressable
              key={`${current.id}-${option}`}
              onPress={() => handleSelect(option)}
              disabled={answered}
              style={({ pressed }) => [
                styles.practiceOption,
                answered && isCorrect ? styles.practiceOptionCorrect : null,
                answered && isSelected && !isCorrect ? styles.practiceOptionWrong : null,
                pressed && !answered ? styles.practiceOptionPressed : null,
              ]}
            >
              <View style={styles.practiceOptionInner}>
                <View
                  style={[
                    styles.practiceOptionBadge,
                    answered && isCorrect ? styles.practiceOptionBadgeCorrect : null,
                    answered && isSelected && !isCorrect ? styles.practiceOptionBadgeWrong : null,
                  ]}
                >
                  <Text style={styles.practiceOptionBadgeText}>{PRACTICE_OPTION_LABELS[optionIndex] ?? '?'}</Text>
                </View>
                <Text
                  style={[
                    styles.practiceOptionText,
                    answered && (isCorrect || isSelected) ? styles.practiceOptionTextStrong : null,
                  ]}
                >
                  {option}
                </Text>
                {answered && isCorrect ? <Text style={styles.practiceOptionMark}>正确</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {answered ? (
        <View style={styles.practiceResultBox}>
          {currentCorrect ? (
            <Text style={[styles.practiceFeedback, styles.practiceFeedbackOk]}>回答正确</Text>
          ) : (
            <>
              <Text style={[styles.practiceFeedback, styles.practiceFeedbackNg]}>回答错误，正确答案：</Text>
              <Text style={styles.practiceFeedbackAnswer}>{current.answer}</Text>
            </>
          )}
          <PrimaryButton title={index === session.length - 1 ? '查看结果' : '下一题'} onPress={handleNext} style={styles.practiceButton} />
        </View>
      ) : null}
    </>
  );
}

export default function KeigoChartScreen() {
  const topPadding = useScreenTopPadding();
  const [showPractice, setShowPractice] = useState(false);
  const [selectedPlain, setSelectedPlain] = useState<string | null>(null);
  const [selectedRespectfulPatternKey, setSelectedRespectfulPatternKey] = useState<string | null>(null);
  const [selectedHumblePatternKey, setSelectedHumblePatternKey] = useState<string | null>(null);
  const [selectedPolitePatternKey, setSelectedPolitePatternKey] = useState<string | null>(null);
  const [selectedGiveKey, setSelectedGiveKey] = useState<string | null>(null);
  const [selectedRequestKey, setSelectedRequestKey] = useState<string | null>(null);
  const handleToggleRow = (plain: string) => setSelectedPlain((value) => (value === plain ? null : plain));
  const handleToggleRespectfulPattern = (key: string) => setSelectedRespectfulPatternKey((value) => (value === key ? null : key));
  const handleToggleHumblePattern = (key: string) => setSelectedHumblePatternKey((value) => (value === key ? null : key));
  const handleTogglePolitePattern = (key: string) => setSelectedPolitePatternKey((value) => (value === key ? null : key));
  const handleToggleGive = (key: string) => setSelectedGiveKey((value) => (value === key ? null : key));
  const handleToggleRequest = (key: string) => setSelectedRequestKey((value) => (value === key ? null : key));

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: topPadding }]}>
      <View style={styles.pageHeaderRow}>
        <Text style={styles.pageTitle}>敬语表</Text>
        <Pressable
          onPress={() => setShowPractice((prev) => !prev)}
          style={({ pressed }) => [styles.pageActionBtn, pressed ? styles.pageActionBtnPressed : null]}
        >
          <Text style={styles.pageActionText}>{showPractice ? '返回表格' : '开始练习'}</Text>
        </Pressable>
      </View>

      {showPractice ? (
        <KeigoPracticePanel />
      ) : (
        <>
          <Text style={styles.sectionTitle}>核心词条</Text>
          <View style={styles.card}>
            <HeaderRow />
            {ROWS.map((row) => {
              const expanded = selectedPlain === row.plain;
              return (
                <View key={row.plain} style={[styles.expandWrap, expanded ? styles.expandWrapActive : null]}>
                  <KeigoRowItem
                    {...row}
                    active={expanded}
                    onPress={() => handleToggleRow(row.plain)}
                  />
                  {expanded ? (
                    <View style={styles.inlineIntroCard}>
                      <View style={styles.introGlossRow}>
                        <Text style={styles.introGlossTag}>释义</Text>
                        <Text style={styles.introGloss}>{row.gloss}</Text>
                      </View>
                      <View style={styles.introLine}>
                        <Text style={[styles.introLabel, styles.respectfulLabel]}>尊</Text>
                        <Text style={styles.introValue}>{row.respectfulIntro}</Text>
                      </View>
                      <View style={styles.introLine}>
                        <Text style={[styles.introLabel, styles.humbleLabel]}>谦</Text>
                        <Text style={styles.introValue}>{row.humbleIntro}</Text>
                      </View>
                      <View style={styles.exampleSection}>
                        <Text style={styles.introExamplesTitle}>例句</Text>
                        <View style={[styles.introLine, styles.exampleFirstLineGap]}>
                          <Text style={[styles.introLabel, styles.exampleTypeLabel]}>尊例</Text>
                          <Text style={styles.introValue}>{row.respectfulExampleJa}</Text>
                        </View>
                        <Text style={[styles.exampleZh, styles.exampleZhAligned, styles.exampleZhToNext]}>{row.respectfulExampleZh}</Text>
                        <View style={styles.introLine}>
                          <Text style={[styles.introLabel, styles.exampleTypeLabel]}>谦例</Text>
                          <Text style={styles.introValue}>{row.humbleExampleJa}</Text>
                        </View>
                        <Text style={[styles.exampleZh, styles.exampleZhAligned, styles.exampleZhToNext]}>{row.humbleExampleZh}</Text>
                        <View style={styles.introLine}>
                          <Text style={[styles.introLabel, styles.exampleTypeLabel]}>丁例</Text>
                          <Text style={styles.introValue}>{row.politeExampleJa}</Text>
                        </View>
                        <Text style={[styles.exampleZh, styles.exampleZhAligned]}>{row.politeExampleZh}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>尊敬语句型</Text>
          <ExpandablePatternTable
            rows={RESPECTFUL_PATTERN_ROWS}
            selectedKey={selectedRespectfulPatternKey}
            onToggle={handleToggleRespectfulPattern}
          />

          <Text style={styles.sectionTitle}>谦让语句型</Text>
          <ExpandablePatternTable
            rows={HUMBLE_PATTERN_ROWS}
            selectedKey={selectedHumblePatternKey}
            onToggle={handleToggleHumblePattern}
          />

          <Text style={styles.sectionTitle}>丁宁语补充</Text>
          <ExpandablePatternTable
            rows={POLITE_PATTERN_ROWS}
            selectedKey={selectedPolitePatternKey}
            onToggle={handleTogglePolitePattern}
          />

          <Text style={styles.sectionTitle}>授受表达</Text>
          <View style={[styles.card, styles.sectionCard]}>
            <GiveHeaderRow />
            {GIVE_ROWS.map((row) => {
              const rowKey = `${row.scene}-${row.plain}`;
              const expanded = selectedGiveKey === rowKey;
              return (
                <View key={rowKey} style={[styles.expandWrap, expanded ? styles.expandWrapActive : null]}>
                  <GiveExpandableRowItem
                    {...row}
                    active={expanded}
                    onPress={() => handleToggleGive(rowKey)}
                  />
                  {expanded ? (
                    <View style={styles.inlineIntroCard}>
                      <Text style={styles.introDetailText}>{row.intro}</Text>
                      <View style={styles.introLine}>
                        <Text style={[styles.introLabel, styles.exampleLabel]}>普</Text>
                        <Text style={styles.introValue}>{row.plainExampleJa}</Text>
                      </View>
                      <Text style={styles.exampleZh}>{row.plainExampleZh}</Text>
                      <View style={[styles.introLine, styles.exampleGroupGap]}>
                        <Text style={[styles.introLabel, styles.exampleLabel]}>敬</Text>
                        <Text style={styles.introValue}>{row.exampleJa}</Text>
                      </View>
                      <Text style={styles.exampleZh}>{row.exampleZh}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>请求表达</Text>
          <ExpandablePatternTable
            rows={REQUEST_ROWS}
            selectedKey={selectedRequestKey}
            onToggle={handleToggleRequest}
          />

          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>使用提示</Text>
            {NOTES.map((note) => (
              <Text key={note} style={styles.noteText}>
                {note}
              </Text>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.m,
    paddingBottom: spacing.l,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.s,
  },
  pageActionBtn: {
    borderWidth: 1,
    borderColor: '#bae6fd',
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    paddingHorizontal: spacing.s,
    paddingVertical: 6,
  },
  pageActionBtnPressed: {
    opacity: 0.8,
  },
  pageActionText: {
    color: '#0369a1',
    fontWeight: '700',
    fontSize: 12,
  },
  sectionTitle: {
    marginTop: spacing.m,
    marginBottom: spacing.s,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sectionSubtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.l,
    color: colors.muted,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionCard: {
    marginBottom: spacing.m,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  pressableRow: {
    borderRadius: radius.s,
    paddingHorizontal: spacing.xs,
  },
  activeRow: {
    backgroundColor: '#eef5ff',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomColor: '#c7dbf9',
  },
  pressedRow: {
    opacity: 0.92,
  },
  headerRow: {
    backgroundColor: '#f8fafc',
    borderRadius: radius.s,
    borderBottomWidth: 0,
    marginBottom: spacing.s,
    paddingHorizontal: spacing.xs,
  },
  headerText: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: 12,
  },
  cell: {
    flex: 1,
    color: colors.text,
    fontWeight: '600',
    fontSize: 12,
    paddingHorizontal: spacing.xs,
  },
  activeCell: {
    color: '#2f558f',
    fontWeight: '700',
  },
  expandWrap: {
    backgroundColor: colors.card,
  },
  expandWrapActive: {
    borderWidth: 1,
    borderColor: '#c7dbf9',
    borderRadius: radius.s,
    marginBottom: spacing.xs,
    backgroundColor: '#eef5ff',
  },
  inlineIntroCard: {
    backgroundColor: '#f3f8ff',
    borderBottomLeftRadius: radius.s,
    borderBottomRightRadius: radius.s,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
  },
  introGloss: {
    color: '#264f8a',
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 18,
    marginLeft: spacing.xs,
  },
  introGlossRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    marginBottom: spacing.m,
  },
  introGlossTag: {
    color: '#355a8f',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    backgroundColor: '#dbe9ff',
    borderColor: '#b8cff3',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 1,
    marginRight: spacing.xs,
  },
  introLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  exampleGroupGap: {
    marginTop: spacing.s,
  },
  introDetailText: {
    color: '#3f4f63',
    lineHeight: 20,
    marginBottom: spacing.s,
  },
  exampleSection: {
    marginTop: spacing.s,
    paddingTop: spacing.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#c7d8ef',
  },
  exampleFirstLineGap: {
    marginTop: spacing.xs,
  },
  introExamplesTitle: {
    alignSelf: 'flex-start',
    color: '#4b5d78',
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.3,
    backgroundColor: '#e2e8f4',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 0,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  introValue: {
    flex: 1,
    color: '#3f4f63',
    lineHeight: 20,
  },
  introLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginRight: spacing.xs,
    marginTop: 2.2,
    overflow: 'hidden',
  },
  respectfulLabel: {
    backgroundColor: '#6f8fbe',
  },
  humbleLabel: {
    backgroundColor: '#7a93b3',
  },
  politeLabel: {
    backgroundColor: '#6f9db8',
  },
  exampleTypeLabel: {
    backgroundColor: '#5f789b',
  },
  exampleLabel: {
    backgroundColor: '#7f93af',
  },
  exampleZhAligned: {
    marginLeft: 34 + spacing.xs,
  },
  exampleZhToNext: {
    marginBottom: spacing.s,
  },
  exampleZh: {
    marginLeft: 28,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  practiceCard: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  practiceCardWithResult: {
    marginBottom: 0,
  },
  practiceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  practiceResultRate: {
    marginTop: spacing.s,
    color: colors.primaryDark,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  practiceSummary: {
    marginTop: spacing.xs,
    color: colors.muted,
  },
  practiceModeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xs,
    gap: 4,
  },
  practiceModeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.xs,
    paddingVertical: 5,
    backgroundColor: '#fff',
  },
  practiceModeChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  practiceModeChipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  practiceModeChipTextActive: {
    color: colors.primary,
  },
  practiceHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  practiceProgress: {
    color: colors.muted,
    fontWeight: '600',
  },
  practiceProgressTrack: {
    marginTop: spacing.s,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#e5edf8',
    overflow: 'hidden',
  },
  practiceProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#3b82f6',
  },
  practicePromptCard: {
    marginTop: spacing.s,
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: radius.m,
    backgroundColor: '#f8fbff',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
  },
  practiceTargetRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: radius.s,
    overflow: 'hidden',
    marginBottom: spacing.s,
  },
  practiceTargetLabel: {
    color: '#1e3a8a',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    backgroundColor: '#dbeafe',
  },
  practiceTargetValue: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
  },
  practicePrompt: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  practiceOption: {
    marginTop: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    backgroundColor: '#fff',
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.s,
  },
  practiceOptionPressed: {
    opacity: 0.85,
  },
  practiceOptionInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  practiceOptionBadge: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#eef2f7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.s,
  },
  practiceOptionBadgeCorrect: {
    backgroundColor: '#dcfce7',
  },
  practiceOptionBadgeWrong: {
    backgroundColor: '#fee2e2',
  },
  practiceOptionBadgeText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 12,
  },
  practiceOptionCorrect: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  practiceOptionWrong: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  practiceOptionText: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
  },
  practiceOptionTextStrong: {
    fontWeight: '700',
  },
  practiceOptionMark: {
    marginLeft: spacing.s,
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  practiceFeedback: {
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 22,
  },
  practiceFeedbackOk: {
    color: colors.success,
  },
  practiceFeedbackNg: {
    color: colors.danger,
  },
  practiceFeedbackAnswer: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400',
  },
  practiceButton: {
    marginTop: spacing.m,
  },
  practiceResultBox: {
    marginTop: spacing.m,
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.m,
  },
  noteCard: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.m,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.s,
  },
  noteText: {
    color: colors.muted,
    marginBottom: spacing.xs,
  },
});
