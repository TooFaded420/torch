import type { TemplateContext } from '../types';
import { getHostConfig } from '../../../hosts/index';

export function generatePreambleBash(ctx: TemplateContext): string {
  const hostConfig = getHostConfig(ctx.host);
  const runtimeRoot = hostConfig.usesEnvVars
    ? `_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
torch_ROOT="$HOME/${hostConfig.globalRoot}"
[ -n "$_ROOT" ] && [ -d "$_ROOT/${ctx.paths.localSkillRoot}" ] && torch_ROOT="$_ROOT/${ctx.paths.localSkillRoot}"
torch_BIN="$torch_ROOT/bin"
torch_BROWSE="$torch_ROOT/browse/dist"
torch_DESIGN="$torch_ROOT/design/dist"
`
    : '';

  return `## Preamble (run first)

\`\`\`bash
${runtimeRoot}_UPD=$(${ctx.paths.binDir}/torch-update-check 2>/dev/null || ${ctx.paths.localSkillRoot}/bin/torch-update-check 2>/dev/null || true)
[ -n "$_UPD" ] && echo "$_UPD" || true
mkdir -p ~/.torch/sessions
touch ~/.torch/sessions/"$PPID"
_SESSIONS=$(find ~/.torch/sessions -mmin -120 -type f 2>/dev/null | wc -l | tr -d ' ')
find ~/.torch/sessions -mmin +120 -type f -exec rm {} + 2>/dev/null || true
_PROACTIVE=$(${ctx.paths.binDir}/torch-config get proactive 2>/dev/null || echo "true")
_PROACTIVE_PROMPTED=$([ -f ~/.torch/.proactive-prompted ] && echo "yes" || echo "no")
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
_SKILL_PREFIX=$(${ctx.paths.binDir}/torch-config get skill_prefix 2>/dev/null || echo "false")
echo "PROACTIVE: $_PROACTIVE"
echo "PROACTIVE_PROMPTED: $_PROACTIVE_PROMPTED"
echo "SKILL_PREFIX: $_SKILL_PREFIX"
source <(${ctx.paths.binDir}/torch-repo-mode 2>/dev/null) || true
REPO_MODE=\${REPO_MODE:-unknown}
echo "REPO_MODE: $REPO_MODE"
_SESSION_KIND=$(${ctx.paths.binDir}/torch-session-kind 2>/dev/null || echo "interactive")
case "$_SESSION_KIND" in spawned|headless|interactive) ;; *) _SESSION_KIND="interactive" ;; esac
echo "SESSION_KIND: $_SESSION_KIND"
# Conductor host: AskUserQuestion is unreliable here (native disabled, MCP
# variant flaky), so skills render decisions as prose instead of calling the
# tool. Gated on !headless so an eval/CI run INSIDE Conductor (torch_HEADLESS)
# still BLOCKs rather than rendering prose to nobody.
if [ "$_SESSION_KIND" != "headless" ] && { [ -n "\${CONDUCTOR_WORKSPACE_PATH:-}" ] || [ -n "\${CONDUCTOR_PORT:-}" ]; }; then
  echo "CONDUCTOR_SESSION: true"
fi
_ACTIVATED=$([ -f ~/.torch/.activated ] && echo "yes" || echo "no")
_FIRST_LOOP_SHOWN=$([ -f ~/.torch/.first-loop-tip-shown ] && echo "yes" || echo "no")
echo "ACTIVATED: $_ACTIVATED"
echo "FIRST_LOOP_SHOWN: $_FIRST_LOOP_SHOWN"
# First-run project detection: run the detector ONLY on the first-ever skill run
# (ACTIVATED=no, interactive) so it stays off the hot path for every run after.
_FIRST_TASK=""
if [ "$_ACTIVATED" = "no" ] && [ "$_SESSION_KIND" != "headless" ]; then
  _FIRST_TASK=$(${ctx.paths.binDir}/torch-first-task-detect 2>/dev/null || true)
fi
echo "FIRST_TASK: $_FIRST_TASK"
_LAKE_SEEN=$([ -f ~/.torch/.completeness-intro-seen ] && echo "yes" || echo "no")
echo "LAKE_INTRO: $_LAKE_SEEN"
_TEL=$(${ctx.paths.binDir}/torch-config get telemetry 2>/dev/null || true)
_TEL_PROMPTED=$([ -f ~/.torch/.telemetry-prompted ] && echo "yes" || echo "no")
_TEL_START=$(date +%s)
_SESSION_ID="$$-$(date +%s)"
echo "TELEMETRY: \${_TEL:-off}"
echo "TEL_PROMPTED: $_TEL_PROMPTED"
_EXPLAIN_LEVEL=$(${ctx.paths.binDir}/torch-config get explain_level 2>/dev/null || echo "default")
if [ "$_EXPLAIN_LEVEL" != "default" ] && [ "$_EXPLAIN_LEVEL" != "terse" ]; then _EXPLAIN_LEVEL="default"; fi
echo "EXPLAIN_LEVEL: $_EXPLAIN_LEVEL"
_QUESTION_TUNING=$(${ctx.paths.binDir}/torch-config get question_tuning 2>/dev/null || echo "false")
echo "QUESTION_TUNING: $_QUESTION_TUNING"
mkdir -p ~/.torch/analytics
if [ "$_TEL" != "off" ]; then
echo '{"skill":"${ctx.skillName}","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(_repo=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null | tr -cd 'a-zA-Z0-9._-'); echo "\${_repo:-unknown}")'"}'  >> ~/.torch/analytics/skill-usage.jsonl 2>/dev/null || true
fi
for _PF in $(find ~/.torch/analytics -maxdepth 1 -name '.pending-*' 2>/dev/null); do
  if [ -f "$_PF" ]; then
    if [ "$_TEL" != "off" ] && [ -x "${ctx.paths.binDir}/torch-telemetry-log" ]; then
      ${ctx.paths.binDir}/torch-telemetry-log --event-type skill_run --skill _pending_finalize --outcome unknown --session-id "$_SESSION_ID" 2>/dev/null || true
    fi
    rm -f "$_PF" 2>/dev/null || true
  fi
  break
done
eval "$(${ctx.paths.binDir}/torch-slug 2>/dev/null)" 2>/dev/null || true
_LEARN_FILE="\${torch_HOME:-$HOME/.torch}/projects/\${SLUG:-unknown}/learnings.jsonl"
if [ -f "$_LEARN_FILE" ]; then
  _LEARN_COUNT=$(wc -l < "$_LEARN_FILE" 2>/dev/null | tr -d ' ')
  echo "LEARNINGS: $_LEARN_COUNT entries loaded"
  if [ "$_LEARN_COUNT" -gt 5 ] 2>/dev/null; then
    ${ctx.paths.binDir}/torch-learnings-search --limit 3 2>/dev/null || true
  fi
else
  echo "LEARNINGS: 0"
fi
${ctx.paths.binDir}/torch-timeline-log '{"skill":"${ctx.skillName}","event":"started","branch":"'"$_BRANCH"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null &
_HAS_ROUTING="no"
if [ -f CLAUDE.md ] && grep -q "## Skill routing" CLAUDE.md 2>/dev/null; then
  _HAS_ROUTING="yes"
fi
_ROUTING_DECLINED=$(${ctx.paths.binDir}/torch-config get routing_declined 2>/dev/null || echo "false")
echo "HAS_ROUTING: $_HAS_ROUTING"
echo "ROUTING_DECLINED: $_ROUTING_DECLINED"
_VENDORED="no"
if [ -d ".claude/skills/torch" ] && [ ! -L ".claude/skills/torch" ]; then
  if [ -f ".claude/skills/torch/VERSION" ] || [ -d ".claude/skills/torch/.git" ]; then
    _VENDORED="yes"
  fi
fi
echo "VENDORED_torch: $_VENDORED"
echo "MODEL_OVERLAY: ${ctx.model ?? 'none'}"
_CHECKPOINT_MODE=$(${ctx.paths.binDir}/torch-config get checkpoint_mode 2>/dev/null || echo "explicit")
_CHECKPOINT_PUSH=$(${ctx.paths.binDir}/torch-config get checkpoint_push 2>/dev/null || echo "false")
echo "CHECKPOINT_MODE: $_CHECKPOINT_MODE"
echo "CHECKPOINT_PUSH: $_CHECKPOINT_PUSH"
# Plan-mode hint for skills like /spec that branch behavior on plan-mode state.
# Claude Code exposes plan mode via system reminders; we detect best-effort
# from CLAUDE_PLAN_FILE (set by the harness when plan mode is active) and
# fall back to "inactive". Codex hosts and Claude execution mode both end up
# inactive, which is the safe default (defaults to file+execute pipeline).
if [ -n "\${CLAUDE_PLAN_FILE:-}\${torch_PLAN_MODE_FORCE:-}" ]; then
  export torch_PLAN_MODE="active"
elif [ "\${torch_PLAN_MODE:-}" = "active" ]; then
  export torch_PLAN_MODE="active"
else
  export torch_PLAN_MODE="inactive"
fi
echo "torch_PLAN_MODE: $torch_PLAN_MODE"
[ -n "$OPENCLAW_SESSION" ] && echo "SPAWNED_SESSION: true" || true${ctx.host === 'gbrain' || ctx.host === 'hermes' ? `
if command -v gbrain &>/dev/null; then
  _BRAIN_JSON=$(gbrain doctor --fast --json 2>/dev/null || echo '{}')
  _BRAIN_SCORE=$(echo "$_BRAIN_JSON" | grep -o '"health_score":[0-9]*' | cut -d: -f2)
  _BRAIN_FAILS=$(echo "$_BRAIN_JSON" | grep -o '"status":"fail"' | wc -l | tr -d ' ')
  _BRAIN_WARNS=$(echo "$_BRAIN_JSON" | grep -o '"status":"warn"' | wc -l | tr -d ' ')
  echo "BRAIN_HEALTH: \${_BRAIN_SCORE:-unknown} (\${_BRAIN_FAILS:-0} failures, \${_BRAIN_WARNS:-0} warnings)"
  if [ "\${_BRAIN_SCORE:-100}" -lt 50 ] 2>/dev/null; then
    echo "$_BRAIN_JSON" | grep -o '"name":"[^"]*","status":"[^"]*","message":"[^"]*"' || true
  fi
fi` : ''}
\`\`\``;
}
