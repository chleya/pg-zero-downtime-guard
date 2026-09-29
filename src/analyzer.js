const fs=require('fs'), path=require('path');
const root=process.env['INPUT_PATH'] || 'migrations'; const fail=process.env['INPUT_FAIL-ON-WARNING'] !== 'false';
function files(p){ if(!fs.existsSync(p)) return []; const s=fs.statSync(p); if(s.isFile()) return [p]; return fs.readdirSync(p,{recursive:true}).filter(x=>String(x).toLowerCase().endsWith('.sql')).map(x=>path.join(p,x)); }
const rules=[
 {id:'INDEX_WITHOUT_CONCURRENTLY', re:/\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+(?!CONCURRENTLY\b)/ig, fix:'CREATE INDEX CONCURRENTLY index_name ON table_name (column_name);'},
 {id:'ADD_COLUMN_WITH_VOLATILE_DEFAULT', re:/\bALTER\s+TABLE\b[\s\S]{0,300}\bADD\s+COLUMN\b[\s\S]{0,180}\bDEFAULT\s+(?:now\s*\(\s*\)|current_timestamp|gen_random_uuid\s*\(\s*\)|uuid_generate_v4\s*\(\s*\))/ig, fix:'Add the column nullable without a default, backfill in batches, then add a stable default and NOT NULL in separate migrations.'},
 {id:'MISSING_LOCK_TIMEOUT', re:/\bSET\s+(?:LOCAL\s+)?lock_timeout\s*=\s*['"]?2s['"]?/i, fix:`SET LOCAL lock_timeout = '2s';`}
];
const findings=[]; for(const file of files(root)){const sql=fs.readFileSync(file,'utf8'); for(const r of rules){const matches=[...sql.matchAll(r.re)]; if(r.id==='MISSING_LOCK_TIMEOUT' ? !matches.length : matches.length) findings.push({file,rule:r.id,count:matches.length,fix:r.fix});}}
const lines=['## PostgreSQL Zero-Downtime Guard','','| File | Rule | Finding | Safe replacement |','|---|---|---:|---|']; if(!findings.length) lines.push('| — | — | 0 | No violations found |'); else for(const f of findings) lines.push(`| \`${f.file}\` | \`${f.rule}\` | ${f.count || 'missing'} | ${f.fix} |`);
lines.push('', findings.length ? '**Result: blocked.** Resolve every finding before merge.' : '**Result: passed.**'); if(process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n'); console.log(lines.join('\n')); if(findings.length && fail) process.exit(1);
