#!/usr/bin/env node
/**
 * apps/toss/src/shared.ts 는 packages/shared/src/index.ts 의 벤더링 복사본이에요.
 * (앱인토스 .ait 번들러가 workspace:* 패키지를 처리하지 못해 복사본을 사용)
 *
 * 사용법
 *   node scripts/sync-toss-shared.mjs          # 동기화 여부 검사(verify 게이트). 드리프트 시 exit 1
 *   node scripts/sync-toss-shared.mjs --write   # 원본으로부터 복사본 재생성
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'packages/shared/src/index.ts');
const DEST = path.join(root, 'apps/toss/src/shared.ts');

const HEADER =
  '// 이 파일은 packages/shared/src/index.ts 의 복사본이에요(앱인토스 .ait 번들이\n' +
  '// workspace:* 패키지를 처리하지 못해 벤더링). 원본 변경 시 `pnpm sync:toss-shared` 로 갱신하세요.\n';

const stripLeadingComments = (value) => value.replace(/^(?:\/\/[^\n]*\n)+/, '');

const source = readFileSync(SRC, 'utf8');
const write = process.argv.includes('--write');

if (write) {
  writeFileSync(DEST, HEADER + source);
  console.log('✓ apps/toss/src/shared.ts 를 packages/shared 로부터 동기화했어요.');
  process.exit(0);
}

let current;
try {
  current = readFileSync(DEST, 'utf8');
} catch {
  console.error('✗ apps/toss/src/shared.ts 가 없어요. `pnpm sync:toss-shared` 로 생성하세요.');
  process.exit(1);
}

if (stripLeadingComments(current).trim() !== source.trim()) {
  console.error('✗ apps/toss/src/shared.ts 가 packages/shared/src/index.ts 와 어긋났어요.');
  console.error('  → `pnpm sync:toss-shared` 로 동기화하세요.');
  process.exit(1);
}

console.log('✓ apps/toss/src/shared.ts 가 packages/shared 와 동기화되어 있어요.');
