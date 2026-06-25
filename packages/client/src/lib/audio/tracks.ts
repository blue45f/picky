/**
 * 생성형 그루브 BGM 트랙 정의 — 전부 WebAudio 합성(음원 파일 0, 저작권 free).
 *
 * 각 트랙은 리듬 섹션(킥/스네어/하이햇)·베이스·코드·캐치한 멜로디를 갖춘 "진짜 곡"처럼
 * 설계됐어요. 트랙은 자기만의 노트 그리드를 스케줄러 콜백(한 마디 분량)으로 채우고,
 * 엔진이 ~90초마다 다음 트랙으로 seamless 하게 로테이션합니다. 모든 노드는 트랙 전용
 * 출력 게인에 연결돼, 페이드 아웃 후 한 번에 정리됩니다.
 *
 * BGM이라 마스터는 낮게 깔리되, 리듬·베이스·코드가 겹쳐 그루브가 느껴지도록
 * 각 보이스 게인을 보수적으로 잡았어요(클리핑 방지).
 */

/** 연출용 난수 — crypto 우선, 미지원 환경만 폴백(particles.ts 와 동일 정책). */
const secureRandom = (): number => {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);
    return (array[0] ?? 0) / 4294967296;
  }
  return 0.5;
};

/** MIDI 노트 → 주파수(Hz). A4(69)=440. */
const midiToFreq = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

/**
 * 한 마디(beat 묶음) 분량의 노트를 스케줄링하는 컨텍스트.
 * 트랙의 `schedule` 콜백이 이 안에서 노드를 만들어 `out` 에 연결해요.
 */
export interface ScheduleContext {
  ctx: AudioContext;
  /** 이 트랙의 전용 출력 게인(엔진이 페이드/정리를 담당). */
  out: AudioNode;
  /** 이번 묶음 시작 시각(ctx.currentTime 기준 절대 초). */
  startAt: number;
  /** 한 박의 길이(초). 템포에서 파생. */
  beatDuration: number;
  /** 이번에 채울 박 수. */
  beats: number;
  /** 트랙 내부 진행 카운터(완만한 진화에 사용). */
  bar: number;
}

export interface BgmTrack {
  /** 안정적 식별자(영속/디버그용). */
  id: string;
  /** 사용자에게 보여줄 한글 트랙명. */
  name: string;
  /** 한 박 길이(초) — 느릴수록 큼. */
  beatDuration: number;
  /** 한 번의 schedule 호출이 채우는 박 수. */
  beatsPerBar: number;
  /**
   * 한 묶음 분량의 노트를 스케줄링해요. 순수 합성만 하고, 부수효과로 노드를 `out` 에 연결.
   */
  schedule: (sc: ScheduleContext) => void;
}

/** soft attack/decay 톤 보이스 — 패드·코드·멜로디·베이스가 공유하는 빌딩 블록. */
const scheduleVoice = (
  ctx: AudioContext,
  out: AudioNode,
  options: {
    type: OscillatorType;
    frequency: number;
    startAt: number;
    duration: number;
    peak: number;
    attackRatio?: number;
    /** 로우패스 컷오프(Hz). 지정 시 필터를 끼워 음색을 둥글게. */
    cutoff?: number;
    /** 미세 디튠(cents) — 살짝 풍성하게. */
    detune?: number;
  },
): void => {
  const {
    type,
    frequency,
    startAt,
    duration,
    peak,
    attackRatio = 0.35,
    cutoff,
    detune = 0,
  } = options;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startAt);
  if (detune) {
    osc.detune.setValueAtTime(detune, startAt);
  }

  let tail: AudioNode = gain;
  osc.connect(gain);

  if (cutoff && cutoff > 0) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, startAt);
    gain.connect(filter);
    tail = filter;
  }

  const attack = Math.max(0.005, duration * attackRatio);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), startAt + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  tail.connect(out);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
};

/**
 * 플럭(pluck)형 보이스 — 빠른 어택·짧은 감쇠로 일렉피아노/마림바/리드처럼 또렷하게.
 * 멜로디·코드 스탭에 써요.
 */
