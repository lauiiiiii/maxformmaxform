<template>
              <!-- 问卷头部信息 -->
              <div class="survey-header-editor" @click="closeQuestionEdit">
                <div class="title-editor">
                  <input 
                    v-model="surveyForm.title" 
                    data-testid="editor-survey-title-input"
                    class="survey-title-input" 
                    placeholder="标题" 
                    @input="validateForm"
                    @click.stop
                  />
                  <div v-if="errors.title" class="error-tip">{{ errors.title }}</div>
                </div>
                
                <!-- 问卷说明：使用 Quill 浮动工具栏富文本组件 -->
                <div class="survey-desc-inline">
                  <QuillFloatingEditor
                    v-model="surveyForm.description"
                    placeholder="添加问卷说明"
                    :floating="true"
                    :auto-hide="true"
                    :panel-offset-y="-46"
                  />
                </div>
                
                <div class="header-actions">
                  <button class="btn btn-link" @click="showHeaderSettings = !showHeaderSettings">
                    📄 问卷设置表明 | 🎨 效果设置
                  </button>
                </div>

                <!-- 头部设置面板 -->
                <div v-if="showHeaderSettings" class="header-settings">
                  <div class="setting-group">
                    <label>问卷类型：</label>
                    <select v-model="surveyForm.type" class="form-select">
                      <option value="normal">普通问卷</option>
                      <option value="anonymous">匿名问卷</option>
                      <option value="limited">限定问卷</option>
                    </select>
                  </div>
                  
                  <div class="setting-group">
                    <label>截止时间：</label>
                    <input v-model="surveyForm.endTime" type="datetime-local" class="form-input" />
                  </div>
                  
                  <div class="setting-row">
                    <label class="checkbox-label">
                      <input v-model="surveyForm.settings.showProgress" type="checkbox" />
                      显示进度条
                    </label>
                    <label class="checkbox-label">
                      <input v-model="surveyForm.settings.allowMultipleSubmissions" type="checkbox" />
                      允许重复提交
                    </label>
                  </div>
                </div>
              </div>

              <!-- 题目列表 -->
              <div class="questions-editor" @click.self="closeQuestionEdit">
                <div v-if="surveyForm.questions.length === 0" class="empty-state">
                  <div class="empty-icon">📝</div>
                  <h3>开始设计您的问卷</h3>
                  <p>从左侧选择题型添加到问卷中，或者使用AI助手快速生成</p>
                  <button class="btn btn-primary" @click="showAIHelper = true">
                    🤖 使用AI助手
                  </button>
                </div>

                <div v-else class="questions-list" @click.self="closeQuestionEdit">
                  <div 
                    v-for="(question, index) in surveyForm.questions" 
                    :key="question.id" 
                    :data-testid="`question-editor-${index}`"
                    class="question-editor"
                    :class="{ active: editingIndex === index }"
                    @click.stop
                  >
                    <div class="question-toolbar">
                      <span v-if="!question.hideSystemNumber" class="question-number">{{ index + 1 }}</span>
                      <span class="question-type-label">{{ getQuestionTypeLabel(question.type) }}</span>
                      <div class="question-actions">
                        <el-tooltip effect="dark" content="上移" placement="top" :show-after="200">
                          <button class="btn-icon btn-arrow" @click="moveQuestionUp(index)" :disabled="index === 0">
                            <ArrowUp class="icon" />
                          </button>
                        </el-tooltip>
                        <el-tooltip effect="dark" content="下移" placement="top" :show-after="200">
                          <button class="btn-icon btn-arrow" @click="moveQuestionDown(index)" :disabled="index === surveyForm.questions.length - 1">
                            <ArrowDown class="icon" />
                          </button>
                        </el-tooltip>
                        <el-tooltip effect="dark" content="复制" placement="top" :show-after="200">
                          <button class="btn-icon btn-copy" @click="duplicateQuestion(index)">
                            <DocumentCopy class="icon" />
                          </button>
                        </el-tooltip>
                        <el-tooltip effect="dark" content="删除" placement="top" :show-after="200">
                          <button class="btn-icon btn-delete" @click="deleteQuestion(index)">
                            <Delete class="icon" />
                          </button>
                        </el-tooltip>
                      </div>
                    </div>
                    
                    <div class="question-content" @click.stop="openQuestionEdit(index)">
                      <div class="question-title-editor">
                        <div class="title-input-wrap">
                          <div class="title-input-shell">
                            <template v-if="ensureTitleRich(index).rich || question.titleHtml">
                              <div
                                class="title-rich-preview"
                                :data-q="`q${index}`"
                                v-html="(question.titleHtml && String(question.titleHtml).length ? question.titleHtml : ensureTitleRich(index).html) || asPlain(question.title)"
                              ></div>
                            </template>
                            <template v-else>
                              <input 
                                v-model="question.title" 
                                :data-testid="`question-title-input-${index}`"
                                class="question-title-input" 
                                :placeholder="`请输入${getQuestionTypeLabel(question.type)}标题`"
                                @focus="onTitleFocus(index)"
                                @blur="(e)=>onTitleBlur(index, e)"
                              />
                            </template>
                            <span class="title-rich-btn-wrap" v-show="shouldShowTitleBtn(index)">
                              <el-tooltip effect="dark" content="富文本" placement="top" :show-after="200">
                                <button class="icon-btn title-rich-btn inside" :class="{ active: !!question.titleHtml || ensureTitleRich(index).rich }" @mousedown.prevent @click.stop="openTitleRichEditor(index)" aria-label="富文本编辑" tabindex="0">
                                  <svg class="icon" viewBox="0 0 1024 1024" width="16" height="16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <path d="M128 204.8a76.8 76.8 0 0 1 76.8-76.8h486.4a76.8 76.8 0 0 1 76.8 76.8v225.0624a76.8 76.8 0 0 1-21.44 53.2352L470.656 770.0352A76.8 76.8 0 0 1 415.296 793.6H204.8a76.8 76.8 0 0 1-76.8-76.8V204.8z" fill="#1677FF"></path>
                                    <path d="M230.4 307.2a76.8 76.8 0 0 1 76.8-76.8h486.4a76.8 76.8 0 0 1 76.8 76.8v179.2L460.8 896H307.2a76.8 76.8 0 0 1-76.8-76.8V307.2z" fill="#FFFFFF" fill-opacity=".35"></path>
                                    <path d="M332.8 358.4h307.2v51.2H332.8v-51.2z" fill="#FFFFFF"></path>
                                    <path d="M332.8 486.4h307.2v51.2H332.8v-51.2z" fill="#FFFFFF"></path>
                                    <path d="M332.8 614.4h179.2v51.2H332.8v-51.2z" fill="#FFFFFF"></path>
                                    <path d="M806.4 608l72.4096 72.4096L627.2 934.4l-86.336 8.5504 13.9264-80.96L806.4 608zM883.2 527.1808l72.4096 72.4096-51.2 55.2192L832 582.4l51.2-55.2192z" fill="#1677FF"></path>
                                  </svg>
                                </button>
                              </el-tooltip>
                            </span>
                          </div>
                        </div>
                      </div>
                      <!-- 填写提示编辑框：由底部工具条的“填写提示”复选框控制显示 -->
                      <div v-if="editingIndex === index && isHintOpen(question)" class="hint-editor">
                        <input 
                          v-model="question.description" 
                          class="hint-input" 
                          type="text"
                          placeholder="填写提示（显示在标题下方，作为副标题）"
                        />
                      </div>
                      
                      <!-- 编辑状态：选择题选项编辑 -->
                      <div v-if="editingIndex === index && hasOptions(question.type)" class="question-options-editor compact">
                        <template v-if="isMatrixLegacyQuestion(question.type)">
                          <div class="matrix-editor">
                            <div class="matrix-editor__table-wrap">
                              <table
                                class="matrix-editor__table"
                                :style="{ minWidth: `${matrixEditorMinWidth(question)}px` }"
                              >
                                <colgroup>
                                  <col :style="{ width: getMatrixConfig(question).rowTitleWidth || '30%' }" />
                                  <col
                                    v-for="(_, colIndex) in question.options || []"
                                    :key="`matrix-edit-col-${colIndex}`"
                                    class="matrix-editor__option-col"
                                    :style="{ width: `${matrixEditorOptionColumnWidth(question)}px` }"
                                  />
                                </colgroup>
                                <thead>
                                  <tr>
                                    <th class="matrix-editor__corner">
                                      <span>维度</span>
                                      <button class="matrix-editor__swap" type="button" title="竖向选择" @click.stop="toggleMatrixVerticalSelect(question)">⇄</button>
                                    </th>
                                    <th v-for="(option, colIndex) in question.options || []" :key="`matrix-edit-head-${colIndex}`">
                                      <div class="matrix-editor__head-cell">
                                        <input
                                          v-model="(question.options as string[])[colIndex]"
                                          class="matrix-editor__input matrix-editor__input--center"
                                          :placeholder="`选项${colIndex + 1}`"
                                        />
                                        <el-dropdown
                                          class="matrix-editor__menu"
                                          trigger="click"
                                          placement="bottom-end"
                                          popper-class="matrix-editor-dropdown-popper"
                                          :teleported="true"
                                          @command="handleMatrixColumnCommand(question, colIndex, $event)"
                                          @click.stop
                                        >
                                          <button class="matrix-editor__menu-btn" type="button" @click.stop>⋮</button>
                                          <template #dropdown>
                                            <el-dropdown-menu>
                                              <el-dropdown-item command="insert-before">左侧插入列</el-dropdown-item>
                                              <el-dropdown-item command="insert-after">右侧插入列</el-dropdown-item>
                                              <el-dropdown-item command="remove">删除列</el-dropdown-item>
                                            </el-dropdown-menu>
                                          </template>
                                        </el-dropdown>
                                      </div>
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr v-for="(row, rowIndex) in getMatrixConfig(question).rows" :key="`matrix-edit-row-${rowIndex}`">
                                    <td class="matrix-editor__row-title">
                                      <div class="matrix-editor__row-cell">
                                        <input
                                          v-model="getMatrixConfig(question).rows[rowIndex]"
                                          class="matrix-editor__input"
                                          :placeholder="`标题${rowIndex + 1}`"
                                        />
                                        <el-dropdown
                                          class="matrix-editor__menu"
                                          trigger="click"
                                          placement="bottom-end"
                                          popper-class="matrix-editor-dropdown-popper"
                                          :teleported="true"
                                          @command="handleMatrixRowCommand(question, rowIndex, $event)"
                                          @click.stop
                                        >
                                          <button class="matrix-editor__menu-btn" type="button" @click.stop>⋮</button>
                                          <template #dropdown>
                                            <el-dropdown-menu>
                                              <el-dropdown-item command="insert-before">上方插入行</el-dropdown-item>
                                              <el-dropdown-item command="insert-after">下方插入行</el-dropdown-item>
                                              <el-dropdown-item command="remove">删除行</el-dropdown-item>
                                            </el-dropdown-menu>
                                          </template>
                                        </el-dropdown>
                                      </div>
                                    </td>
                                    <td v-for="(_, colIndex) in question.options || []" :key="`matrix-edit-cell-${rowIndex}-${colIndex}`" class="matrix-editor__choice">
                                      <span v-if="isMatrixDropdownLegacyQuestion(question.type)" class="matrix-editor__select">请选择</span>
                                      <span v-else-if="isMatrixMultipleLegacyQuestion(question.type)" class="matrix-editor__checkbox"></span>
                                      <span v-else class="matrix-editor__radio"></span>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                            <div class="matrix-editor__actions">
                              <div class="matrix-editor__actions-left">
                                <button class="btn btn-link-sm" type="button" @click.stop="addMatrixRow(question)">+ 添加一行</button>
                                <button class="btn btn-link-sm" type="button" @click.stop="openMatrixRowsBatchEdit(index)">批量设置</button>
                                <button :class="['btn','btn-link-sm', { active: isGroupConfigured(surveyForm.questions[index]) }]" type="button" @click.stop="openGroupDialog(index)">分组设置</button>
                              </div>
                              <div class="matrix-editor__actions-right">
                                <button class="btn btn-link-sm" type="button" @click.stop="addMatrixColumn(question)">+ 添加一列</button>
                                <button class="btn btn-link-sm" type="button" @click.stop="openBatchEdit(index, 'options')">批量设置</button>
                              </div>
                            </div>
                            <div class="matrix-editor__settings">
                              <label class="checkbox-mini"><input v-model="getMatrixConfig(question).rowTitleRandom" type="checkbox" /> 行标题随机</label>
                              <label class="checkbox-mini"><input v-model="getMatrixConfig(question).verticalSelect" type="checkbox" @change.stop="onMatrixVerticalSelectChange(question, $event)" /> 竖向选择</label>
                              <label class="checkbox-mini"><input v-model="getMatrixConfig(question).singleQuestionAnswer" type="checkbox" /> 单题作答</label>
                              <select class="mini-select" v-model="getMatrixConfig(question).mobileLayout">
                                <option v-for="layout in matrixMobileLayoutOptions" :key="layout.value" :value="layout.value">{{ layout.label }}</option>
                              </select>
                              <span v-if="isMatrixMultipleLegacyQuestion(question.type)" class="matrix-editor__limit">
                                <label class="checkbox-mini"><input v-model="getMatrixConfig(question).optionLimit.enabled" type="checkbox" /> 选项可选个数</label>
                                <input v-model.number="getMatrixConfig(question).optionLimit.min" class="matrix-editor__number" type="number" min="0" @change="normalizeMatrixOptionLimit(question)" />
                                <span>-</span>
                                <input v-model.number="getMatrixConfig(question).optionLimit.max" class="matrix-editor__number" type="number" min="0" @change="normalizeMatrixOptionLimit(question)" />
                              </span>
                            </div>
                          </div>
                        </template>
                        <template v-else>
                        <!-- 顶部操作栏 -->
                        <div class="options-toolbar">
                          <button class="btn btn-sm btn-add-option" @click.stop="addOption(question)">+ 添加选项</button>
                          <button class="btn btn-link-sm" @click.stop="openBatchEdit(index)">批量编辑</button>
                          <button :class="['btn','btn-link-sm', { active: isGroupConfigured(surveyForm.questions[index]) }]" @click.stop="openGroupDialog(index)">分组设置</button>
                          <button :class="['btn','btn-link-sm', { active: isScoreConfigured(surveyForm.questions[index]) }]">分数</button>
                          <button :class="['btn','btn-link-sm', { active: isQuotaConfigured(surveyForm.questions[index]) }]" @click.stop="openQuotaDialog(index)">配额设置</button>
                        </div>
                        
                        <!-- 选项列表（支持分组预览） -->
                        <div class="options-list">
                          <template v-for="(option, optIndex) in question.options" :key="optIndex">
                            <div v-if="cachedGroupHeader(index, optIndex)" class="group-header">{{ cachedGroupHeader(index, optIndex) }}</div>
                            <div class="option-item with-tools">
                              <div class="opt-left">
                                <!-- 单选显示圆形， 多选显示方形 -->
                                <span v-if="question.type === 3" class="option-radio el-radio-sim">
                                  <el-radio :model-value="false" disabled />
                                </span>
                                <span v-else-if="question.type === 4" class="option-radio el-checkbox-sim">
                                  <el-checkbox :model-value="false" disabled />
                                </span>
                                <div class="opt-input-wrap">
                                  <template v-if="getOptionExtra(question, optIndex).rich">
                                    <div
                                      class="option-input-preview"
                                      :data-opt="`q${index}-o${optIndex}`"
                                      v-html="(question.options as string[])[optIndex]"
                                    ></div>
                                  </template>
                                  <template v-else>
                                    <input
                                      :data-opt="`q${index}-o${optIndex}`"
                                      v-model="(question.options as string[])[optIndex]"
                                      class="option-input"
                                      :placeholder="`选项${optIndex + 1}`"
                                    />
                                  </template>
                                </div>
                                  <span
                                    class="quota-remaining"
                                    v-if="(surveyForm.questions[index] as any)?.quotasEnabled && cachedOptionRemaining(index, optIndex) != null"
                                  >（剩余{{ cachedOptionRemaining(index, optIndex) }}）</span>
                                <span class="option-logic-hint" v-if="cachedOptionSummary(index, optIndex)">（{{ cachedOptionSummary(index, optIndex) }}）</span>
                                <span class="option-logic-hint" v-if="cachedJumpSummary(index, optIndex)">（{{ cachedJumpSummary(index, optIndex) }}）</span>
                                <span class="option-logic-hint" v-if="getOptionExtra(question, optIndex).hidden">（已隐藏）</span>
                              </div>
                              <div class="opt-tools">
                                <!-- 图标工具：富文本、加号圆、减号圆、文档、隐藏 -->
                                <el-tooltip effect="dark" content="富文本" placement="top" :show-after="200">
                                  <button class="icon-btn" :class="{ active: !!getOptionExtra(question, optIndex).rich }" @click.stop="openOptionRichEditor(index, optIndex)"><EditPen class="icon" /></button>
                                </el-tooltip>
                                <el-tooltip effect="dark" content="在下方插入选项" placement="top" :show-after="200">
                                  <button class="icon-btn" @click.stop="addOptionAt(question, optIndex + 1)"><CirclePlus class="icon" /></button>
                                </el-tooltip>
                                <el-tooltip effect="dark" content="删除该选项" placement="top" :show-after="200">
                                  <button class="icon-btn" @click.stop="removeOption(question, optIndex)"><Remove class="icon" /></button>
                                </el-tooltip>
                                <el-tooltip effect="dark" content="添加说明" placement="top" :show-after="200">
                                  <button class="icon-btn" :class="{ active: !!getOptionExtra(question, optIndex).hasDesc }" @click.stop="toggleDesc(question, optIndex)"><Document class="icon" /></button>
                                </el-tooltip>
                                <el-tooltip effect="dark" content="隐藏选项" placement="top" :show-after="200">
                                  <button class="icon-btn" :class="{ active: !!getOptionExtra(question, optIndex).hidden }" @click.stop="toggleHidden(question, optIndex)"><Hide class="icon" /></button>
                                </el-tooltip>
                                <!-- 复选开关：互斥、默认 -->
                                <label class="chk mini" v-if="question.type === 4"><input type="checkbox" v-model="getOptionExtra(question, optIndex).exclusive" /> 互斥</label>
                                <label class="chk mini"><input type="checkbox" v-model="getOptionExtra(question, optIndex).defaultSelected" /> 默认</label>
                                <!-- 填空：仅开关（必填直接放第二行预览旁边） -->
                                <label class="chk mini"><input type="checkbox" v-model="getOptionExtra(question, optIndex).fillEnabled" /> 填空</label>
                              </div>
                              <!-- 预览：当开启“填空”时，在编辑界面下方展示一个只读输入框提示 -->
                              <div v-if="getOptionExtra(question, optIndex).fillEnabled" class="opt-fill-preview">
                                <!-- 可编辑：作为填写页的 placeholder 提示语 -->
                                <input
                                  class="opt-fill-input"
                                  v-model="getOptionExtra(question, optIndex).fillPlaceholder"
                                  placeholder="设置该填空的提示语（可选）"
                                />
                                <label class="chk mini" style="white-space:nowrap;">
                                  <input type="checkbox" v-model="getOptionExtra(question, optIndex).fillRequired" /> 必填
                                </label>
                              </div>
                              <div v-if="getOptionExtra(question, optIndex).hasDesc" class="opt-desc-edit">
                                <input class="opt-desc-input" v-model="getOptionExtra(question, optIndex).desc" placeholder="输入该选项的说明（可选）" />
                              </div>
                            </div>
                          </template>
                        </div>
                        <div v-if="isMatrixLegacyQuestion(question.type)" class="matrix-rows-editor">
                          <div class="matrix-rows-editor__header">
                            <span>矩阵行</span>
                            <button class="btn btn-link-sm" @click.stop="addMatrixRow(question)">+ 添加行</button>
                          </div>
                          <div class="matrix-rows-editor__list">
                            <div
                              v-for="(row, rowIndex) in getMatrixConfig(question).rows"
                              :key="`row-${rowIndex}`"
                              class="matrix-rows-editor__item"
                            >
                              <span class="matrix-rows-editor__index">{{ rowIndex + 1 }}</span>
                              <input
                                v-model="getMatrixConfig(question).rows[rowIndex]"
                                class="matrix-rows-editor__input"
                                :placeholder="`维度${rowIndex + 1}`"
                              />
                              <button class="icon-btn" @click.stop="removeMatrixRow(question, rowIndex)">
                                <Remove class="icon" />
                              </button>
                            </div>
                          </div>
                        </div>
                        </template>
                      <!-- 高级功能链接 -->
                        <div class="advanced-options">
                          <template v-if="index > 0">
                            <a href="#" class="link-action" :class="{ active: !!cachedQuestionLogicSummary(index) }" @click.stop.prevent="openLogicDialog(index)">题目关联</a>
                          </template>
                          <template v-else>
                            <span class="link-disabled" title="需要前面有可选择的题目，且第1题无法设置">题目关联</span>
                          </template>
                          <a href="#" class="link-action" :class="{ active: !!(surveyForm.questions[index] && (surveyForm.questions[index] as any).jumpLogic) }" @click.stop.prevent="openJumpDialog(index)">跳题逻辑</a>
                          <a href="#" class="link-action" :class="{ active: Array.isArray((surveyForm.questions[index] as any)?.optionLogic) && ((surveyForm.questions[index] as any).optionLogic || []).some((g:any)=> Array.isArray(g) && g.length>0) }" @click.stop.prevent="openOptionLogicDialog(index)">选项关联</a>
                          
                          <!-- 左侧设置项：选项顺序和排列 -->
                          <template v-if="hasOptions(question.type) && !isMatrixLegacyQuestion(question.type)">
                            <span class="separator">|</span>
                            <span class="label">选项顺序</span>
                            <select class="mini-select" v-model="question.optionOrder">
                              <option value="none">选项不随机</option>
                              <option value="all">全部项随机</option>
                              <option value="flip">选项正倒序随机</option>
                              <option value="firstFixed">第1项不随机</option>
                              <option value="lastFixed">最后1项不随机</option>
                            </select>
                            <span class="label">排列</span>
                            <select class="mini-select">
                              <option>竖向排列</option>
                            </select>
                          </template>
                          
                          <!-- 右侧控制项：填写提示、必答、完成编辑 -->
                          <div class="right-controls-inline">
                            <label class="checkbox-mini">
                              <input type="checkbox" :checked="isHintOpen(question)" @change.stop="onHintCheckboxChange(question, $event)" /> 填写提示
                            </label>
                            <label class="checkbox-mini">
                              <input v-model="question.required" type="checkbox" /> 必答
                            </label>
                            <button class="btn btn-primary btn-sm" @click.stop="finishEdit()">完成编辑</button>
                          </div>
                        </div>
                        
                        <!-- 题目关联摘要（显示在该题的选项的最下面） -->
                        <div v-if="cachedQuestionLogicSummary(index)" class="question-logic-hint">（{{ cachedQuestionLogicSummary(index) }}）</div>
                      </div>
                      <!-- 若非选择题，仍在题目下方显示摘要 -->
                      <div v-else-if="editingIndex === index && isMultiFillLegacyQuestion(question.type)" class="multi-fill-editor">
                        <div class="multi-fill-editor__header">
                          <span>填空项</span>
                          <button class="btn btn-link-sm" @click.stop="addMultiFillItem(question)">+ 添加填空项</button>
                        </div>
                        <div class="multi-fill-editor__preview multi-fill-editor__preview--editable">
                          <div
                            v-for="(item, itemIndex) in getMultiFillConfig(question).items"
                            :key="`multi-fill-preview-${question.id}-${itemIndex}`"
                            class="multi-fill-preview__row multi-fill-preview__row--editable"
                          >
                            <span class="multi-fill-preview__label-edit">
                              <input
                                v-model="getMultiFillConfig(question).items[itemIndex]"
                                class="multi-fill-preview__label-input"
                                :placeholder="`填空项${itemIndex + 1}`"
                              />
                              <span class="multi-fill-preview__label-colon">:</span>
                            </span>
                            <span class="multi-fill-preview__input"></span>
                            <span class="multi-fill-preview__tools">
                              <el-tooltip effect="dark" content="在下方插入填空项" placement="top" :show-after="200">
                                <button class="icon-btn" @click.stop="addMultiFillItemAt(question, itemIndex + 1)"><CirclePlus class="icon" /></button>
                              </el-tooltip>
                              <el-tooltip effect="dark" content="删除该填空项" placement="top" :show-after="200">
                                <button
                                  class="icon-btn"
                                  :disabled="getMultiFillConfig(question).items.length <= 1"
                                  @click.stop="removeMultiFillItem(question, itemIndex)"
                                >
                                  <Remove class="icon" />
                                </button>
                              </el-tooltip>
                            </span>
                          </div>
                        </div>
                        <div class="advanced-options">
                          <template v-if="index > 0">
                            <a href="#" class="link-action" :class="{ active: !!cachedQuestionLogicSummary(index) }" @click.stop.prevent="openLogicDialog(index)">题目关联</a>
                          </template>
                          <template v-else>
                            <span class="link-disabled" title="需要前面有可选择的题目，且第1题无法设置">题目关联</span>
                          </template>
                          <a href="#" class="link-action" :class="{ active: !!(surveyForm.questions[index] && (surveyForm.questions[index] as any).jumpLogic) }" @click.stop.prevent="openJumpDialog(index)">跳题逻辑</a>
                          <div class="right-controls-inline">
                            <label class="checkbox-mini">
                              <input type="checkbox" :checked="isHintOpen(question)" @change.stop="onHintCheckboxChange(question, $event)" /> 填写提示
                            </label>
                            <label class="checkbox-mini">
                              <input v-model="question.required" type="checkbox" /> 必答
                            </label>
                            <button class="btn btn-primary btn-sm" @click.stop="finishEdit()">完成编辑</button>
                          </div>
                        </div>
                        <div v-if="cachedQuestionLogicSummary(index)" class="question-logic-hint">（{{ cachedQuestionLogicSummary(index) }}）</div>
                      </div>
                      <div v-else-if="editingIndex === index && cachedQuestionLogicSummary(index)" class="question-logic-hint">（{{ cachedQuestionLogicSummary(index) }}）</div>

                      <div v-else-if="editingIndex === index && isStandaloneConfigType(question.type)" class="standalone-editor">
                        <template v-if="isSliderLegacyQuestion(question.type)">
                          <div class="standalone-editor__row">
                            <label class="standalone-editor__label">最小值</label>
                            <input v-model.number="getSliderValidation(question).min" class="standalone-editor__input standalone-editor__input--sm" type="number" @change="normalizeSliderValidation(question)" />
                            <label class="standalone-editor__label">最大值</label>
                            <input v-model.number="getSliderValidation(question).max" class="standalone-editor__input standalone-editor__input--sm" type="number" @change="normalizeSliderValidation(question)" />
                            <label class="standalone-editor__label">步长</label>
                            <input v-model.number="getSliderValidation(question).step" class="standalone-editor__input standalone-editor__input--sm" type="number" min="1" @change="normalizeSliderValidation(question)" />
                          </div>
                          <div class="standalone-editor__preview">
                            <el-slider
                              :model-value="getSliderValidation(question).min"
                              :min="getSliderValidation(question).min"
                              :max="getSliderValidation(question).max"
                              :step="getSliderValidation(question).step"
                              disabled
                            />
                            <div class="standalone-editor__meta">
                              <span>{{ getSliderValidation(question).min }}</span>
                              <span>步长 {{ getSliderValidation(question).step }}</span>
                              <span>{{ getSliderValidation(question).max }}</span>
                            </div>
                          </div>
                        </template>
                        <template v-else-if="isUploadLegacyQuestion(question.type)">
                          <div class="upload-preview-box">
                            <div class="upload-preview-inner">
                              <svg class="upload-preview-icon" viewBox="0 0 48 48" width="40" height="40" fill="none">
                                <rect x="8" y="6" width="32" height="36" rx="3" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="4 2"/>
                                <path d="M16 24l6 6 10-12" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M8 38h32" stroke="#cbd5e1" stroke-width="2"/>
                              </svg>
                              <div class="upload-preview-text">点击或拖拽上传附件</div>
                            </div>
                          </div>
                          <div class="upload-config-inline">
                            <label>文件限制</label>
                            <select
                              class="uc-select"
                              :value="getUploadRestrictionMode(question)"
                              @change="setUploadRestrictionMode(question, ($event.target as HTMLSelectElement).value)"
                            >
                              <option value="all">不限文件类型</option>
                              <option value="image">仅限图片</option>
                              <option value="document">仅文档(PDF/Office)</option>
                              <option value="image+pdf">图片与PDF</option>
                            </select>
                            <label>大小</label>
                            <input
                              v-model.number="getUploadConfig(question).maxSizeMb"
                              class="uc-input"
                              type="number" min="1" max="10"
                              @change="normalizeUploadConfig(question)"
                            />
                            <span class="uc-unit">M</span>
                            <label>数量</label>
                            <input
                              v-model.number="getUploadConfig(question).maxFiles"
                              class="uc-input"
                              type="number" min="1" max="20"
                              @change="normalizeUploadConfig(question)"
                            />
                          </div>
                          <div v-if="getUploadRestrictionMode(question) === 'image' || getUploadRestrictionMode(question) === 'image+pdf'" class="upload-image-row">
                            <label class="uc-check">
                              <input type="checkbox" v-model="getUploadConfig(question).compressSize" /> 压缩
                            </label>
                            <label class="uc-check">
                              <input type="checkbox" v-model="getUploadConfig(question).compressDimensions" /> 裁切
                            </label>
                            <template v-if="getUploadConfig(question).compressDimensions">
                              <span class="uc-sep"></span>
                              <label>最大宽</label>
                              <input
                                v-model.number="getUploadConfig(question).maxWidth"
                                class="uc-input"
                                type="number" min="0" max="10000"
                                @change="normalizeUploadConfig(question)"
                              />
                              <label>最大高</label>
                              <input
                                v-model.number="getUploadConfig(question).maxHeight"
                                class="uc-input"
                                type="number" min="0" max="10000"
                                @change="normalizeUploadConfig(question)"
                              />
                              <span class="uc-unit">px</span>
                            </template>
                            <span class="uc-sep"></span>
                            <label>水印</label>
                            <input
                              v-model="getUploadConfig(question).watermark"
                              class="uc-input-text"
                              placeholder="文字水印"
                            />
                          </div>
                        </template>
                        <template v-else-if="isRatingLegacyQuestion(question.type)">
                          <div class="standalone-editor__column">
                            <div class="standalone-editor__row">
                              <label class="standalone-editor__label">最小分</label>
                              <input v-model.number="getRatingValidation(question).min" class="standalone-editor__input standalone-editor__input--sm" type="number" min="1" max="10" @change="normalizeRatingValidation(question)" />
                              <label class="standalone-editor__label">最大分</label>
                              <input v-model.number="getRatingValidation(question).max" class="standalone-editor__input standalone-editor__input--sm" type="number" min="1" max="10" @change="normalizeRatingValidation(question)" />
                            </div>
                            <div class="standalone-editor__preview">
                              <div class="star-rating">
                                <span v-for="star in getRatingValidation(question).max" :key="`rating-${star}`" class="star">★</span>
                              </div>
                              <div class="standalone-editor__tip">填写页会按星级评分展示。</div>
                            </div>
                          </div>
                        </template>
                        <template v-else-if="isScaleLegacyQuestion(question.type)">
                          <div class="standalone-editor__column">
                            <div class="standalone-editor__row">
                              <label class="standalone-editor__label">最小值</label>
                              <input v-model.number="getScaleValidation(question).min" class="standalone-editor__input standalone-editor__input--sm" type="number" min="0" @change="normalizeScaleValidation(question)" />
                              <label class="standalone-editor__label">最大值</label>
                              <input v-model.number="getScaleValidation(question).max" class="standalone-editor__input standalone-editor__input--sm" type="number" min="1" @change="normalizeScaleValidation(question)" />
                              <label class="standalone-editor__label">步长</label>
                              <input v-model.number="getScaleValidation(question).step" class="standalone-editor__input standalone-editor__input--sm" type="number" min="1" @change="normalizeScaleValidation(question)" />
                            </div>
                            <div class="standalone-editor__row">
                              <label class="standalone-editor__label">左侧标签</label>
                              <input v-model="getScaleValidation(question).minLabel" class="standalone-editor__input standalone-editor__input--lg" type="text" placeholder="最低" />
                            </div>
                            <div class="standalone-editor__row">
                              <label class="standalone-editor__label">右侧标签</label>
                              <input v-model="getScaleValidation(question).maxLabel" class="standalone-editor__input standalone-editor__input--lg" type="text" placeholder="最高" />
                            </div>
                            <div class="standalone-editor__preview">
                              <div class="scale-labels">
                                <span>{{ getScaleValidation(question).minLabel }}</span>
                                <span>{{ getScaleValidation(question).maxLabel }}</span>
                              </div>
                              <div class="scale-numbers">
                                <button
                                  v-for="value in getScalePreviewValues(question)"
                                  :key="`scale-${value}`"
                                  class="scale-btn"
                                  type="button"
                                  disabled
                                >
                                  {{ value }}
                                </button>
                              </div>
                            </div>
                          </div>
                        </template>
                        <template v-else-if="question.type === 14">
                          <div class="standalone-editor__date">
                            <input class="standalone-editor__input" type="date" disabled />
                            <div class="standalone-editor__tip">填写页将使用原生日期选择器。</div>
                          </div>
                        </template>
                        <template v-else-if="question.type === 18">
                          <div class="standalone-editor__tip">该题型在填写页以说明块展示，不收集答案。</div>
                        </template>
                        <div class="advanced-options">
                          <template v-if="index > 0">
                            <a href="#" class="link-action" :class="{ active: !!cachedQuestionLogicSummary(index) }" @click.stop.prevent="openLogicDialog(index)">题目关联</a>
                          </template>
                          <template v-else>
                            <span class="link-disabled" title="需要前面有可选择的题目，且第1题无法设置">题目关联</span>
                          </template>
                          <a href="#" class="link-action" :class="{ active: !!(surveyForm.questions[index] && (surveyForm.questions[index] as any).jumpLogic) }" @click.stop.prevent="openJumpDialog(index)">跳题逻辑</a>
                          <div class="right-controls-inline">
                            <label class="checkbox-mini">
                              <input type="checkbox" :checked="isHintOpen(question)" @change.stop="onHintCheckboxChange(question, $event)" /> 填写提示
                            </label>
                            <label class="checkbox-mini">
                              <input v-model="question.required" type="checkbox" /> 必答
                            </label>
                            <button class="btn btn-primary btn-sm" @click.stop="finishEdit()">完成编辑</button>
                          </div>
                        </div>
                        <div v-if="cachedQuestionLogicSummary(index)" class="question-logic-hint">（{{ cachedQuestionLogicSummary(index) }}）</div>
                      </div>

                      <!-- 通用底部设置栏（编辑时显示，统一“必答”入口） -->
                      <!-- 已合并到 advanced-options 中 -->
                      
                      
                      
                      <!-- 完成编辑后的紧凑预览 -->
                      <div v-else class="question-compact-preview">
                        <template v-if="isMatrixLegacyQuestion(question.type)">
                          <div class="matrix-preview">
                            <div
                              class="matrix-preview__table"
                              :style="{
                                minWidth: `${Math.max(420, 100 + ((question.options || []).length) * 48)}px`,
                                '--matrix-option-count': String((question.options || []).length || 1)
                              }"
                            >
                              <div class="matrix-preview__head">
                                <span class="matrix-preview__corner">维度</span>
                                <span v-for="(option, i) in question.options" :key="`matrix-col-${i}`" class="matrix-preview__cell matrix-preview__cell--head">
                                  {{ option }}
                                </span>
                              </div>
                              <div v-for="(row, rowIndex) in getMatrixConfig(question).rows" :key="`matrix-row-${rowIndex}`" class="matrix-preview__row">
                                <span class="matrix-preview__cell matrix-preview__cell--row">{{ row }}</span>
                                <span v-for="(_, i) in question.options" :key="`matrix-dot-${rowIndex}-${i}`" class="matrix-preview__cell">
                                  <span v-if="isMatrixDropdownLegacyQuestion(question.type)" class="matrix-preview__select">请选择</span>
                                  <span v-else-if="isMatrixMultipleLegacyQuestion(question.type)" class="matrix-preview__check"></span>
                                  <span v-else class="matrix-preview__dot"></span>
                                </span>
                              </div>
                            </div>
                          </div>
                          <div v-if="cachedQuestionLogicSummary(index)" class="question-logic-hint">（{{ cachedQuestionLogicSummary(index) }}）</div>
                        </template>
                        <template v-else-if="hasOptions(question.type)">
                          <div class="options-preview">
                            <template v-for="(opt, i) in question.options" :key="i">
                              <div v-if="cachedGroupHeader(index, i)" class="group-header">{{ cachedGroupHeader(index, i) }}</div>
                              <div class="option-preview">
                              <span class="radio-circle" v-if="question.type===3">
                                <el-radio :model-value="false" disabled class="preview-radio-sim" />
                              </span>
                              <span class="radio-circle" v-else-if="question.type===4">
                                <el-checkbox :model-value="false" disabled class="preview-checkbox-sim" />
                              </span>
                              <template v-if="getOptionExtra(question, i).rich">
                                <div class="option-text" v-html="opt"></div>
                              </template>
                              <template v-else>
                                <span class="option-text">{{ opt }}</span>
                              </template>
                              <span
                                class="quota-remaining"
                                v-if="(surveyForm.questions[index] as any)?.quotasEnabled && cachedOptionRemaining(index, i) != null"
                              >（剩余{{ cachedOptionRemaining(index, i) }}）</span>
                              <span class="option-logic-hint" v-if="cachedOptionSummary(index, i)">（{{ cachedOptionSummary(index, i) }}）</span>
                              <span class="option-logic-hint" v-if="cachedJumpSummary(index, i)">（{{ cachedJumpSummary(index, i) }}）</span>
                              <span class="option-logic-hint" v-if="getOptionExtra(question, i).hidden">（已隐藏）</span>
                              </div>
                            </template>
                          </div>
                          <!-- 题目关联摘要（紧凑预览：选项列表的最下面） -->
                          <div v-if="cachedQuestionLogicSummary(index)" class="question-logic-hint">（{{ cachedQuestionLogicSummary(index) }}）</div>
                        </template>
                        <template v-else-if="isMultiFillLegacyQuestion(question.type)">
                          <div class="multi-fill-preview">
                            <div
                              v-for="(item, itemIndex) in getMultiFillConfig(question).items"
                              :key="`multi-fill-compact-${question.id}-${itemIndex}`"
                              class="multi-fill-preview__row"
                            >
                              <span class="multi-fill-preview__label">{{ item || `填空项${itemIndex + 1}` }}:</span>
                              <span class="multi-fill-preview__input"></span>
                            </div>
                          </div>
                          <div v-if="cachedQuestionLogicSummary(index)" class="question-logic-hint">（{{ cachedQuestionLogicSummary(index) }}）</div>
                        </template>
                        <template v-else>
                          <div class="input-preview">
                            <span v-if="question.type === 1">填空题输入框</span>
                            <span v-else-if="question.type === 2">简答题输入框</span>
                            <span v-else-if="isSliderLegacyQuestion(question.type)">滑动条：{{ getSliderValidation(question).min }} - {{ getSliderValidation(question).max }}</span>
                            <span v-else-if="isRatingLegacyQuestion(question.type)" class="input-preview-stars">
                              <span v-for="s in getRatingValidation(question).max" :key="'rpre-'+s" class="preview-star on">★</span>
                            </span>
                            <span v-else-if="isScaleLegacyQuestion(question.type)">量表：{{ getScaleValidation(question).min }} - {{ getScaleValidation(question).max }}</span>
                            <span v-else-if="isUploadLegacyQuestion(question.type)">文件上传：{{ getUploadConfig(question).maxFiles }} 个以内</span>
                            <span v-else-if="question.type === 14">日期选择器</span>
                            <span v-else-if="question.type === 18">说明文字块</span>
                            <span v-else>{{ getQuestionTypeLabel(question.type) }}</span>
                          </div>
                          <div v-if="cachedQuestionLogicSummary(index)" class="question-logic-hint">（{{ cachedQuestionLogicSummary(index) }}）</div>
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- 批量添加题目按钮 -->
                <div class="batch-add-questions-wrapper">
                  <button class="btn-batch-add-questions" @click="openBatchAddDialog">
                    <el-icon class="btn-icon"><DocumentAdd /></el-icon>
                    <span class="btn-text">批量添加题目</span>
                  </button>
                </div>
              </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CreateSurveyQuestionListPanelContract } from './createSurveyPageContracts'
