<!--
  登录页面（Login.vue）
  用户登录系统，支持企业版和普通用户。
-->
<template>
  <div class="login-shell" :class="shellClasses">
    <!-- 左侧：企业风格 -->
    <div class="brand-side" v-if="mode==='enterprise'">
      <div class="brand-inner">
        <div class="ent-brand v2" @click="goHome" role="button" aria-label="返回首页">
          <div class="ent-wordmark">
            <div class="ent-label">ENTERPRISE EDITION</div>
            <div class="ent-title">
              <span class="w-main">TrustForm信任表单</span><span class="w-split">·</span><span class="w-suffix">企业版</span>
            </div>
          </div>
          <div class="ent-sub">数据资产内控 · 全局权限矩阵 · 安全审计追踪</div>
          <div class="ent-badges">
            <span class="chip">私有部署</span>
            <span class="chip">AD/LDAP</span>
            <span class="chip">OIDC/SSO</span>
            <span class="chip">零信任</span>
          </div>
          <div class="ent-metrics">
            <div class="em-item"><span class="k">SLA</span><span class="v">99.99%</span></div>
            <div class="em-item"><span class="k">加密</span><span class="v">AES‑256</span></div>
            <div class="em-item"><span class="k">审计</span><span class="v">全量</span></div>
          </div>
          <div class="ent-matrix" aria-hidden="true">
            <div class="m-head">
              <span>角色 / 权限域</span>
              <span class="m-hint">最小权限示例</span>
            </div>
            <div class="m-grid">
              <div class="m-col">
                <div class="m-role">管理员</div>
                <div class="m-cell grant"></div>
                <div class="m-cell grant"></div>
                <div class="m-cell grant"></div>
                <div class="m-cell grant"></div>
              </div>
              <div class="m-col">
                <div class="m-role">审核</div>
                <div class="m-cell"></div>
                <div class="m-cell grant"></div>
                <div class="m-cell grant"></div>
                <div class="m-cell"></div>
              </div>
              <div class="m-col">
                <div class="m-role">分析</div>
                <div class="m-cell"></div>
                <div class="m-cell"></div>
                <div class="m-cell grant"></div>
                <div class="m-cell grant"></div>
              </div>
              <div class="m-col">
                <div class="m-role">填报</div>
                <div class="m-cell"></div>
                <div class="m-cell"></div>
                <div class="m-cell"></div>
                <div class="m-cell grant"></div>
              </div>
            </div>
            <div class="m-legend"><span class="dot grant"></span> 授权 / <span class="dot"></span> 未授权</div>
          </div>
        </div>
        <ul class="selling v2" aria-label="关键能力">
          <li><span class="ic">🔐</span><span class="tt">最小权限</span><span class="desc">多角色分级 & 行为审计</span></li>
          <li><span class="ic">🛡️</span><span class="tt">零信任</span><span class="desc">Token + 细粒度策略</span></li>
          <li><span class="ic">📜</span><span class="tt">可追溯</span><span class="desc">操作日志与导出留痕</span></li>
        </ul>
  <div class="footer-note">Copyright © 2025 TrustForm信任表单</div>
      </div>
    </div>
    <!-- 左侧：政务红金风格 -->
    <div class="gov-side" v-if="mode==='government'">
      <div class="govr-inner">
        <div class="govr-head">
          <div class="seal" aria-label="徽章">★</div>
          <div class="govr-titles">
            <div class="cn">TrustForm信任表单-政务版</div>
            <div class="en">Government Survey & Intelligence Platform</div>
          </div>
        </div>
        <div class="govr-ann" role="alert" title="周六 00:00-02:00 维护，请提前保存数据">📢 周六 00:00-02:00 安全补丁维护</div>
        <ol class="govr-guides" aria-label="使用须知">
          <li>账号仅限本人使用，严禁外借。</li>
          <li>涉敏数据按本级审批与分级策略流转。</li>
          <li>离岗请退出，防止未授权操作。</li>
        </ol>
        <div class="govr-secbox" aria-label="安全要点">
          <div class="badges-line">
            <span class="s-badge">最小授权</span>
            <span class="s-badge">日志审计</span>
            <span class="s-badge">数据脱敏</span>
            <span class="s-badge">防篡改</span>
          </div>
          <p class="desc">平台已启用访问控制、操作留痕与完整性校验，严禁与公务无关用途。</p>
          <ul class="govr-points embed" aria-label="核心安全控制">
            <li>最小权限 + 会话动态校验</li>
            <li>操作审计可追溯 ≥180 天</li>
            <li>数据分级管理与脱敏导出</li>
            <li>关键参数完整性校验</li>
          </ul>
        </div>
        <div class="govr-footer">©2025 政务信息中心 · 内部系统 | 备案：示例-0000</div>
      </div>
    </div>
    <!-- 左侧：科研模式 -->
    <div class="research-side" v-if="mode==='research'">
      <div class="research-inner">
        <div class="res-brand" @click="goHome" role="button" aria-label="返回首页">
          <div class="res-mark">研</div>
          <div class="res-name">
            <div class="res-name-cn">TrustForm信任表单 <span class="ver">科研版</span></div>
            <div class="res-name-en">Research Data Integrity</div>
            <span class="res-underline" aria-hidden="true"></span>
          </div>
        </div>
        <h1 class="res-title">真实 · 防作弊 · <span class="grad">可追溯数据</span></h1>
          <div class="res-metrics-lite">
            <div class="m">
              <div class="n ok">99.3%</div>
              <div class="l">真实性通过率</div>
            </div>
            <div class="m">
              <div class="n warn">0.42%</div>
              <div class="l">可疑样本</div>
            </div>
            <div class="m">
              <div class="n block">372</div>
              <div class="l">已拦截作弊</div>
            </div>
          </div>
        <ul class="res-points">
          <li>行为速率分析 · 异常节奏</li>
          <li>答案熵评估 · 模式检测</li>
          <li>设备/IP 去重 · 指纹聚合</li>
          <li>版本快照留痕 · 哈希追溯</li>
          <li>请求签名校验 · 防篡改</li>
          <li>差分隐私保护 · 最小可见</li>
        </ul>
          <!-- 核心检测能力胶囊（方向1：价值→能力→保障） -->
          <ul class="res-tags" v-if="mode==='research'">
            <li v-for="item in researchDetect" :key="item.key" :title="item.tip">{{ item.label }}</li>
          </ul>
          <div class="res-qbar">
            <div class="line">
              <span class="seg pass" style="width:80%"></span>
              <span class="seg review" style="width:15%"></span>
              <span class="seg risk" style="width:5%"></span>
            </div>
            <div class="labs">
              <span>合格 80%</span><span>复核 15%</span><span>风险 5%</span>
            </div>
          </div>
        <div class="res-footer">©2025 科研数据协同实验室 | 真实数据不造假</div>
      </div>
    </div>
    <div class="form-side">
      <div class="mode-tabs">
        <button class="mtab" :class="{on:mode==='enterprise'}" @click="mode='enterprise'">企业</button>
        <button class="mtab" :class="{on:mode==='government'}" @click="mode='government'">政务</button>
        <button class="mtab" :class="{on:mode==='research'}" @click="mode='research'">科研</button>
      </div>
      <div class="panel" :class="panelClass">
        <template v-if="mode==='enterprise'">
          <h2 class="panel-title">统一安全门户(企业)</h2>
        </template>
        <template v-else-if="mode==='government'">
          <div class="panel-strip"></div>
          <h2 class="panel-title govr-title">统一安全门户(政务)</h2>
        </template>
        <template v-else>
          <div class="panel-strip res"></div>
          <h2 class="panel-title res-title-h">统一安全门户(科研)</h2>
        </template>
        <el-radio-group v-model="role" size="small" class="role-switch">
          <el-radio-button label="user">用户</el-radio-button>
          <el-radio-button label="admin">管理员</el-radio-button>
        </el-radio-group>
        <el-form :model="form" ref="formRef" @keyup.enter="login" class="login-form" :rules="rules" label-position="top">
          <el-form-item label="账号" prop="username">
            <el-input v-model="form.username" autocomplete="username" placeholder="请输入账号" clearable />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" :type="showPwd ? 'text':'password'" autocomplete="current-password" placeholder="请输入密码">
              <template #suffix>
                <el-icon class="pwd-eye" @click="showPwd = !showPwd" style="cursor:pointer;">
                  <span v-if="showPwd">🙈</span>
                  <span v-else>👁️</span>
                </el-icon>
              </template>
            </el-input>
          </el-form-item>
          <!-- 验证码占位（仅政务） -->
          <el-form-item v-if="mode==='government'" label="验证码">
            <div class="captcha-wrap">
              <el-input v-model="captcha" placeholder="输入右侧字符" maxlength="6" />
              <div class="captcha-box" @click="refreshCaptcha" :title="'点击刷新验证码'">
                <span v-for="(ch,i) in captchaChars" :key="i" class="cap-ch" :style="charStyle(ch)">{{ ch.c }}</span>
              </div>
            </div>
          </el-form-item>
          <div class="form-extra">
            <el-checkbox v-model="remember">记住我</el-checkbox>
            <a class="link" href="#" @click.prevent="forgot">忘记密码?</a>
          </div>
          <el-button class="login-btn" type="primary" :loading="loading" @click="login" round>登录</el-button>
          <div class="quick-links">
            <span>没有账号？<a href="#" @click.prevent="register">申请开通</a></span>
          </div>
          <transition name="fade">
            <div v-if="error" class="err-box">{{ error }}</div>
          </transition>
        </el-form>
        <div class="security-badges" v-if="mode==='enterprise'">
          <span class="badge">TLS1.2+</span>
          <span class="badge">RBAC</span>
          <span class="badge">审计</span>
          <span class="badge">加密</span>
        </div>
        <template v-else-if="mode==='government'"></template>
        <ul class="res-points-foot" v-else>
          <li v-for="s in researchSecurity" :key="s.key" :title="s.tip">{{ s.label }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
const router = useRouter()
const authStore = useAuthStore()
const role = ref<'user'|'admin'>('user')
// 模式: enterprise | government | research
const mode = ref<'enterprise'|'government'|'research'>('enterprise')
const shellClasses = computed(()=> ({ 'gov-red': mode.value==='government', 'res-mode': mode.value==='research' }))
const panelClass = computed(()=> ({ govr: mode.value==='government', research: mode.value==='research' }))
const captcha = ref('')
const captchaCode = ref('A7X3K9')
// 科研模式：核心检测能力（不超过6），安全保障（4）
interface Feature { key:string; label:string; tip:string }
const researchDetect:Feature[] = [
  { key:'rate', label:'行为速率分析', tip:'检测访问/答题频率突增及异常节奏' },
  { key:'entropy', label:'答案欺骗检测', tip:'基于答案分布/熵差异识别模板化或作弊' },
  { key:'pattern', label:'模式异常识别', tip:'聚类序列&时间间隔特征定位可疑批量' },
  { key:'device', label:'设备/IP 去重', tip:'识别同端多账号与代理/高频切换' },
  { key:'hash', label:'版本哈希追溯', tip:'问卷结构变更留痕，可回溯任意快照' },
  { key:'sign', label:'签名防篡改', tip:'请求载荷签名 + 重放拦截保障完整性' }
]
const researchSecurity:Feature[] = [
  { key:'encrypt', label:'全链路加密', tip:'TLS + 静态加密，敏感字段再加密/分段' },
  { key:'mask', label:'脱敏存储', tip:'PII/敏感值散列或掩码化，最小可见域' },
  { key:'finger', label:'行为指纹', tip:'多维指纹(设备/环境/交互)融合唯一性' },
  { key:'ai', label:'AI反作弊', tip:'模型判别批量/异常模式并实时加权' }
]
interface CaptChar { c:string; r:number; y:number; s:number; skew:number; color:string }
const captchaChars = ref<CaptChar[]>([])
const buildCaptchaChars = (code:string):CaptChar[] => code.split('').map(c=>({
  c,
  r: Math.random()*40 - 20,
  y: Math.random()*6 - 3,
  s: Math.random()*0.25 + 0.9,
  skew: Math.random()*16 - 8,
  color: ['#8f161a','#b32024','#7c1216','#a42a2e','#c93a30','#d9a441'][Math.floor(Math.random()*6)]
}))
const charStyle = (o:CaptChar) => `transform:translateY(${o.y}px) rotate(${o.r}deg) skewX(${o.skew}deg) scale(${o.s}); color:${o.color};`
const refreshCaptcha = ()=> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  captchaCode.value = Array.from({length:5},()=>chars[Math.floor(Math.random()*chars.length)]).join('')
  captchaChars.value = buildCaptchaChars(captchaCode.value)
}
const showPwd = ref(false)
const remember = ref(true)
const loading = ref(false)
const error = ref('')
const formRef = ref()
const form = reactive({ username:'', password:'' })
const rules = {
  username: [{ required:true, message:'请输入账号', trigger:'blur' }],
  password: [{ required:true, message:'请输入密码', trigger:'blur' }]
}
const goHome = ()=> router.push('/')
const forgot = ()=> { error.value='请联系管理员重置密码'; setTimeout(()=> error.value='', 2500) }
const register = ()=> { error.value='请提交工单申请开通'; setTimeout(()=> error.value='', 2500) }
const login = async () => {
  if(!formRef.value) return
  await formRef.value.validate()
  loading.value = true
  error.value=''
  try {
    await authStore.login(form.username, form.password)
    if(remember.value) localStorage.setItem('rememberUser', form.username)
    const redirect = (router.currentRoute.value.query.redirect as string) || '/user-dashboard'
    router.push(redirect)
  } catch(e:any){
    error.value = e.response?.data?.error?.message || e.response?.data?.msg || '登录失败'
  } finally {
    loading.value = false
  }
}
// 载入记住的用户名
const remembered = localStorage.getItem('rememberUser')
if(remembered) form.username = remembered
refreshCaptcha()
</script>
<style scoped>
*:focus { outline: none; }
.login-shell { display:flex; min-height:100vh; background:linear-gradient(120deg,#eef3ff,#f5f7fb 55%,#f0f4ff); font-family: system-ui,-apple-system,Segoe UI,Roboto,sans-serif; }
/* 红金政务模式根背景 */
.login-shell.gov-red { background:#f5f6f8; color:#2d2f33; }
.brand-side { flex:1.05; display:flex; align-items:center; padding:60px 64px 48px; position:relative; overflow:hidden; }
.brand-side:before { content:""; position:absolute; inset:0; background:radial-gradient(circle at 20% 30%,rgba(99,155,255,.35),transparent 60%), radial-gradient(circle at 85% 70%,rgba(35,108,255,.25),transparent 65%); }
/* 政务风格光影更克制 */
/* GOV RED LEFT */
.gov-side { flex:1.05; display:flex; align-items:stretch; padding:54px 58px 46px; position:relative; }
.govr-inner { max-width:520px; display:flex; flex-direction:column; gap:26px; }
.govr-head { display:flex; gap:18px; align-items:center; }
.seal { width:62px; height:62px; border-radius:50%; background:linear-gradient(140deg,#8f161a,#b32024 60%,#c93a30); position:relative; display:flex; align-items:center; justify-content:center; color:#fff; font-size:26px; font-weight:600; box-shadow:0 4px 14px -6px rgba(139,25,25,.45); }
.seal:after { content:""; position:absolute; inset:4px; border:2px solid rgba(217,164,65,.65); border-radius:50%; }
.govr-titles .cn { font-size:24px; font-weight:600; letter-spacing:.5px; color:#13202a; }
.govr-titles .en { font-size:12px; color:#9d8546; margin-top:4px; letter-spacing:.5px; font-weight:500; }
.govr-ann { background:#f8e8c2; border:1px solid #e9c888; padding:10px 14px; border-radius:10px; font-size:13px; line-height:1.45; position:relative; color:#56401e; }
.govr-ann:before { content:""; position:absolute; left:0; top:0; bottom:0; width:4px; background:#b32024; border-radius:10px 0 0 10px; }
.govr-guides { list-style:none; padding:4px 0 0; margin:0; display:flex; flex-direction:column; gap:10px; font-size:13px; color:#2d2f33; counter-reset:govrstep; position:relative; }
.govr-guides li { counter-increment:govrstep; position:relative; padding:10px 14px 10px 54px; line-height:1.5; background:#fffdf9; border:1px solid #eadfc9; border-radius:14px; box-shadow:0 2px 4px -2px rgba(150,120,40,.12); }
.govr-guides li:before { content:counter(govrstep); position:absolute; left:16px; top:50%; transform:translateY(-50%); width:28px; height:28px; border-radius:50%; background:linear-gradient(135deg,#d9a441,#f2d285); display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:600; color:#7c1216; box-shadow:0 2px 6px -2px rgba(160,120,30,.35); }
.govr-guides li:after { content:""; position:absolute; left:30px; top:100%; width:2px; height:14px; background:linear-gradient(#e3d2ab,#e9ddc4); }
.govr-guides li:last-child:after { display:none; }
.govr-guides li:hover { border-color:#d9a441; box-shadow:0 4px 10px -4px rgba(150,110,30,.3); }
.login-shell.gov-red .govr-guides li { background:#fff9f1; }
.govr-secbox { background:#ffffff; border:1px solid #e2e4e8; padding:16px 18px 18px; border-radius:14px; }
.govr-secbox .desc { margin:12px 0 0; font-size:12px; line-height:1.55; color:#555d66; }
.badges-line { display:flex; flex-wrap:wrap; gap:8px; }
.s-badge { background:#faf7ef; border:1px solid #e2d6b8; padding:4px 10px; border-radius:18px; font-size:11.5px; color:#8f5d00; font-weight:500; }
.govr-footer { margin-top:auto; font-size:11px; color:#6b737c; padding-top:14px; border-top:1px solid #e2e4e8; }
.brand-inner { position:relative; z-index:2; max-width:440px; }
.logo { font-size:34px; font-weight:700; letter-spacing:1px; background:linear-gradient(90deg,#2d5bff,#639bff); -webkit-background-clip:text; color:transparent; cursor:pointer; }
.login-shell.gov-red .logo { background:linear-gradient(90deg,#b32024,#d9a441); }
.tagline { margin:28px 0 18px; font-size:26px; line-height:1.3; font-weight:600; }
.tagline.ent { margin-top:32px; }
.tagline .g { background:linear-gradient(90deg,#2d5bff,#46d3ff); -webkit-background-clip:text; color:transparent; }
.login-shell.gov-red .tagline .g { background:linear-gradient(90deg,#b32024,#d9a441); }
.selling { list-style:none; padding:0; margin:0 0 40px; display:flex; flex-direction:column; gap:14px; font-size:14px; }
.selling li { background:rgba(255,255,255,0.55); border:1px solid #e3ecff; backdrop-filter:blur(6px); padding:10px 14px; border-radius:12px; line-height:1.45; box-shadow:0 4px 16px -6px rgba(36,107,255,.25); }
.login-shell.gov-red .selling li { background:rgba(255,255,255,.75); border-color:#d2dde9; box-shadow:0 4px 14px -6px rgba(30,70,120,.22); }
.selling.v2 { gap:10px; margin-top:34px; margin-bottom:46px; }
.selling.v2 li { display:flex; align-items:center; gap:10px; background:linear-gradient(90deg,rgba(42,114,255,.08),rgba(42,114,255,0)); padding:10px 16px 11px; border-radius:14px; border:1px solid rgba(42,114,255,.18); box-shadow:none; font-size:13px; position:relative; overflow:hidden; }
.selling.v2 li:before { content:""; position:absolute; inset:0; background:radial-gradient(circle at 8% 50%,rgba(42,114,255,.18),rgba(42,114,255,0) 65%); pointer-events:none; }
.selling.v2 .ic { font-size:16px; line-height:1; filter:grayscale(.1); }
.selling.v2 .tt { font-weight:650; font-size:13px; letter-spacing:.5px; color:#1d2f4d; position:relative; }
.selling.v2 .desc { font-size:12px; color:#4a6075; letter-spacing:.3px; }
.selling.v2 li:hover { border-color:rgba(42,114,255,.35); background:linear-gradient(90deg,rgba(42,114,255,.12),rgba(42,114,255,0)); }
.footer-note { font-size:12px; opacity:.65; }

.form-side { width:480px; max-width:100%; display:flex; align-items:center; justify-content:center; padding:32px 48px; position:relative; }
.mode-toggle { position:absolute; top:18px; right:22px; }
.panel { width:100%; background:#fff; border-radius:28px; padding:46px 50px 50px; box-shadow:0 12px 40px -10px rgba(0,40,140,.15),0 4px 20px -6px rgba(0,0,0,.08); position:relative; overflow:hidden; }
.panel:before { content:""; position:absolute; inset:0; background:linear-gradient(120deg,rgba(79,139,255,.12),rgba(127,174,255,.07)); opacity:.85; pointer-events:none; }
.login-shell.gov-red .panel.govr { background:#ffffff; box-shadow:0 8px 30px -14px rgba(0,0,0,.18); border-radius:26px; }
.login-shell.gov-red .panel.govr:before { background:linear-gradient(135deg,rgba(179,32,36,.08),rgba(217,164,65,.06)); opacity:1; }
.login-shell.gov-red .panel.govr .panel-strip { height:4px; background:linear-gradient(90deg,#8f161a,#b32024 55%,#d9a441); border-radius:4px; margin-bottom:14px; }
.govr-title { margin:0 0 16px; font-size:20px; font-weight:600; letter-spacing:.5px; color:#8f161a; }
.panel-title { margin:0 0 18px; font-size:22px; font-weight:600; letter-spacing:.5px; }
.role-switch { margin-bottom:18px; }
.login-form { margin-top:6px; }
.form-extra { display:flex; justify-content:space-between; align-items:center; margin:4px 0 14px; font-size:13px; }
.link { color:#2d5bff; text-decoration:none; }
.link:hover { text-decoration:underline; }
.login-shell.gov-red .link { color:var(--g-brand); }
.login-shell.gov-red .link:hover { color:var(--g-brand-h); }
.login-btn { width:100%; margin-top:4px; font-size:15px; letter-spacing:1px; }
.quick-links { text-align:center; margin-top:18px; font-size:13px; color:#5a6375; }
.login-shell.gov-red .quick-links { color:#5f6570; }
.err-box { margin-top:16px; background:#ffe4e4; border:1px solid #ffb6b6; color:#b40000; padding:10px 14px; border-radius:10px; font-size:13px; }
.login-shell.gov-red .err-box { background:#fce9e9; border-color:#e9b1b1; color:#8f161a; }
.security-badges { display:flex; gap:10px; flex-wrap:wrap; margin-top:28px; }
.badge { background:#f1f6ff; color:#2d5bff; padding:4px 10px; border-radius:30px; font-size:12px; font-weight:500; border:1px solid #d0e2ff; }
.login-shell.gov-red .badge { background:#ecf1f6; color:#1d3e74; border-color:#c2d4e8; }

/* 验证码与政务列表 */
.captcha-wrap { display:flex; gap:10px; }
/* 验证码视觉强化 */
.captcha-box { width:118px; height:42px; background:#fff; border:1px solid #d9a441; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:18px; cursor:pointer; user-select:none; position:relative; color:#8f161a; overflow:hidden; gap:4px; }
/* 取消右下角提示文字 */
.captcha-box:after { content:""; }
.captcha-box:before { content:""; position:absolute; inset:0; background:
  repeating-linear-gradient(45deg,rgba(179,32,36,.15) 0 6px,transparent 6px 12px),
  repeating-linear-gradient(-45deg,rgba(217,164,65,.12) 0 5px,transparent 5px 10px);
  mix-blend-mode:multiply; opacity:.35; pointer-events:none; }
.captcha-box .cap-ch { font-family: 'Courier New', monospace; display:inline-block; letter-spacing:0; }
.captcha-box:hover { animation:cap-wobble .5s ease-in-out; }
@keyframes cap-wobble { 0%{transform:rotate(0);}25%{transform:rotate(-2deg) translateY(-1px);}50%{transform:rotate(2deg) translateY(1px);}75%{transform:rotate(-1.5deg);}100%{transform:rotate(0);} }
/* 政务功能点美化：卡片式检查条目 */
/* 政务面板要点：紧凑两列卡片 */
.govr-points { list-style:none; padding:18px 0 0; margin:0; display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px 14px; font-size:12px; color:#3e454d; }
.govr-points li { position:relative; padding:10px 12px 10px 34px; line-height:1.4; background:#fffaf3; border:1px solid #ead9b8; border-radius:14px; box-shadow:0 2px 4px -2px rgba(140,90,10,.12); transition:.25s; min-height:48px; display:flex; align-items:center; }
.govr-points li:before { content:""; position:absolute; left:12px; top:50%; width:16px; height:16px; margin-top:-8px; border-radius:50%; background:linear-gradient(135deg,#d9a441,#f2d285); box-shadow:0 2px 4px -2px rgba(150,110,20,.35); }
.govr-points li:after { content:"✔"; position:absolute; left:16px; top:50%; margin-top:-8px; font-size:10px; color:#7c1216; font-weight:600; }
.govr-points li:hover { border-color:#d9a441; box-shadow:0 5px 12px -6px rgba(140,90,10,.35); transform:translateY(-2px); }
.govr-points li:active { transform:translateY(-1px); }
.login-shell.gov-red .govr-points li { background:#fff9f1; }
/* 左侧独立 gov 要点列表适度放宽宽度并减少高度 */
.govr-points.embed { padding:14px 2px 0; }
.govr-points.embed li { background:#fffdf9; }
@media (max-width:520px){
  .govr-points { grid-template-columns:1fr; }
  .govr-points li { min-height:44px; }
}

/* Primary 按钮政务严格版覆盖 */
/* 政务红按钮 */
/* GOV RED 主题变量覆盖 */
.login-shell.gov-red{ --g-brand:#b32024; --g-brand-d:#8f161a; --g-brand-h:#c7382d; --g-accent:#d9a441; --g-bg-soft:#f8f0e6; --g-border:#e5e2da; --g-text:#232527; --g-muted:#6b737c; }
.login-shell.gov-red{ --el-color-primary:#b32024; --el-color-primary-light-3:#c95049; --el-color-primary-light-5:#d8716b; --el-color-primary-light-7:#e69a96; --el-color-primary-light-8:#efb4b1; --el-color-primary-light-9:#f8d8d6; --el-color-primary-dark-2:#8f161a; }
/* 主按钮 */
/* 覆盖组件（非 scoped 情况无需 :deep） */
.login-shell.gov-red .el-button--primary{ background:var(--g-brand)!important; border-color:var(--g-brand)!important; border-radius:8px; box-shadow:0 4px 14px -6px rgba(179,32,36,.45); }
.login-shell.gov-red .el-button--primary:hover{ background:linear-gradient(90deg,var(--g-brand),var(--g-brand-h))!important; border-color:var(--g-brand-h)!important; }
.login-shell.gov-red .el-button--primary:active{ background:var(--g-brand-d)!important; border-color:var(--g-brand-d)!important; }
.login-shell.gov-red .el-radio-button__inner{ border-radius:8px!important; border-color:#d4d6da!important; color:var(--g-text); }
.login-shell.gov-red .el-radio-button__original-radio:checked + .el-radio-button__inner{ background:var(--g-brand)!important; border-color:var(--g-brand)!important; color:#fff!important; box-shadow:none!important; }
.login-shell.gov-red .el-radio-button__inner:hover{ color:var(--g-brand); }
.login-shell.gov-red .el-checkbox__inner{ border-radius:4px; }
.login-shell.gov-red .el-checkbox__input.is-checked .el-checkbox__inner{ background:var(--g-brand); border-color:var(--g-brand); }
.login-shell.gov-red .el-checkbox__inner:hover{ border-color:var(--g-brand); }
.login-shell.gov-red .el-switch__core{ --el-switch-off-color:#d3d6db; }
.login-shell.gov-red .el-switch.is-checked .el-switch__core{ background:var(--g-brand); border-color:var(--g-brand); }
.login-shell.gov-red .el-switch.is-checked:hover .el-switch__core{ background:var(--g-brand-h); border-color:var(--g-brand-h); }
.login-shell.gov-red .el-input__wrapper.is-focus{ box-shadow:0 0 0 1px var(--g-brand) inset; }
.login-shell.gov-red .el-input__wrapper:hover{ box-shadow:0 0 0 1px var(--g-brand-h) inset; }
.login-shell.gov-red .el-input__inner::placeholder{ color:#9ca3ab; }
.login-shell.gov-red .quick-links span:hover{ color:var(--g-brand); }
.login-shell.gov-red .captcha-box:hover{ border-color:var(--g-brand); color:var(--g-brand-d); }

/* 全局模式切换定位重置 */
.mode-tabs { position:fixed; top:18px; right:50px; display:flex; flex-direction:row; background:rgba(255,255,255,.78); border:1px solid #d0d6e2; border-radius:12px; overflow:hidden; backdrop-filter:blur(10px) saturate(1.15); box-shadow:0 6px 20px -8px rgba(40,70,130,.22); z-index:1500; }
@media (max-width:640px){ .mode-tabs { top:12px; right:14px; border-radius:10px; } }
/* 企业版全新品牌块 (差异化) */
/* 旧样式已移除，使用扁平化版本 */
.ent-brand.v2 { --ent-glow:#2a72ff; display:flex; flex-direction:column; align-items:flex-start; gap:22px; cursor:pointer; user-select:none; position:relative; padding:8px 4px 4px; background:transparent; border:none; border-radius:0; box-shadow:none; backdrop-filter:none; }
.ent-brand.v2:before, .ent-brand.v2:after { content:none; }
.ent-wordmark { display:flex; flex-direction:column; gap:10px; }
.ent-label { font-size:11px; letter-spacing:.28em; font-weight:600; color:#637791; line-height:1; opacity:.9; }
.ent-title { font-size:0; line-height:1.04; font-weight:800; letter-spacing:.5px; position:relative; display:flex; align-items:flex-end; flex-wrap:wrap; }
.w-main { font-size:44px; color:#1d2f4d; font-weight:770; }
.w-split { display:none; }
.w-suffix { font-size:22px; margin-left:14px; color:#1b4eaa; font-weight:650; padding:6px 14px 7px; background:rgba(42,114,255,.08); border:1px solid rgba(42,114,255,.25); border-radius:14px; box-shadow:none; position:relative; top:-6px; }
.ent-sub { font-size:14px; font-weight:500; color:#314d68; letter-spacing:.4px; padding:0; background:none; }
.ent-badges { display:flex; flex-wrap:wrap; gap:6px; }
.ent-badges .chip { font-size:11px; font-weight:600; letter-spacing:.4px; padding:4px 10px 5px; background:#eef3f9; border:1px solid #d9e4f1; border-radius:10px; color:#1a3e66; position:relative; transition:.18s; line-height:1; }
.ent-badges .chip:hover { background:#e3edf6; }
.ent-metrics { display:flex; flex-wrap:wrap; gap:12px; }
.em-item { --c:#1d2f4d; background:#ffffff; color:#1d2f4d; padding:10px 14px 12px; border-radius:14px; display:flex; align-items:flex-end; gap:8px; position:relative; overflow:hidden; font-weight:600; border:1px solid #d7e2ec; box-shadow:none; }
.em-item .k { font-size:10px; letter-spacing:.18em; color:#2a72ff; font-weight:700; position:relative; top:-1px; }
.em-item .v { font-size:18px; letter-spacing:.3px; font-weight:700; }
.ent-brand.v2:hover .w-suffix { background:rgba(42,114,255,.10); }
.ent-brand.v2:active .w-suffix { transform:translateY(1px); }
.ent-matrix { width:100%; display:flex; flex-direction:column; gap:8px; margin-top:2px; }
.m-head { display:flex; gap:14px; font-size:11px; letter-spacing:.15em; font-weight:600; color:#5b6e82; align-items:center; }
.m-hint { font-weight:500; letter-spacing:.05em; color:#8aa0b8; }
.m-grid { display:grid; grid-template-columns:repeat(4,60px); gap:10px; }
.m-col { display:grid; grid-template-rows:18px repeat(4,14px); gap:6px; }
.m-role { font-size:11px; font-weight:600; letter-spacing:.3px; color:#1d2f4d; }
.m-cell { border-radius:4px; background:#e3eaf1; border:1px solid #d0d9e2; }
.m-cell.grant { background:#2a72ff; border-color:#2a72ff; box-shadow:0 0 0 1px rgba(255,255,255,.5) inset; }
.selling.v2 { gap:8px; margin-top:26px; margin-bottom:30px; }
.selling.v2 li { display:flex; align-items:center; gap:10px; background:#f3f7fb; padding:8px 14px 9px; border-radius:12px; border:1px solid #d7e2ec; box-shadow:none; font-size:13px; position:relative; overflow:hidden; }
.selling.v2 .ic { font-size:16px; line-height:1; filter:grayscale(.15); }
.selling.v2 .tt { font-weight:650; font-size:13px; letter-spacing:.5px; color:#1d2f4d; position:relative; }
.selling.v2 .desc { font-size:12px; color:#4a6075; letter-spacing:.3px; }
.selling.v2 li:hover { border-color:#c7d6e4; background:#eef3f8; }
@media (max-width:1180px){
  .w-main { font-size:40px; }
  .w-suffix { font-size:20px; top:-4px; }
  .ent-brand.v2 { gap:20px; }
}
@media (max-width:980px){
  .w-main { font-size:36px; }
  .w-suffix { font-size:18px; }
  .ent-metrics { gap:8px; }
  .em-item { padding:8px 12px 10px; }
  .m-grid { grid-template-columns:repeat(4,54px); }
}

/* ================= 科研模式（浅色增强版） ================= */
.login-shell.res-mode { background:linear-gradient(180deg,#f5f8fd 0%,#eef2f8 70%,#e9eef5 100%); color:#2f3a4a; }
.research-side { flex:1.05; display:flex; align-items:center; padding:60px 60px 40px; position:relative; overflow:hidden; }
.top-block { display:flex; gap:46px; align-items:center; }
.research-inner { max-width:560px; width:100%; display:flex; flex-direction:column; gap:26px; }
.res-illus { width:210px; height:190px; background:linear-gradient(150deg,#e6eef9,#ffffff); border:1px solid #d8e2ef; border-radius:20px; position:relative; box-shadow:0 6px 18px -8px rgba(40,90,160,.22); }
.res-illus:before,.res-illus:after { content:""; position:absolute; border-radius:16px; backdrop-filter:blur(2px); }
.res-illus:before { left:24px; top:20px; width:110px; height:135px; background:linear-gradient(160deg,#ffffff,#dfe9f6); border:1px solid #d0dae8; box-shadow:0 4px 10px -4px rgba(70,120,200,.22); }
.res-illus:after { right:22px; bottom:22px; width:92px; height:108px; background:linear-gradient(160deg,#ffffff,#e2ebf8); border:1px solid #d0dae8; box-shadow:0 4px 10px -4px rgba(70,120,200,.18); }
.res-logo { font-size:32px; font-weight:600; letter-spacing:.5px; color:#1c4fa0; cursor:pointer; }
.res-logo:hover { color:#2562c6; }
.res-title, .res-headline { margin:6px 0 4px; font-size:30px; line-height:1.25; font-weight:700; color:#1c4fa0; letter-spacing:.5px; }
.res-title .grad, .res-headline .hi { background:linear-gradient(90deg,#1c5fdc,#378bff); -webkit-background-clip:text; color:transparent; }
.res-subline { margin:0; font-size:13px; color:#5b6c80; letter-spacing:.5px; }
/* 指标集合 */
.res-metrics-lite { display:flex; gap:34px; padding:4px 0 0; }
.res-metrics-lite .m { display:flex; flex-direction:column; gap:4px; }
.res-metrics-lite .n { font-size:22px; font-weight:600; letter-spacing:.5px; }
.res-metrics-lite .n.ok { background:linear-gradient(90deg,#1dbb90,#33a4ff); -webkit-background-clip:text; color:transparent; }
.res-metrics-lite .n.warn { background:linear-gradient(90deg,#ffb347,#ff7a3d); -webkit-background-clip:text; color:transparent; }
.res-metrics-lite .n.block { background:linear-gradient(90deg,#ff4d67,#ff9340); -webkit-background-clip:text; color:transparent; }
.res-metrics-lite .l { font-size:11px; color:#6a7a8c; letter-spacing:.5px; }
/* 科研要点主列表美化 */
.res-points { list-style:none; padding:4px 0 0; margin:4px 0 2px; display:grid; grid-template-columns:repeat(2, minmax(220px,1fr)); gap:6px 26px; font-size:13px; color:#2f3a4a; letter-spacing:.2px; }
.res-points li { position:relative; line-height:1.3; padding-left:18px; font-weight:500; }
.res-points li:before { content:""; position:absolute; left:0; top:7px; width:8px; height:8px; border-radius:50%; background:linear-gradient(120deg,#1c5fdc,#49b2ff); box-shadow:0 0 0 3px rgba(28,95,220,.18); }
.res-points li:hover { color:#1c5fdc; }
@media (max-width:880px){ .res-points { grid-template-columns:1fr; } }
/* 科研品牌标题增强 */
.res-brand { display:flex; gap:16px; align-items:center; cursor:pointer; user-select:none; position:relative; }
.res-mark { width:54px; height:54px; border-radius:16px; background:linear-gradient(135deg,#1c5fdc,#49b2ff); display:flex; align-items:center; justify-content:center; color:#fff; font-size:24px; font-weight:700; box-shadow:0 6px 18px -6px rgba(28,95,220,.45); letter-spacing:2px; }
.res-name { position:relative; display:flex; flex-direction:column; gap:4px; }
.res-name-cn { font-size:30px; font-weight:700; letter-spacing:.5px; color:#1c4fa0; }
.res-name-cn .ver { font-size:18px; font-weight:600; margin-left:4px; background:linear-gradient(90deg,#1c5fdc,#378bff); -webkit-background-clip:text; color:transparent; }
.res-name-en { font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#5b6c80; font-weight:500; }
.res-underline { position:absolute; left:0; bottom:-6px; height:4px; width:150px; background:linear-gradient(90deg,#1c5fdc,#49b2ff,#1dbb90); border-radius:4px; box-shadow:0 2px 6px -2px rgba(28,95,220,.45); }
.res-brand:hover .res-mark { transform:translateY(-2px); box-shadow:0 10px 24px -8px rgba(28,95,220,.5); }
.res-brand:active .res-mark { transform:translateY(0); }
/* 标签 */
.res-tags { list-style:none; padding:0; margin:2px 0 0; display:flex; flex-wrap:wrap; gap:10px 14px; }
.res-tags li { background:#ffffff; border:1px solid #d8e2ef; padding:6px 12px; border-radius:16px; font-size:12px; color:#34506c; box-shadow:0 2px 4px -2px rgba(50,90,150,.15); transition:.2s; }
.res-tags li:hover { border-color:#1c5fdc; color:#1c5fdc; }
/* 质量条 */
.res-qbar { margin:2px 0 0; }
.res-qbar .line { display:flex; height:12px; border-radius:8px; overflow:hidden; background:#dfe6ef; }
.res-qbar .seg.pass { background:linear-gradient(90deg,#1dbb90,#33a4ff); }
.res-qbar .seg.review { background:linear-gradient(90deg,#ffb347,#ff7a3d); }
.res-qbar .seg.risk { background:linear-gradient(90deg,#ff4d67,#ff2244); }
.res-qbar .labs { display:flex; justify-content:space-between; font-size:11px; color:#5b6c80; margin-top:4px; }
/* 科研底部精简特性列表美化 */
.res-points-foot { list-style:none; margin:18px 0 0; padding:0; display:flex; flex-wrap:wrap; gap:10px 14px; }
.res-points-foot li { position:relative; font-size:12px; padding:6px 14px 6px 26px; background:linear-gradient(150deg,#ffffff,#f0f5fb); border:1px solid #d6e1ee; border-radius:18px; color:#34506c; letter-spacing:.5px; box-shadow:0 3px 6px -3px rgba(50,90,150,.18); line-height:1.2; font-weight:500; cursor:default; transition:.25s; }
.res-points-foot li:before { content:""; width:10px; height:10px; border-radius:50%; background:linear-gradient(90deg,#1c5fdc,#49b2ff); position:absolute; left:10px; top:50%; transform:translateY(-50%); box-shadow:0 0 0 3px rgba(28,95,220,.18); }
.res-points-foot li:hover { border-color:#1c5fdc; color:#1c5fdc; box-shadow:0 4px 10px -4px rgba(28,95,220,.4); }
.res-points-foot li:focus-visible { outline:2px solid #1c5fdc; outline-offset:2px; }
.login-shell.res-mode .res-points-foot li { background:linear-gradient(150deg,#ffffff,#f3f8fe); }
/* 右侧科研面板 */
.login-shell.res-mode .panel.research { background:#ffffff; border:1px solid #d7e0eb; box-shadow:0 10px 36px -12px rgba(60,100,160,.25); }
.login-shell.res-mode .panel.research:before { background:linear-gradient(130deg,rgba(100,150,255,.07),rgba(255,255,255,0)); opacity:1; }
.login-shell.res-mode .panel.research .panel-strip.res { height:4px; background:linear-gradient(90deg,#1c5fdc,#67b5ff); border-radius:4px; margin-bottom:16px; }
.panel-title.res-title-h { color:#1f406a; }
/* 交互与控件 */
.login-shell.res-mode .el-button--primary { background:linear-gradient(90deg,#1c5fdc,#459dff)!important; border:none; box-shadow:0 4px 14px -6px rgba(28,95,220,.45); }
.login-shell.res-mode .el-button--primary:hover { background:linear-gradient(90deg,#1d63e7,#52a9ff)!important; }
.login-shell.res-mode .el-input__wrapper.is-focus { box-shadow:0 0 0 1px #1c5fdc inset; }
.login-shell.res-mode .el-input__wrapper:hover { box-shadow:0 0 0 1px #52a9ff inset; }
.login-shell.res-mode .el-radio-button__inner { background:#f4f7fb; border:1px solid #d6dee9; color:#4b5d72; }
.login-shell.res-mode .el-radio-button__original-radio:checked + .el-radio-button__inner { background:#1c5fdc!important; border-color:#1c5fdc!important; color:#fff!important; }
.login-shell.res-mode .el-radio-button__inner:hover { color:#1c5fdc; }
.login-shell.res-mode .el-checkbox__input.is-checked .el-checkbox__inner { background:#1c5fdc; border-color:#1c5fdc; }
.login-shell.res-mode .quick-links { color:#5b6c80; }
.login-shell.res-mode .quick-links span:hover { color:#1c5fdc; }
.login-shell.res-mode .mode-tabs { background:rgba(255,255,255,.85); border:1px solid #d0dae6; }
.login-shell.res-mode .mtab { color:#527095; }
.login-shell.res-mode .mtab.on { background:#1c5fdc; color:#fff; box-shadow:0 2px 6px -2px rgba(28,95,220,.45); }
.login-shell.gov-red .mode-tabs { background:#fff3f3; border-color:#e4c8c8; }
/* 统一科研浅色 tabs 样式（覆盖旧深色） */
.login-shell.res-mode .mode-tabs { background:rgba(255,255,255,.85); border:1px solid #d0dae6; box-shadow:0 4px 14px -8px rgba(40,90,160,.18); }
.mtab { padding:6px 16px; font-size:12px; border:none; cursor:pointer; background:transparent; color:#495468; font-weight:500; position:relative; transition:.25s; }
.mtab.on { background:linear-gradient(90deg,#1c5fdc,#459dff); color:#fff; box-shadow:0 2px 6px -2px rgba(28,95,220,.45); }
.login-shell.gov-red .mtab { color:#7a3030; }
.login-shell.gov-red .mtab.on { background:#b32024; color:#fff; box-shadow:0 2px 6px -2px rgba(179,32,36,.45); }
.login-shell.res-mode .mtab { color:#527095; }
.login-shell.res-mode .mtab.on { background:linear-gradient(90deg,#1c5fdc,#459dff); color:#fff; box-shadow:0 2px 6px -2px rgba(28,95,220,.45); }
.mtab:hover:not(.on) { color:#1c5fdc; }
.mode-tabs:focus-within { box-shadow:0 0 0 2px rgba(28,95,220,.25); }
.mtab:focus-visible { outline:2px solid #1c5fdc; outline-offset:-2px; }

/* Primary 按钮政务配色覆盖 */
:deep(.login-shell.gov .el-button--primary){ background:#1d3e74; border-color:#1d3e74; }
:deep(.login-shell.gov .el-button--primary:hover){ background:#2c588f; border-color:#2c588f; }

/* Animations */
.fade-enter-active,.fade-leave-active { transition:opacity .3s; }
.fade-enter-from,.fade-leave-to { opacity:0; }

@media (max-width:1080px){
  .login-shell { flex-direction:column; }
  .brand-side { padding:48px 40px 24px; }
  .form-side { width:100%; padding:0 32px 40px; }
  .panel { padding:40px 42px 46px; }
}
@media (max-width:640px){
  .brand-side { padding:40px 26px 10px; }
  .tagline { font-size:22px; }
  .selling li { font-size:13px; }
  .panel { padding:34px 30px 40px; border-radius:24px; }
}
</style>
