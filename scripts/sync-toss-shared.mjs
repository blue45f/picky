#!/usr/bin/env node
/**
 * apps/toss/src/shared.ts 는 packages/shared/src/index.ts 를 상대 경로로 재수출하는
 * 앱인토스 어댑터예요. 앱인토스 .ait 번들러가 workspace:* 패키지를 처리하지 못해
 * 패키지명 대신 모노레포 소스 파일을 직접 가리킵니다.
 *
 * 사용법
 *   node scripts/sync-toss-shared.mjs          # 동기화 여부 검사(verify 게이트). 드리프트 시 exit 1
 *   node scripts/sync-toss-shared.mjs --write   # 어댑터 파일 재생성
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEST = path.join(root, 'apps/toss/src/shared.ts');

const HEADER =
  '// 앱인토스 .ait 번들러가 workspace:* 패키지를 처리하지 못해 패키지명을 쓰지 않고\n' +
  '// 모노레포 소스 파일을 상대 경로로 직접 재수출해요.\n';

const EXPECTED = `${HEADER}export * from '../../../packages/shared/src/index';\n`;

const write = process.argv.includes('--write');

if (write) {
  writeFileSync(DEST, EXPECTED);
  console.log('✓ apps/toss/src/shared.ts 어댑터를 갱신했어요.');
  process.exit(0);
}

let current;
try {
  current = readFileSync(DEST, 'utf8');
} catch {
  console.error('✗ apps/toss/src/shared.ts 가 없어요. `pnpm sync:toss-shared` 로 생성하세요.');
  process.exit(1);
}

if (current !== EXPECTED) {
  console.error('✗ apps/toss/src/shared.ts 어댑터가 기대한 형태와 어긋났어요.');
  console.error('  → `pnpm sync:toss-shared` 로 동기화하세요.');
  process.exit(1);
}

console.log('✓ apps/toss/src/shared.ts 어댑터가 packages/shared 를 가리키고 있어요.');
