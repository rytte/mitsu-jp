import { Level } from '../types';

export type LearnStackParamList = {
  LevelSelect: { skipAuto?: boolean } | undefined;
  ZoneList: { level: Level };
  StageList: { level: Level; zoneIndex: number };
  StageWords: { stageId: string; level: Level; stageIndex: number };
  ZoneWords: {
    level: Level;
    zoneIndex: number;
    startIndex: number;
    endIndex: number;
    wordIds: string[];
    wordStageMap: Record<string, number>;
  };
  Quiz: { stageId: string; level: Level; stageIndex: number };
  Result: {
    stageId: string;
    level: Level;
    stageIndex: number;
    correct: number;
    wrong: number;
  };
};

export type GrammarStackParamList = {
  GrammarLevel: undefined;
  GrammarList: { level: Level };
  GrammarDetail: { level: Level; id: string };
  GrammarQuiz: { level: Level };
};

export type RootTabParamList = {
  Learn: undefined;
  Grammar: undefined;
  Search: undefined;
  Mistakes: undefined;
  VocabBook: undefined;
  KanaChart: undefined;
  VerbConjugation: undefined;
  KeigoChart: undefined;
  Settings: undefined;
  My: undefined;
};

export type MyStackParamList = {
  MyHome: undefined;
  Search: undefined;
  Mistakes: undefined;
  KanaChart: undefined;
  VerbConjugation: undefined;
  KeigoChart: undefined;
  VocabBook: undefined;
  Settings: undefined;
};

