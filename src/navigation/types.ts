import { Level } from '../types';

export type LearnStackParamList = {
  LevelSelect: { skipAuto?: boolean } | undefined;
  StageList: { level: Level };
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

export type RootTabParamList = {
  Learn: undefined;
  Mistakes: undefined;
  Settings: undefined;
};