import { EditPen, CirclePlus, Remove, Document, Hide, DocumentAdd, ArrowUp, ArrowDown, DocumentCopy, Delete } from '@element-plus/icons-vue'
import QuillFloatingEditor from '@/components/QuillFloatingEditor.vue'

const props = defineProps<{
  context: CreateSurveyQuestionListPanelContract
}>()

const {
  surveyForm,
  showHeaderSettings,
  validateForm,
  errors,
  closeQuestionEdit,
  openQuestionEdit,
  showAIHelper,
  editingIndex,
  getQuestionTypeLabel,
  moveQuestionUp,
  moveQuestionDown,
  duplicateQuestion,
  deleteQuestion,
  ensureTitleRich,
  asPlain,
  onTitleFocus,
  onTitleBlur,
  shouldShowTitleBtn,
  openTitleRichEditor,
  isHintOpen,
  onHintCheckboxChange,
  hasOptions,
  addOption,
  openBatchEdit,
  openMatrixRowsBatchEdit,
  isGroupConfigured,
  isScoreConfigured,
  isQuotaConfigured,
  openGroupDialog,
  openQuotaDialog,
  groupHeaderFor,
  optionRemaining,
  optionSummary,
  jumpSummary,
  getOptionExtra,
  openOptionRichEditor,
  addOptionAt,
  removeOption,
  toggleDesc,
  toggleHidden,
  isMatrixLegacyQuestion,
  isMultiFillLegacyQuestion,
  isMatrixDropdownLegacyQuestion,
  isMatrixMultipleLegacyQuestion,
  addMatrixRow,
  insertMatrixRow,
  getMatrixConfig,
  normalizeMatrixOptionLimit,
  removeMatrixRow,
  addMatrixColumn,
  insertMatrixColumn,
  removeMatrixColumn,
  swapMatrixRowsAndOptions,
  matrixRowTitleWidthOptions,
  matrixMobileLayoutOptions,
  getMultiFillConfig,
  addMultiFillItem,
  addMultiFillItemAt,
  removeMultiFillItem,
  questionLogicSummary,
  openLogicDialog,
  openJumpDialog,
  openOptionLogicDialog,
  isStandaloneConfigType,
  getSliderValidation,
  normalizeSliderValidation,
  isSliderLegacyQuestion,
  isUploadLegacyQuestion,
  getUploadConfig,
  normalizeUploadConfig,
  uploadConfigSummary,
  getUploadRestrictionMode,
  setUploadRestrictionMode,
  isRatingLegacyQuestion,
  getRatingValidation,
  normalizeRatingValidation,
  isScaleLegacyQuestion,
  getScaleValidation,
  normalizeScaleValidation,
  getScalePreviewValues,
  finishEdit,
  addQuestionAfter,
  openBatchAddDialog
} = props.context

