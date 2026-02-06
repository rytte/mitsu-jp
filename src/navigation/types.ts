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
};

export type RootTabParamList = {
  Learn: undefined;
  Grammar: undefined;
  Mistakes: undefined;
  Settings: undefined;
};

