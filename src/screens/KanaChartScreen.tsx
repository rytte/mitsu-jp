import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme';

type KanaCell = { kana: string; romaji: string };

const VOWELS = ['a', 'i', 'u', 'e', 'o'];
const Y_VOWELS = ['ya', 'yu', 'yo'];

const HIRAGANA_ROWS: Array<Array<KanaCell | null>> = [
  [
    { kana: 'あ', romaji: 'a' },
    { kana: 'い', romaji: 'i' },
    { kana: 'う', romaji: 'u' },
    { kana: 'え', romaji: 'e' },
    { kana: 'お', romaji: 'o' },
  ],
  [
    { kana: 'か', romaji: 'ka' },
    { kana: 'き', romaji: 'ki' },
    { kana: 'く', romaji: 'ku' },
    { kana: 'け', romaji: 'ke' },
    { kana: 'こ', romaji: 'ko' },
  ],
  [
    { kana: 'さ', romaji: 'sa' },
    { kana: 'し', romaji: 'shi' },
    { kana: 'す', romaji: 'su' },
    { kana: 'せ', romaji: 'se' },
    { kana: 'そ', romaji: 'so' },
  ],
  [
    { kana: 'た', romaji: 'ta' },
    { kana: 'ち', romaji: 'chi' },
    { kana: 'つ', romaji: 'tsu' },
    { kana: 'て', romaji: 'te' },
    { kana: 'と', romaji: 'to' },
  ],
  [
    { kana: 'な', romaji: 'na' },
    { kana: 'に', romaji: 'ni' },
    { kana: 'ぬ', romaji: 'nu' },
    { kana: 'ね', romaji: 'ne' },
    { kana: 'の', romaji: 'no' },
  ],
  [
    { kana: 'は', romaji: 'ha' },
    { kana: 'ひ', romaji: 'hi' },
    { kana: 'ふ', romaji: 'fu' },
    { kana: 'へ', romaji: 'he' },
    { kana: 'ほ', romaji: 'ho' },
  ],
  [
    { kana: 'ま', romaji: 'ma' },
    { kana: 'み', romaji: 'mi' },
    { kana: 'む', romaji: 'mu' },
    { kana: 'め', romaji: 'me' },
    { kana: 'も', romaji: 'mo' },
  ],
  [{ kana: 'や', romaji: 'ya' }, null, { kana: 'ゆ', romaji: 'yu' }, null, { kana: 'よ', romaji: 'yo' }],
  [
    { kana: 'ら', romaji: 'ra' },
    { kana: 'り', romaji: 'ri' },
    { kana: 'る', romaji: 'ru' },
    { kana: 'れ', romaji: 're' },
    { kana: 'ろ', romaji: 'ro' },
  ],
  [{ kana: 'わ', romaji: 'wa' }, null, null, null, { kana: 'を', romaji: 'wo' }],
  [{ kana: 'ん', romaji: 'n' }, null, null, null, null],
];