const schedulePluck = (
  ctx: AudioContext,
  out: AudioNode,
  options: {
    type: OscillatorType;
    frequency: number;
    startAt: number;
    duration: number;
    peak: number;
    cutoff?: number;
    detune?: number;
  },
): void => {
  const { type, frequency, startAt, duration, peak, cutoff = 2600, detune = 0 } = options;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startAt);
  if (detune) {
    osc.detune.setValueAtTime(detune, startAt);
  }
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cutoff, startAt);
  // 살짝 밝게 시작했다가 닫히며 따뜻해지는 음색.
  filter.frequency.exponentialRampToValueAtTime(Math.max(400, cutoff * 0.5), startAt + duration);

  osc.connect(gain);
  gain.connect(filter);
  filter.connect(out);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
};

/* ──────────────────────────────────────────────────────────────────────────
 * 드럼/퍼커션 합성 헬퍼 — 노이즈버스트+필터(스네어/하이햇), 사인 피치 스윕(킥).
 * 전부 코드 생성이라 저작권 free. 게인은 보수적으로(클리핑 방지).
 * ────────────────────────────────────────────────────────────────────────── */

/** 짧은 화이트노이즈 버퍼를 만들어 캐시해요(스네어/하이햇 공용). */
let noiseBufferCache: AudioBuffer | null = null;
let noiseBufferCtx: AudioContext | null = null;
const getNoiseBuffer = (ctx: AudioContext): AudioBuffer => {
  if (noiseBufferCache && noiseBufferCtx === ctx) {
    return noiseBufferCache;
  }
  const length = Math.floor(ctx.sampleRate * 0.4);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = secureRandom() * 2 - 1;
  }
  noiseBufferCache = buffer;
  noiseBufferCtx = ctx;
  return buffer;
};

/** 킥 드럼 — 사인 피치 스윕(고→저) + 빠른 감쇠. */
const scheduleKick = (
  ctx: AudioContext,
  out: AudioNode,
  startAt: number,
  options: { peak?: number; startFreq?: number; endFreq?: number; decay?: number } = {},
): void => {
  const { peak = 0.5, startFreq = 130, endFreq = 48, decay = 0.22 } = options;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(startFreq, startAt);
  osc.frequency.exponentialRampToValueAtTime(endFreq, startAt + decay * 0.6);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + decay);
  osc.connect(gain);
  gain.connect(out);
  osc.start(startAt);
  osc.stop(startAt + decay + 0.05);
};

/** 스네어/클랩 — 밴드패스 노이즈 + 짧은 톤 바디. */
const scheduleSnare = (
  ctx: AudioContext,
  out: AudioNode,
  startAt: number,
  options: { peak?: number; decay?: number; bandpass?: number } = {},
): void => {
  const { peak = 0.28, decay = 0.18, bandpass = 1800 } = options;
  // 노이즈 바디.
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(bandpass, startAt);
  noiseFilter.Q.setValueAtTime(0.8, startAt);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, startAt);
  noiseGain.gain.exponentialRampToValueAtTime(peak, startAt + 0.005);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, startAt + decay);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(out);
  noise.start(startAt);
  noise.stop(startAt + decay + 0.05);
  // 짧은 톤 바디(스네어 "몸통").
  const tone = ctx.createOscillator();
  const toneGain = ctx.createGain();
  tone.type = 'triangle';
  tone.frequency.setValueAtTime(190, startAt);
  tone.frequency.exponentialRampToValueAtTime(120, startAt + decay * 0.7);
  toneGain.gain.setValueAtTime(0.0001, startAt);
  toneGain.gain.exponentialRampToValueAtTime(peak * 0.5, startAt + 0.005);
  toneGain.gain.exponentialRampToValueAtTime(0.0001, startAt + decay * 0.8);
  tone.connect(toneGain);
  toneGain.connect(out);
  tone.start(startAt);
  tone.stop(startAt + decay + 0.05);
};

/** 하이햇 — 하이패스 노이즈 버스트(open 이면 길게). */
const scheduleHat = (
  ctx: AudioContext,
  out: AudioNode,
  startAt: number,
  options: { peak?: number; decay?: number; open?: boolean } = {},
): void => {
  const { peak = 0.12, open = false } = options;
  const decay = options.decay ?? (open ? 0.16 : 0.045);
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(7000, startAt);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + decay);
  noise.connect(hp);
  hp.connect(gain);
  gain.connect(out);
  noise.start(startAt);
  noise.stop(startAt + decay + 0.05);
};