const questionLogicSummaryCache = computed(() =>
  surveyForm.questions.map((_, index) => questionLogicSummary(index))
)

const optionSummaryCache = computed(() => {
  const result: Record<string, string> = {}
  surveyForm.questions.forEach((question, questionIndex) => {
    if (!Array.isArray(question.options)) return
    question.options.forEach((_, optionIndex) => {
      const summary = optionSummary(questionIndex, optionIndex)
      if (summary) result[`${questionIndex}:${optionIndex}`] = summary
    })
  })
  return result
})

const jumpSummaryCache = computed(() => {
  const result: Record<string, string> = {}
  surveyForm.questions.forEach((question, questionIndex) => {
    if (!Array.isArray(question.options)) return
    question.options.forEach((_, optionIndex) => {
      const summary = jumpSummary(questionIndex, optionIndex)
      if (summary) result[`${questionIndex}:${optionIndex}`] = summary
    })
  })
  return result
})

const groupHeaderCache = computed(() => {
  const result: Record<string, string> = {}
  surveyForm.questions.forEach((question, questionIndex) => {
    if (!Array.isArray(question.options)) return
    question.options.forEach((_, optionIndex) => {
      const header = groupHeaderFor(question, optionIndex)
      if (header) result[`${questionIndex}:${optionIndex}`] = header
    })
  })
  return result
})