const KATAKANA_ROWS: Array<Array<KanaCell | null>> = [
  [
    { kana: 'ア', romaji: 'a' },
    { kana: 'イ', romaji: 'i' },
    { kana: 'ウ', romaji: 'u' },
    { kana: 'エ', romaji: 'e' },
    { kana: 'オ', romaji: 'o' },
  ],
  [
    { kana: 'カ', romaji: 'ka' },
    { kana: 'キ', romaji: 'ki' },
    { kana: 'ク', romaji: 'ku' },
    { kana: 'ケ', romaji: 'ke' },
    { kana: 'コ', romaji: 'ko' },
  ],
  [
    { kana: 'サ', romaji: 'sa' },
    { kana: 'シ', romaji: 'shi' },
    { kana: 'ス', romaji: 'su' },
    { kana: 'セ', romaji: 'se' },
    { kana: 'ソ', romaji: 'so' },
  ],
  [
    { kana: 'タ', romaji: 'ta' },
    { kana: 'チ', romaji: 'chi' },
    { kana: 'ツ', romaji: 'tsu' },
    { kana: 'テ', romaji: 'te' },
    { kana: 'ト', romaji: 'to' },
  ],
  [
    { kana: 'ナ', romaji: 'na' },
    { kana: 'ニ', romaji: 'ni' },
    { kana: 'ヌ', romaji: 'nu' },
    { kana: 'ネ', romaji: 'ne' },
    { kana: 'ノ', romaji: 'no' },
  ],
  [
    { kana: 'ハ', romaji: 'ha' },
    { kana: 'ヒ', romaji: 'hi' },
    { kana: 'フ', romaji: 'fu' },
    { kana: 'ヘ', romaji: 'he' },
    { kana: 'ホ', romaji: 'ho' },
  ],
  [
    { kana: 'マ', romaji: 'ma' },
    { kana: 'ミ', romaji: 'mi' },
    { kana: 'ム', romaji: 'mu' },
    { kana: 'メ', romaji: 'me' },
    { kana: 'モ', romaji: 'mo' },
  ],
  [{ kana: 'ヤ', romaji: 'ya' }, null, { kana: 'ユ', romaji: 'yu' }, null, { kana: 'ヨ', romaji: 'yo' }],
  [
    { kana: 'ラ', romaji: 'ra' },
    { kana: 'リ', romaji: 'ri' },
    { kana: 'ル', romaji: 'ru' },
    { kana: 'レ', romaji: 're' },
    { kana: 'ロ', romaji: 'ro' },
  ],
  [{ kana: 'ワ', romaji: 'wa' }, null, null, null, { kana: 'ヲ', romaji: 'wo' }],
  [{ kana: 'ン', romaji: 'n' }, null, null, null, null],
];

const HIRAGANA_DAKUTEN_ROWS: Array<Array<KanaCell | null>> = [
  [
    { kana: 'が', romaji: 'ga' },
    { kana: 'ぎ', romaji: 'gi' },
    { kana: 'ぐ', romaji: 'gu' },
    { kana: 'げ', romaji: 'ge' },
    { kana: 'ご', romaji: 'go' },
  ],
  [
    { kana: 'ざ', romaji: 'za' },
    { kana: 'じ', romaji: 'ji' },
    { kana: 'ず', romaji: 'zu' },
    { kana: 'ぜ', romaji: 'ze' },
    { kana: 'ぞ', romaji: 'zo' },
  ],
  [
    { kana: 'だ', romaji: 'da' },
    { kana: 'ぢ', romaji: 'ji' },
    { kana: 'づ', romaji: 'zu' },
    { kana: 'で', romaji: 'de' },
    { kana: 'ど', romaji: 'do' },
  ],
  [
    { kana: 'ば', romaji: 'ba' },
    { kana: 'び', romaji: 'bi' },
    { kana: 'ぶ', romaji: 'bu' },
    { kana: 'べ', romaji: 'be' },
    { kana: 'ぼ', romaji: 'bo' },
  ],
];

const HIRAGANA_HANDAKUTEN_ROWS: Array<Array<KanaCell | null>> = [
  [
    { kana: 'ぱ', romaji: 'pa' },
    { kana: 'ぴ', romaji: 'pi' },
    { kana: 'ぷ', romaji: 'pu' },
    { kana: 'ぺ', romaji: 'pe' },
    { kana: 'ぽ', romaji: 'po' },
  ],
];

const KATAKANA_DAKUTEN_ROWS: Array<Array<KanaCell | null>> = [
  [
    { kana: 'ガ', romaji: 'ga' },
    { kana: 'ギ', romaji: 'gi' },
    { kana: 'グ', romaji: 'gu' },
    { kana: 'ゲ', romaji: 'ge' },
    { kana: 'ゴ', romaji: 'go' },
  ],
  [
    { kana: 'ザ', romaji: 'za' },
    { kana: 'ジ', romaji: 'ji' },
    { kana: 'ズ', romaji: 'zu' },
    { kana: 'ゼ', romaji: 'ze' },
    { kana: 'ゾ', romaji: 'zo' },
  ],
  [
    { kana: 'ダ', romaji: 'da' },
    { kana: 'ヂ', romaji: 'ji' },
    { kana: 'ヅ', romaji: 'zu' },
    { kana: 'デ', romaji: 'de' },
    { kana: 'ド', romaji: 'do' },
  ],
  [
    { kana: 'バ', romaji: 'ba' },
    { kana: 'ビ', romaji: 'bi' },
    { kana: 'ブ', romaji: 'bu' },
    { kana: 'ベ', romaji: 'be' },
    { kana: 'ボ', romaji: 'bo' },
  ],
];

