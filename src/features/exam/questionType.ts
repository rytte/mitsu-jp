import { ExamQuestionType } from '../../types';

type QuestionTypeInfo = {
  label: string;
  tip: string;
};

const INFO_MAP: Record<ExamQuestionType, QuestionTypeInfo> = {
  reorder_fill: {
    label: '排序填空',
    tip: '先把4个选项代入句子，当前作答位置是★。',
  },
  single_blank_fill: {
    label: '单选填空',
    tip: '从4个选项中选择最合适的一项填入空格。',
  },
  kana_kanji_conversion: {
    label: '汉字/假名转换',
    tip: '根据【xxx】标记，选择对应读法或写法。',
  },
};

export function getQuestionTypeInfo(type?: ExamQuestionType): QuestionTypeInfo {
  if (!type) return INFO_MAP.single_blank_fill;
  return INFO_MAP[type] ?? INFO_MAP.single_blank_fill;
}

export function getReorderFillTip(hasTargetSlot: boolean) {
  if (hasTargetSlot) {
    return '先把4个选项代入句子，当前作答位置是★。';
  }
  return '这是多空排序/搭配题，先判断语法和搭配关系，再选择最合适答案。';
}
