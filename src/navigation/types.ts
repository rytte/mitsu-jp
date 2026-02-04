import { Level } from '../types';

export type LearnStackParamList = {
  LevelSelect: undefined;
  StageList: { level: Level };
  StageWords: { stageId: string; level: Level; stageIndex: number };
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