const KATAKANA_HANDAKUTEN_ROWS: Array<Array<KanaCell | null>> = [
  [
    { kana: 'パ', romaji: 'pa' },
    { kana: 'ピ', romaji: 'pi' },
    { kana: 'プ', romaji: 'pu' },
    { kana: 'ペ', romaji: 'pe' },
    { kana: 'ポ', romaji: 'po' },
  ],
];

const HIRAGANA_YOON_ROWS: Array<Array<KanaCell | null>> = [
  [
    { kana: 'きゃ', romaji: 'kya' },
    { kana: 'きゅ', romaji: 'kyu' },
    { kana: 'きょ', romaji: 'kyo' },
  ],
  [
    { kana: 'ぎゃ', romaji: 'gya' },
    { kana: 'ぎゅ', romaji: 'gyu' },
    { kana: 'ぎょ', romaji: 'gyo' },
  ],
  [
    { kana: 'しゃ', romaji: 'sha' },
    { kana: 'しゅ', romaji: 'shu' },
    { kana: 'しょ', romaji: 'sho' },
  ],
  [
    { kana: 'じゃ', romaji: 'ja' },
    { kana: 'じゅ', romaji: 'ju' },
    { kana: 'じょ', romaji: 'jo' },
  ],
  [
    { kana: 'ちゃ', romaji: 'cha' },
    { kana: 'ちゅ', romaji: 'chu' },
    { kana: 'ちょ', romaji: 'cho' },
  ],
  [
    { kana: 'ぢゃ', romaji: 'dya' },
    { kana: 'ぢゅ', romaji: 'dyu' },
    { kana: 'ぢょ', romaji: 'dyo' },
  ],
  [
    { kana: 'にゃ', romaji: 'nya' },
    { kana: 'にゅ', romaji: 'nyu' },
    { kana: 'にょ', romaji: 'nyo' },
  ],
  [
    { kana: 'ひゃ', romaji: 'hya' },
    { kana: 'ひゅ', romaji: 'hyu' },
    { kana: 'ひょ', romaji: 'hyo' },
  ],
  [
    { kana: 'びゃ', romaji: 'bya' },
    { kana: 'びゅ', romaji: 'byu' },
    { kana: 'びょ', romaji: 'byo' },
  ],
  [
    { kana: 'ぴゃ', romaji: 'pya' },
    { kana: 'ぴゅ', romaji: 'pyu' },
    { kana: 'ぴょ', romaji: 'pyo' },
  ],
  [
    { kana: 'みゃ', romaji: 'mya' },
    { kana: 'みゅ', romaji: 'myu' },
    { kana: 'みょ', romaji: 'myo' },
  ],
  [
    { kana: 'りゃ', romaji: 'rya' },
    { kana: 'りゅ', romaji: 'ryu' },
    { kana: 'りょ', romaji: 'ryo' },
  ],
];

