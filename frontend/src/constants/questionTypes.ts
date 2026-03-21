// 问卷题型 type 编码规范（前端 TypeScript 枚举与映射）

export enum QuestionType {
  FillBlank = 1,        // 填空题
  ShortAnswer = 2,      // 简答题
  SingleChoice = 3,     // 单选题
  MultipleChoice = 4,   // 多选题
  Scale = 5,            // 量表题
  Matrix = 6,           // 矩阵题
  Dropdown = 7,         // 下拉题
  Slider = 8,           // 滑动条题
  MultiFillBlank = 9,   // 多项填空题
  MatrixFillBlank = 10, // 矩阵填空
  Sort = 11,            // 排序题
  Ratio = 12,           // 比重题
  FileUpload = 13       // 文件上传题
}

export const QuestionTypeLabel: Record<QuestionType, string> = {
  [QuestionType.FillBlank]: '填空题',
  [QuestionType.ShortAnswer]: '简答题',
  [QuestionType.SingleChoice]: '单选题',
  [QuestionType.MultipleChoice]: '多选题',
  [QuestionType.Scale]: '量表题',
  [QuestionType.Matrix]: '矩阵题',
  [QuestionType.Dropdown]: '下拉题',
  [QuestionType.Slider]: '滑动条题',
  [QuestionType.MultiFillBlank]: '多项填空题',
  [QuestionType.MatrixFillBlank]: '矩阵填空',
  [QuestionType.Sort]: '排序题',
  [QuestionType.Ratio]: '比重题',
  [QuestionType.FileUpload]: '文件上传题'
};

// 用法示例：
// QuestionType.SingleChoice === 3
// QuestionTypeLabel[QuestionType.SingleChoice] === '单选题'