const optionRemainingCache = computed(() => {
  const result: Record<string, number | null> = {}
  surveyForm.questions.forEach((question, questionIndex) => {
    if (!Array.isArray(question.options) || !(question as any).quotasEnabled) return
    question.options.forEach((_, optionIndex) => {
      result[`${questionIndex}:${optionIndex}`] = optionRemaining(question, optionIndex)
    })
  })
  return result
})

function optionKey(questionIndex: number, optionIndex: number) {
  return `${questionIndex}:${optionIndex}`
}

function cachedQuestionLogicSummary(questionIndex: number) {
  return questionLogicSummaryCache.value[questionIndex] || ''
}

function cachedOptionSummary(questionIndex: number, optionIndex: number) {
  return optionSummaryCache.value[optionKey(questionIndex, optionIndex)] || ''
}

function cachedJumpSummary(questionIndex: number, optionIndex: number) {
  return jumpSummaryCache.value[optionKey(questionIndex, optionIndex)] || ''
}

function cachedGroupHeader(questionIndex: number, optionIndex: number) {
  return groupHeaderCache.value[optionKey(questionIndex, optionIndex)] || ''
}

function cachedOptionRemaining(questionIndex: number, optionIndex: number) {
  const key = optionKey(questionIndex, optionIndex)
  return Object.prototype.hasOwnProperty.call(optionRemainingCache.value, key) ? optionRemainingCache.value[key] : null
}

