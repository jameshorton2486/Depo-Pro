# Depo-Pro Environment Variable Diagnostic
# Run: powershell -ExecutionPolicy Bypass -File scripts/test-env-vars.ps1
# Or:  npm run test-env-vars

$ErrorActionPreference = "Continue"
function Write-Pass($msg) { Write-Host "  [PASS] $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red }
function Write-Warn($msg) { Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Write-Info($msg) { Write-Host "  [INFO] $msg" -ForegroundColor Cyan }
function Write-Header($msg) { Write-Host ""; Write-Host "===========" -ForegroundColor White; Write-Host "  $msg" -ForegroundColor White; Write-Host "===========" -ForegroundColor White }
function Parse-EnvFile($path) { $v=@{}; if(Test-Path $path){Get-Content $path|ForEach-Object{$l=$_.Trim();if($l -and !$l.StartsWith("#")){$i=$l.IndexOf("=");if($i -gt 0){$k=$l.Substring(0,$i).Trim();$val=$l.Substring($i+1).Trim().Trim('"').Trim("'");if($k -and $val){$v[$k]=$val}}}}}; return $v }
$allVars=@{}; $fileVars=@{}
Write-Header "ENV FILE DISCOVERY"
foreach($f in @(".env",".env.local",".env.development",".env.production")){if(Test-Path $f){$p=Parse-EnvFile $f;$fileVars[$f]=$p;Write-Pass "$f -- found ($($p.Count) vars)";foreach($k in $p.Keys){$allVars[$k]=@{Value=$p[$k];Source=$f}}}else{Write-Info "$f -- not found"}}
function Get-Var($n){if($allVars.ContainsKey($n)){return $allVars[$n].Value};return $null}
function Get-Src($n){if($allVars.ContainsKey($n)){return $allVars[$n].Source};return "NOT SET"}
function Test-Var($n,$req,$desc,$fix){$v=Get-Var $n;$s=Get-Src $n;if(!$v -or $v -eq "" -or $v -match "^(your|placeholder|PASTE|TODO)"){if($req){Write-Fail "$n -- MISSING";Write-Fail "  WHY: $desc";Write-Fail "  FIX: $fix";return $false}else{Write-Info "$n -- not set ($desc)";return $true}};$m=$v.Substring(0,[Math]::Min(8,$v.Length))+"...";Write-Pass "$n = $m (from $s)";return $true}
Write-Header "TIER 1: REQUIRED"
$t1=$true
$t1=(Test-Var "NEXT_PUBLIC_SUPABASE_URL" $true "Required by every page" "Supabase Dashboard > Settings > API > URL") -and $t1
$t1=(Test-Var "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" $true "Required for client auth" "Supabase Dashboard > Settings > API > anon key") -and $t1
$t1=(Test-Var "SUPABASE_SERVICE_ROLE_KEY" $true "Required for server admin ops" "Supabase Dashboard > Settings > API > service_role") -and $t1
$t1=(Test-Var "DEEPGRAM_API_KEY" $true "Required for transcription" "https://console.deepgram.com > API Keys") -and $t1
Write-Header "TIER 2: FEATURE-SPECIFIC"
Test-Var "ANTHROPIC_API_KEY" $false "Medical extraction + AI review" "https://console.anthropic.com > API Keys" | Out-Null
Test-Var "RESEND_API_KEY" $false "Transactional email (Resend)" "https://resend.com/api-keys" | Out-Null
Test-Var "STRIPE_SECRET_KEY" $false "Billing (if enabled)" "stripe.com > Developers > API Keys" | Out-Null
Write-Header "TIER 3: SECURITY SECRETS"
Test-Var "CRON_SECRET" $false "Protects cron routes" "Generate: [System.Guid]::NewGuid()" | Out-Null
Test-Var "WEBHOOK_SECRET" $false "Webhook signatures" "Generate: [System.Guid]::NewGuid()" | Out-Null
Test-Var "DEEPGRAM_WEBHOOK_SECRET" $false "Deepgram callbacks" "Deepgram Console" | Out-Null
Test-Var "INTERNAL_API_SECRET" $false "Internal API auth" "Generate: [System.Guid]::NewGuid()" | Out-Null
Write-Header "LIVE API TESTS"
$sbUrl=Get-Var "NEXT_PUBLIC_SUPABASE_URL"; $sbKey=Get-Var "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"; $svcKey=Get-Var "SUPABASE_SERVICE_ROLE_KEY"; $dgKey=Get-Var "DEEPGRAM_API_KEY"; $anKey=Get-Var "ANTHROPIC_API_KEY"
if($sbUrl -and $sbKey){Write-Host "  Testing Supabase REST..." -NoNewline; try{Invoke-RestMethod -Uri "$sbUrl/rest/v1/" -Headers @{apikey=$sbKey;Authorization="Bearer $sbKey"} -Method GET -TimeoutSec 10 | Out-Null; Write-Pass "Supabase REST -- connected"}catch{$st=0;if($_.Exception.Response){$st=[int]$_.Exception.Response.StatusCode};Write-Fail "Supabase REST -- failed (status $st): $($_.Exception.Message)"}}
if($sbUrl -and $sbKey){Write-Host "  Testing Supabase Auth..." -NoNewline; try{Invoke-RestMethod -Uri "$sbUrl/auth/v1/settings" -Headers @{apikey=$sbKey} -Method GET -TimeoutSec 10 | Out-Null; Write-Pass "Supabase Auth -- working"}catch{Write-Fail "Supabase Auth -- failed: $($_.Exception.Message)"}}
if($sbUrl -and $svcKey){Write-Host "  Testing Service Role..." -NoNewline; try{Invoke-RestMethod -Uri "$sbUrl/rest/v1/profiles?select=id&limit=1" -Headers @{apikey=$svcKey;Authorization="Bearer $svcKey"} -Method GET -TimeoutSec 10 | Out-Null; Write-Pass "Service Role -- connected (bypasses RLS)"}catch{$st=0;if($_.Exception.Response){$st=[int]$_.Exception.Response.StatusCode};Write-Fail "Service Role -- failed (status $st)"}}
if($dgKey){Write-Host "  Testing Deepgram auth..." -NoNewline; try{Invoke-RestMethod -Uri "https://api.deepgram.com/v1/projects" -Headers @{Authorization="Token $dgKey"} -Method GET -TimeoutSec 10 | Out-Null; Write-Pass "Deepgram API -- authenticated"}catch{$st=0;if($_.Exception.Response){$st=[int]$_.Exception.Response.StatusCode};Write-Fail "Deepgram -- failed (status $st): check DEEPGRAM_API_KEY"}}
if($dgKey){Write-Host "  Testing Deepgram Nova-3..." -NoNewline; try{$r=Invoke-RestMethod -Uri "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&language=en-US" -Headers @{Authorization="Token $dgKey";"Content-Type"="application/json"} -Method POST -Body '{"url":"https://static.deepgram.com/examples/interview_speech-analytics.wav"}' -TimeoutSec 30; $wc=$r.results.channels[0].alternatives[0].words.Count; Write-Pass "Deepgram Nova-3 -- working ($wc words)"}catch{$st=0;if($_.Exception.Response){$st=[int]$_.Exception.Response.StatusCode};if($st -eq 402){Write-Fail "Deepgram -- 402 no credits left"}else{Write-Fail "Deepgram transcription -- failed (status $st)"}}}
if($anKey){Write-Host "  Testing Anthropic..." -NoNewline; try{$b=@{model="claude-sonnet-4-20250514";max_tokens=10;messages=@(@{role="user";content="Say OK"})}|ConvertTo-Json -Depth 3; Invoke-RestMethod -Uri "https://api.anthropic.com/v1/messages" -Headers @{"x-api-key"=$anKey;"anthropic-version"="2023-06-01";"Content-Type"="application/json"} -Method POST -Body $b -TimeoutSec 15 | Out-Null; Write-Pass "Anthropic -- working"}catch{$st=0;if($_.Exception.Response){$st=[int]$_.Exception.Response.StatusCode};if($st -eq 401){Write-Fail "Anthropic -- 401 bad key"}elseif($st -eq 429){Write-Warn "Anthropic -- 429 rate limited (key valid)"}else{Write-Fail "Anthropic -- failed (status $st)"}}}
Write-Header "KEY FORMAT CHECK"
if($sbUrl){if($sbUrl -match "^https://[\w-]+\.supabase\.co$"){Write-Pass "Supabase URL format -- OK"}else{Write-Fail "Supabase URL format -- bad: $sbUrl (need https://xxx.supabase.co, no trailing slash)"}}
if($sbKey){if($sbKey -match "^eyJ" -or $sbKey -match "^sb_publishable_"){Write-Pass "Publishable key -- valid format (JWT or sb_publishable_)"}else{Write-Fail "Publishable key -- unexpected format (expect eyJ... or sb_publishable_...)"}}
if($svcKey){if($svcKey -match "^eyJ" -or $svcKey -match "^sb_secret_"){Write-Pass "Service role key -- valid format (JWT or sb_secret_)"}else{Write-Fail "Service role key -- unexpected format (expect eyJ... or sb_secret_...)"};if($svcKey -eq $sbKey){Write-Fail "Service role key is SAME as publishable key! These must be different."}}
Write-Header "DEPRECATED CHECK"
# Email: Resend (RESEND_API_KEY) — see .env.example for required vars
$dep=@{DATABASE_URL="Prisma removed";DIRECT_URL="CI only, not for .env.local";NEXTAUTH_SECRET="NextAuth removed";NEXTAUTH_URL="NextAuth removed";NEXT_PUBLIC_SUPABASE_ANON_KEY="Renamed to PUBLISHABLE_KEY";SUPABASE_URL="Use NEXT_PUBLIC_SUPABASE_URL";EMAIL_HOST="Replaced by RESEND_API_KEY";EMAIL_PORT="Replaced by RESEND_API_KEY";EMAIL_USER="Replaced by RESEND_API_KEY";EMAIL_PASSWORD="Replaced by RESEND_API_KEY"}
$df=0;foreach($k in $dep.Keys){if(Get-Var $k){Write-Warn "$k is DEPRECATED -- $($dep[$k])";$df++}};if($df -eq 0){Write-Pass "No deprecated vars"}
Write-Header "SUMMARY"
if(!$t1){Write-Host "  CRITICAL: Required vars missing -- app will not start" -ForegroundColor Red}else{Write-Host "  All required vars present -- app should start" -ForegroundColor Green}
Write-Host ""
