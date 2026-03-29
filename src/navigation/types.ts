export type RootStackParamList = {
  Landing:     undefined;
  ChapterList: undefined;
  VerseList: {
    chapterId:     string;
    chapterNumber: number;
    chapterTitle:  string;
  };
  VerseDetail: {
    verseId:      string;
    chapterId:    string;
    chapterTitle: string;
    verseNumber:  number;
    totalVerses:  number;
  };
  Commentary: {
    verseId:       string;
    chapterNumber: number;
    verseNumber:   number;
  };
};