const MATRIX_EDITOR_OPTION_MIN_WIDTH = 80
const MATRIX_EDITOR_OPTION_DENSE_MIN_WIDTH = 48
const MATRIX_EDITOR_OPTION_WIDTH_BASIS = 400

function matrixEditorOptionCount(question: any) {
  return Math.max(1, Array.isArray(question.options) ? question.options.length : 0)
}

function matrixEditorOptionColumnWidth(question: any) {
  const optionCount = matrixEditorOptionCount(question)
  return Math.max(
    MATRIX_EDITOR_OPTION_DENSE_MIN_WIDTH,
    Math.min(MATRIX_EDITOR_OPTION_MIN_WIDTH, Math.floor(MATRIX_EDITOR_OPTION_WIDTH_BASIS / optionCount))
  )
}

function matrixEditorOptionWidthTotal(question: any) {
  return matrixEditorOptionCount(question) * matrixEditorOptionColumnWidth(question)
}

function matrixEditorMinWidth(question: any) {
  const optionWidthTotal = matrixEditorOptionWidthTotal(question)
  const rowTitleWidth = String(getMatrixConfig(question).rowTitleWidth || '30%')
  const percentMatch = rowTitleWidth.match(/^(\d+(?:\.\d+)?)%$/)

  if (!percentMatch) return Math.max(680, 160 + optionWidthTotal)

  const rowTitlePercent = Math.min(90, Math.max(10, Number(percentMatch[1]))) / 100
  const remainingPercent = Math.max(0.1, 1 - rowTitlePercent)
  return Math.ceil(Math.max(680, optionWidthTotal / remainingPercent))
}