const KATAKANA_YOON_ROWS: Array<Array<KanaCell | null>> = [
  [
    { kana: 'キャ', romaji: 'kya' },
    { kana: 'キュ', romaji: 'kyu' },
    { kana: 'キョ', romaji: 'kyo' },
  ],
  [
    { kana: 'ギャ', romaji: 'gya' },
    { kana: 'ギュ', romaji: 'gyu' },
    { kana: 'ギョ', romaji: 'gyo' },
  ],
  [
    { kana: 'シャ', romaji: 'sha' },
    { kana: 'シュ', romaji: 'shu' },
    { kana: 'ショ', romaji: 'sho' },
  ],
  [
    { kana: 'ジャ', romaji: 'ja' },
    { kana: 'ジュ', romaji: 'ju' },
    { kana: 'ジョ', romaji: 'jo' },
  ],
  [
    { kana: 'チャ', romaji: 'cha' },
    { kana: 'チュ', romaji: 'chu' },
    { kana: 'チョ', romaji: 'cho' },
  ],
  [
    { kana: 'ヂャ', romaji: 'dya' },
    { kana: 'ヂュ', romaji: 'dyu' },
    { kana: 'ヂョ', romaji: 'dyo' },
  ],
  [
    { kana: 'ニャ', romaji: 'nya' },
    { kana: 'ニュ', romaji: 'nyu' },
    { kana: 'ニョ', romaji: 'nyo' },
  ],
  [
    { kana: 'ヒャ', romaji: 'hya' },
    { kana: 'ヒュ', romaji: 'hyu' },
    { kana: 'ヒョ', romaji: 'hyo' },
  ],
  [
    { kana: 'ビャ', romaji: 'bya' },
    { kana: 'ビュ', romaji: 'byu' },
    { kana: 'ビョ', romaji: 'byo' },
  ],
  [
    { kana: 'ピャ', romaji: 'pya' },
    { kana: 'ピュ', romaji: 'pyu' },
    { kana: 'ピョ', romaji: 'pyo' },
  ],
  [
    { kana: 'ミャ', romaji: 'mya' },
    { kana: 'ミュ', romaji: 'myu' },
    { kana: 'ミョ', romaji: 'myo' },
  ],
  [
    { kana: 'リャ', romaji: 'rya' },
    { kana: 'リュ', romaji: 'ryu' },
    { kana: 'リョ', romaji: 'ryo' },
  ],
];

function KanaTable({
  title,
  rows,
  headers = VOWELS,
}: {
  title: string;
  rows: Array<Array<KanaCell | null>>;
  headers?: string[];
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.headerRow}>
        {headers.map((vowel) => (
          <View key={vowel} style={styles.headerCell}>
            <Text style={styles.headerText}>{vowel}</Text>
          </View>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((cell, cellIndex) => (
            <View
              key={`cell-${rowIndex}-${cellIndex}`}
              style={[
                styles.cell,
                cellIndex === row.length - 1 ? styles.cellLast : null,
                cell ? null : styles.cellEmpty,
              ]}
            >
              {cell ? (
                <>
                  <Text style={styles.kana}>{cell.kana}</Text>
                  <Text style={styles.romaji}>{cell.romaji}</Text>
                </>
              ) : (
                <Text style={styles.kanaPlaceholder}>·</Text>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export default function KanaChartScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.m }]}>
      <Text style={styles.pageTitle}>五十音图</Text>
      <Text style={styles.pageSubtitle}>基础清音（平假名 / 片假名）</Text>
      <KanaTable title="平假名" rows={HIRAGANA_ROWS} />
      <KanaTable title="片假名" rows={KATAKANA_ROWS} />

      <Text style={styles.sectionTitle}>浊音 / 半浊音</Text>
      <Text style={styles.sectionSubtitle}>が〜 / ぱ〜 等变化</Text>
      <KanaTable title="平假名・浊音" rows={HIRAGANA_DAKUTEN_ROWS} />
      <KanaTable title="平假名・半浊音" rows={HIRAGANA_HANDAKUTEN_ROWS} />
      <KanaTable title="片假名・浊音" rows={KATAKANA_DAKUTEN_ROWS} />
      <KanaTable title="片假名・半浊音" rows={KATAKANA_HANDAKUTEN_ROWS} />

      <Text style={styles.sectionTitle}>拗音（小ゃ / ゅ / ょ）</Text>
      <Text style={styles.sectionSubtitle}>きゃ / きゅ / きょ 等组合</Text>
      <KanaTable title="平假名・拗音" rows={HIRAGANA_YOON_ROWS} headers={Y_VOWELS} />
      <KanaTable title="片假名・拗音" rows={KATAKANA_YOON_ROWS} headers={Y_VOWELS} />
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
  pageSubtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.m,
    color: colors.muted,
  },
  sectionTitle: {
    marginTop: spacing.s,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sectionSubtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.m,
    color: colors.muted,
    fontSize: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.m,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.s,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: spacing.s,
    backgroundColor: '#f1f5f9',
    borderRadius: radius.s,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    marginBottom: spacing.s,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.s,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.s / 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cellLast: {
    marginRight: 0,
  },
  cellEmpty: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    shadowOpacity: 0,
    elevation: 0,
  },
  kana: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  romaji: {
    marginTop: 2,
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  kanaPlaceholder: {
    fontSize: 12,
    color: colors.border,
  },
});