// 스케일/코드(루트 기준 반음 오프셋).
const MAJOR7 = [0, 4, 7, 11]; // maj7 코드 톤.
const MINOR7 = [0, 3, 7, 10]; // min7 코드 톤.
const DOM9 = [0, 4, 7, 10, 14]; // 9th 컬러까지.
const ADD9 = [0, 4, 7, 14]; // add9.
const MAJOR_PENTA = [0, 2, 4, 7, 9]; // 멜로디용 메이저 펜타토닉.
const MINOR_PENTA = [0, 3, 5, 7, 10]; // 멜로디용 마이너 펜타토닉.

/**
 * 5개 생성형 그루브 트랙. 각기 다른 장르·스케일·템포·리듬 섹션.
 * 순서가 곧 기본 로테이션 순서예요.
 */
export const BGM_TRACKS: readonly BgmTrack[] = [
  {
    // 플로우 — 로파이 힙합. 느긋한 boom-bap 드럼 + 워키 베이스 + 재지 maj7/min7 코드 + 펜타 멜로디.
    id: 'flow',
    name: '플로우',
    beatDuration: 0.46, // ~82 BPM 의 8분음표 그리드.
    beatsPerBar: 8, // 한 마디 = 8 스텝(4/4).
    schedule: ({ ctx, out, startAt, beatDuration, beats, bar }) => {
      const root = 50; // D.
      const step = beatDuration;
      // ── 드럼: boom-bap(킥 1·3박, 스네어 2·4박, 하이햇 8분).
      scheduleKick(ctx, out, startAt + 0 * step, { peak: 0.42 });
      scheduleKick(ctx, out, startAt + 4 * step, { peak: 0.42 });
      if (bar % 2 === 1) {
        scheduleKick(ctx, out, startAt + 3.5 * step, { peak: 0.3 }); // 가끔 싱코페이션 킥.
      }
      scheduleSnare(ctx, out, startAt + 2 * step, { peak: 0.24 });
      scheduleSnare(ctx, out, startAt + 6 * step, { peak: 0.24 });
      for (let b = 0; b < beats; b++) {
        const swing = b % 2 === 1 ? step * 0.12 : 0; // 살짝 스윙.
        scheduleHat(ctx, out, startAt + b * step + swing, {
          peak: b % 2 === 0 ? 0.07 : 0.045,
          open: b === 7,
        });
      }
      // ── 워키 베이스(루트→5도→옥타브 위킹).
      const bassLine = [0, 0, 7, 5, 0, 3, 7, 10];
      for (let b = 0; b < beats; b += 1) {
        if (b % 2 === 0 || secureRandom() > 0.6) {
          const deg = bassLine[(bar + b) % bassLine.length] ?? 0;
          scheduleVoice(ctx, out, {
            type: 'triangle',
            frequency: midiToFreq(root - 12 + deg),
            startAt: startAt + b * step,
            duration: step * 1.6,
            peak: 0.13,
            attackRatio: 0.08,
            cutoff: 700,
          });
        }
      }
      // ── 재지 코드 스탭(2마디마다 maj7↔min7 진행).
      const chord = bar % 2 === 0 ? MAJOR7 : MINOR7;
      const chordRoot = bar % 2 === 0 ? root + 12 : root + 12 + 5;
      [0, 4.5].forEach((pos) => {
        chord.forEach((deg, i) => {
          schedulePluck(ctx, out, {
            type: 'sine',
            frequency: midiToFreq(chordRoot + deg),
            startAt: startAt + pos * step,
            duration: step * 2.4,
            peak: 0.05 - i * 0.004,
            cutoff: 2000,
            detune: i === 1 ? 5 : 0,
          });
        });
      });
      // ── 펜타 멜로디(가끔, 윗 옥타브에서 또렷하게).
      for (let b = 0; b < beats; b++) {
        if (secureRandom() > 0.66) {
          const deg = MINOR_PENTA[(bar * 2 + b) % MINOR_PENTA.length] ?? 0;
          schedulePluck(ctx, out, {
            type: 'triangle',
            frequency: midiToFreq(root + 12 + deg),
            startAt: startAt + b * step,
            duration: step * 1.4,
            peak: 0.07,
            cutoff: 3200,
          });
        }
      }
    },
  },
  {
    // 선셋 드라이브 — 칠 딥하우스. 4-on-the-floor 킥 + 오프비트 하이햇 + 펄싱 신스 베이스 + 코드 스탭.
    id: 'sunset-drive',
    name: '선셋 드라이브',
    beatDuration: 0.3, // ~100 BPM 의 8분음표 그리드.
    beatsPerBar: 8,
    schedule: ({ ctx, out, startAt, beatDuration, beats, bar }) => {
      const root = 53; // F.
      const step = beatDuration;
      // ── 4-on-the-floor 킥(매 정박).
      for (let b = 0; b < beats; b += 2) {
        scheduleKick(ctx, out, startAt + b * step, { peak: 0.4, endFreq: 50, decay: 0.2 });
      }
      // ── 오프비트 오픈 하이햇(하우스의 시그니처).
      for (let b = 1; b < beats; b += 2) {
        scheduleHat(ctx, out, startAt + b * step, { peak: 0.08, open: true });
      }
      // ── 클랩(2·4박).
      scheduleSnare(ctx, out, startAt + 2 * step, { peak: 0.2, bandpass: 2000 });
      scheduleSnare(ctx, out, startAt + 6 * step, { peak: 0.2, bandpass: 2000 });
      // ── 펄싱 신스 베이스(오프비트로 통통).
      const bassDegrees = bar % 2 === 0 ? [0, 0, 0, 0] : [-2, -2, -2, -2]; // 2마디 진행(F→Eb 느낌).
      for (let b = 0; b < beats; b += 2) {
        const deg = bassDegrees[(b / 2) % bassDegrees.length] ?? 0;
        scheduleVoice(ctx, out, {
          type: 'sawtooth',
          frequency: midiToFreq(root - 12 + deg),
          startAt: startAt + (b + 1) * step, // 킥 사이 오프비트.
          duration: step * 1.3,
          peak: 0.1,
          attackRatio: 0.06,
          cutoff: 600,
        });
      }
      // ── 코드 스탭(add9, 사이드체인 느낌으로 킥 뒤에서 살짝).
      const chordRoot = root + 12 + (bar % 2 === 0 ? 0 : -2);
      ADD9.forEach((deg, i) => {
        schedulePluck(ctx, out, {
          type: 'sawtooth',
          frequency: midiToFreq(chordRoot + deg),
          startAt: startAt + 1 * step,
          duration: step * 5,
          peak: 0.04 - i * 0.003,
          cutoff: 1700,
          detune: i % 2 === 0 ? -4 : 4,
        });
      });
      // ── 밝은 리드 모티프(2마디마다 한 번).
      if (bar % 2 === 1) {
        const motif = [0, 4, 7, 4];
        motif.forEach((deg, i) => {
          schedulePluck(ctx, out, {
            type: 'triangle',
            frequency: midiToFreq(root + 12 + deg),
            startAt: startAt + (1 + i * 1.5) * step,
            duration: step * 1.2,
            peak: 0.06,
            cutoff: 3000,
          });
        });
      }
    },
  },
  {
    // 버블팝 — 해피 마림바 팝. 통통 튀는 마림바 멜로디 + 가벼운 킥/셰이커 + 우쿨렐레풍 코드.
    id: 'bubblepop',
    name: '버블팝',
    beatDuration: 0.32, // ~94 BPM 의 8분음표 그리드.
    beatsPerBar: 8,
    schedule: ({ ctx, out, startAt, beatDuration, beats, bar }) => {
      const root = 60; // C.
      const step = beatDuration;
      // ── 가벼운 킥(1·3박)·손뼉(3박)·셰이커(8분).
      scheduleKick(ctx, out, startAt + 0 * step, { peak: 0.3, startFreq: 120, endFreq: 55 });
      scheduleKick(ctx, out, startAt + 4 * step, { peak: 0.3, startFreq: 120, endFreq: 55 });
      scheduleSnare(ctx, out, startAt + 4 * step, { peak: 0.16, decay: 0.12, bandpass: 2400 });
      for (let b = 0; b < beats; b++) {
        scheduleHat(ctx, out, startAt + b * step, {
          peak: b % 2 === 0 ? 0.05 : 0.035,
          decay: 0.03,
        });
      }
      // ── 우쿨렐레풍 코드(add9, 8분 스트럼).
      const prog = [ADD9, MINOR7, MAJOR_PENTA.map((d) => d), ADD9];
      const progRoots = [0, 9, 5, 7]; // C → Am → F → G 느낌.
      const slot = bar % progRoots.length;
      const chord = prog[slot] ?? ADD9;
      const chordRoot = root + (progRoots[slot] ?? 0);
      [0, 2, 4, 6].forEach((pos) => {
        chord.slice(0, 4).forEach((deg, i) => {
          schedulePluck(ctx, out, {
            type: 'triangle',
            frequency: midiToFreq(chordRoot + deg + 12),
            startAt: startAt + pos * step + i * 0.012, // 살짝 펼친 스트럼.
            duration: step * 1.4,
            peak: 0.045,
            cutoff: 2600,
          });
        });
      });
      // ── 통통 튀는 마림바 멜로디(메이저 펜타, 옥타브 점프).
      for (let b = 0; b < beats; b++) {
        if (b % 2 === 0 || secureRandom() > 0.5) {
          const deg = MAJOR_PENTA[(bar * 3 + b) % MAJOR_PENTA.length] ?? 0;
          const oct = b % 4 === 0 ? 12 : secureRandom() > 0.7 ? 24 : 12;
          schedulePluck(ctx, out, {
            type: 'sine',
            frequency: midiToFreq(root + deg + oct),
            startAt: startAt + b * step,
            duration: step * 1.1,
            peak: 0.08,
            cutoff: 3400,
          });
        }
      }
    },
  },
  {
    // 시티 라이트 — 시티팝/펑크. 그루비 핑거드 베이스 + 일렉피아노 코드 + 16분 하이햇 + 펑키 리드.
    id: 'city-lights',
    name: '시티 라이트',
    beatDuration: 0.28, // ~107 BPM 의 8분음표 그리드.
    beatsPerBar: 8,
    schedule: ({ ctx, out, startAt, beatDuration, beats, bar }) => {
      const root = 52; // E.
      const step = beatDuration;
      // ── 펑크 드럼(킥 1박·"and of 2"·3박, 스네어 2·4박, 16분 하이햇).
      scheduleKick(ctx, out, startAt + 0 * step, { peak: 0.38 });
      scheduleKick(ctx, out, startAt + 2.5 * step, { peak: 0.3 });
      scheduleKick(ctx, out, startAt + 4 * step, { peak: 0.38 });
      scheduleSnare(ctx, out, startAt + 2 * step, { peak: 0.22 });
      scheduleSnare(ctx, out, startAt + 6 * step, { peak: 0.22 });
      for (let b = 0; b < beats; b++) {
        // 8분 + 가끔 16분 고스트(펑키한 느낌).
        scheduleHat(ctx, out, startAt + b * step, { peak: b % 2 === 0 ? 0.06 : 0.04 });
        if (secureRandom() > 0.55) {
          scheduleHat(ctx, out, startAt + (b + 0.5) * step, { peak: 0.025, decay: 0.025 });
        }
      }
      // ── 그루비 핑거드 베이스(펑크 라인, min7/dom 컬러).
      const bassLine = [0, 7, 10, 7, 5, 7, 3, 2];
      for (let b = 0; b < beats; b++) {
        if (b % 2 === 0 || secureRandom() > 0.45) {
          const deg = bassLine[(bar * 2 + b) % bassLine.length] ?? 0;
          scheduleVoice(ctx, out, {
            type: 'sawtooth',
            frequency: midiToFreq(root - 12 + deg),
            startAt: startAt + b * step,
            duration: step * (b % 2 === 0 ? 1.2 : 0.8),
            peak: 0.11,
            attackRatio: 0.05,
            cutoff: 850,
          });
        }
      }
      // ── 일렉피아노 코드 스탭(dom9, 업비트).
      const chord = bar % 2 === 0 ? DOM9 : MINOR7;
      const chordRoot = root + 12 + (bar % 2 === 0 ? 0 : 5);
      [1, 3, 6].forEach((pos) => {
        chord.forEach((deg, i) => {
          schedulePluck(ctx, out, {
            type: 'triangle',
            frequency: midiToFreq(chordRoot + deg),
            startAt: startAt + pos * step,
            duration: step * 1.3,
            peak: 0.04 - i * 0.003,
            cutoff: 2400,
            detune: i === 1 ? 4 : 0,
          });
        });
      });
      // ── 펑키 리드 라인(2마디마다, 미끄러지는 펜타).
      if (bar % 2 === 1) {
        const lick = [12, 10, 7, 10, 12, 14];
        lick.forEach((deg, i) => {
          schedulePluck(ctx, out, {
            type: 'square',
            frequency: midiToFreq(root + deg),
            startAt: startAt + (1 + i) * step,
            duration: step * 0.9,
            peak: 0.035, // square 는 작게(거칠어서).
            cutoff: 2800,
          });
        });
      }
    },
  },
  {
    // 하이파이브 — 신스팝/퓨처베이스. 밝은 슈퍼소 리드 + 사이드체인 패드 + 4-on-floor 킥 + 스냅 스네어.
    id: 'high-five',
    name: '하이파이브',
    beatDuration: 0.3, // ~100 BPM 의 8분음표 그리드.
    beatsPerBar: 8,
    schedule: ({ ctx, out, startAt, beatDuration, beats, bar }) => {
      const root = 55; // G.
      const step = beatDuration;
      // ── 킥(1·3박 + 빌드용 더블)·스냅 스네어(2·4박)·하이햇(8분).
      scheduleKick(ctx, out, startAt + 0 * step, { peak: 0.42 });
      scheduleKick(ctx, out, startAt + 4 * step, { peak: 0.42 });
      scheduleSnare(ctx, out, startAt + 2 * step, { peak: 0.24, decay: 0.14, bandpass: 2200 });
      scheduleSnare(ctx, out, startAt + 6 * step, { peak: 0.24, decay: 0.14, bandpass: 2200 });
      for (let b = 0; b < beats; b++) {
        scheduleHat(ctx, out, startAt + b * step, { peak: b % 4 === 2 ? 0.07 : 0.045 });
      }
      // ── 사이드체인 패드(킥에서 눌렸다 부풀어 오르는 느낌 — attack 길게).
      const progRoots = [0, 5, -3, 2]; // G → C → Em → A 느낌(4마디 진행).
      const slot = bar % progRoots.length;
      const chordRoot = root + (progRoots[slot] ?? 0);
      MAJOR7.forEach((deg, i) => {
        scheduleVoice(ctx, out, {
          type: 'sawtooth',
          frequency: midiToFreq(chordRoot + deg),
          startAt: startAt,
          duration: step * beats,
          peak: 0.035,
          attackRatio: 0.4, // 펌핑 느낌.
          cutoff: 1500,
          detune: i % 2 === 0 ? -7 : 7,
        });
      });
      // ── 펄싱 베이스(루트, 8분).
      for (let b = 0; b < beats; b++) {
        scheduleVoice(ctx, out, {
          type: 'sawtooth',
          frequency: midiToFreq(chordRoot - 12),
          startAt: startAt + b * step,
          duration: step * 0.8,
          peak: b % 2 === 0 ? 0.1 : 0.06,
          attackRatio: 0.05,
          cutoff: 550,
        });
      }
      // ── 밝은 슈퍼소 리드(메이저 펜타 모티프, 디튠 더블로 두껍게).
      const motif = [0, 2, 4, 7, 4, 2];
      for (let b = 0; b < beats; b++) {
        if (b < motif.length && (b % 2 === 0 || secureRandom() > 0.4)) {
          const deg = MAJOR_PENTA[(motif[b] ?? 0) % MAJOR_PENTA.length] ?? 0;
          [-8, 8].forEach((det) => {
            schedulePluck(ctx, out, {
              type: 'sawtooth',
              frequency: midiToFreq(root + 12 + deg),
              startAt: startAt + b * step,
              duration: step * 1.3,
              peak: 0.03,
              cutoff: 3200,
              detune: det,
            });
          });
        }
      }
    },
  },
];

/** 트랙 1개가 채워질 1회 호출(한 묶음)의 길이(초). */
export const barDuration = (track: BgmTrack): number => track.beatDuration * track.beatsPerBar;