function applyMatrixVerticalSelect(question: any, checked: boolean) {
  const matrix = getMatrixConfig(question)
  swapMatrixRowsAndOptions(question)
  matrix.verticalSelect = checked
}

function toggleMatrixVerticalSelect(question: any) {
  const matrix = getMatrixConfig(question)
  applyMatrixVerticalSelect(question, !matrix.verticalSelect)
}

function handleMatrixColumnCommand(question: any, colIndex: number, command: unknown) {
  if (command === 'insert-before') {
    insertMatrixColumn(question, colIndex, 'before')
    return
  }
  if (command === 'insert-after') {
    insertMatrixColumn(question, colIndex, 'after')
    return
  }
  if (command === 'remove') {
    removeMatrixColumn(question, colIndex)
  }
}

function handleMatrixRowCommand(question: any, rowIndex: number, command: unknown) {
  if (command === 'insert-before') {
    insertMatrixRow(question, rowIndex, 'before')
    return
  }
  if (command === 'insert-after') {
    insertMatrixRow(question, rowIndex, 'after')
    return
  }
  if (command === 'remove') {
    removeMatrixRow(question, rowIndex)
  }
}

function onMatrixVerticalSelectChange(question: any, event: Event) {
  const checked = !!(event.target as HTMLInputElement | null)?.checked
  applyMatrixVerticalSelect(question, checked)
}
</script>
