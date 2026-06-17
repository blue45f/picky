const QR_VERSION = 10;
const QR_SIZE = QR_VERSION * 4 + 17;
const QR_QUIET_ZONE = 4;
const QR_MASK_PATTERN = 0;
const QR_DATA_CODEWORDS = 274;
const QR_TOTAL_CODEWORDS = 346;
const QR_BLOCK_COUNT = 4;
const QR_ECC_CODEWORDS_PER_BLOCK = 18;
const QR_MAX_BYTE_LENGTH = Math.floor((QR_DATA_CODEWORDS * 8 - 20) / 8);
const QR_ALIGNMENT_POSITIONS = [6, 28, 50];

interface QrMatrix {
  modules: boolean[][];
  isFunction: boolean[][];
}

const appendBits = (bits: number[], value: number, length: number) => {
  for (let i = length - 1; i >= 0; i -= 1) {
    bits.push((value >>> i) & 1);
  }
};

const bitsToCodewords = (bits: number[]) => {
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let value = 0;
    for (let j = 0; j < 8; j += 1) {
      value = (value << 1) | (bits[i + j] || 0);
    }
    codewords.push(value);
  }
  return codewords;
};

const encodePayload = (text: string) => {
  const bytes = Array.from(new TextEncoder().encode(text));
  if (bytes.length === 0 || bytes.length > QR_MAX_BYTE_LENGTH) {
    return null;
  }

  const capacityBits = QR_DATA_CODEWORDS * 8;
  const bits: number[] = [];
  appendBits(bits, 0x4, 4);
  appendBits(bits, bytes.length, 16);
  bytes.forEach((byte) => appendBits(bits, byte, 8));
  appendBits(bits, 0, Math.min(4, capacityBits - bits.length));

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const codewords = bitsToCodewords(bits);
  for (let pad = 0xec; codewords.length < QR_DATA_CODEWORDS; pad ^= 0xec ^ 0x11) {
    codewords.push(pad);
  }

  return codewords;
};

const multiplyGalois = (x: number, y: number) => {
  let result = 0;
  for (let i = 7; i >= 0; i -= 1) {
    result = (result << 1) ^ (((result >>> 7) & 1) * 0x11d);
    result ^= ((y >>> i) & 1) * x;
  }
  return result & 0xff;
};

const buildReedSolomonDivisor = (degree: number) => {
  const result = Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;

  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < result.length; j += 1) {
      result[j] = multiplyGalois(result[j], root);
      if (j + 1 < result.length) {
        result[j] ^= result[j + 1];
      }
    }
    root = multiplyGalois(root, 0x02);
  }

  return result;
};

const computeReedSolomonRemainder = (data: number[], divisor: number[]) => {
  const result = Array(divisor.length).fill(0);

  data.forEach((byte) => {
    const factor = byte ^ result.shift()!;
    result.push(0);
    divisor.forEach((coefficient, index) => {
      result[index] ^= multiplyGalois(coefficient, factor);
    });
  });

  return result;
};

const addErrorCorrection = (dataCodewords: number[]) => {
  const divisor = buildReedSolomonDivisor(QR_ECC_CODEWORDS_PER_BLOCK);
  const shortBlockCount = QR_BLOCK_COUNT - (QR_TOTAL_CODEWORDS % QR_BLOCK_COUNT);
  const shortBlockDataLength =
    Math.floor(QR_TOTAL_CODEWORDS / QR_BLOCK_COUNT) - QR_ECC_CODEWORDS_PER_BLOCK;
  const blocks: Array<{ data: number[]; ecc: number[] }> = [];
  let offset = 0;

  for (let i = 0; i < QR_BLOCK_COUNT; i += 1) {
    const dataLength = shortBlockDataLength + (i < shortBlockCount ? 0 : 1);
    const blockData = dataCodewords.slice(offset, offset + dataLength);
    offset += dataLength;
    blocks.push({
      data: blockData,
      ecc: computeReedSolomonRemainder(blockData, divisor),
    });
  }

  const result: number[] = [];
  const maxDataLength = Math.max(...blocks.map((block) => block.data.length));

  for (let i = 0; i < maxDataLength; i += 1) {
    blocks.forEach((block) => {
      if (i < block.data.length) {
        result.push(block.data[i]);
      }
    });
  }

  for (let i = 0; i < QR_ECC_CODEWORDS_PER_BLOCK; i += 1) {
    blocks.forEach((block) => result.push(block.ecc[i]));
  }

  return result;
};

const createMatrix = (): QrMatrix => ({
  modules: Array.from({ length: QR_SIZE }, () => Array(QR_SIZE).fill(false)),
  isFunction: Array.from({ length: QR_SIZE }, () => Array(QR_SIZE).fill(false)),
});

const setFunctionModule = (matrix: QrMatrix, x: number, y: number, isBlack: boolean) => {
  if (x < 0 || y < 0 || x >= QR_SIZE || y >= QR_SIZE) {
    return;
  }

  matrix.modules[y][x] = isBlack;
  matrix.isFunction[y][x] = true;
};

const drawFinderPattern = (matrix: QrMatrix, centerX: number, centerY: number) => {
  for (let dy = -4; dy <= 4; dy += 1) {
    for (let dx = -4; dx <= 4; dx += 1) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      const x = centerX + dx;
      const y = centerY + dy;
      setFunctionModule(matrix, x, y, distance !== 2 && distance !== 4);
    }
  }
};

const drawAlignmentPattern = (matrix: QrMatrix, centerX: number, centerY: number) => {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      setFunctionModule(matrix, centerX + dx, centerY + dy, distance !== 1);
    }
  }
};

const reserveFormatBits = (matrix: QrMatrix) => {
  for (let i = 0; i <= 5; i += 1) {
    setFunctionModule(matrix, 8, i, false);
  }
  setFunctionModule(matrix, 8, 7, false);
  setFunctionModule(matrix, 8, 8, false);
  setFunctionModule(matrix, 7, 8, false);
  for (let i = 9; i < 15; i += 1) {
    setFunctionModule(matrix, 14 - i, 8, false);
  }
  for (let i = 0; i < 8; i += 1) {
    setFunctionModule(matrix, QR_SIZE - 1 - i, 8, false);
  }
  for (let i = 8; i < 15; i += 1) {
    setFunctionModule(matrix, 8, QR_SIZE - 15 + i, false);
  }
};

const getBit = (value: number, index: number) => ((value >>> index) & 1) !== 0;

const drawFormatBits = (matrix: QrMatrix, mask: number) => {
  const errorCorrectionLevelBits = 1;
  const data = (errorCorrectionLevelBits << 3) | mask;
  let remainder = data;

  for (let i = 0; i < 10; i += 1) {
    remainder = (remainder << 1) ^ (((remainder >>> 9) & 1) * 0x537);
  }

  const bits = ((data << 10) | remainder) ^ 0x5412;

  for (let i = 0; i <= 5; i += 1) {
    setFunctionModule(matrix, 8, i, getBit(bits, i));
  }
  setFunctionModule(matrix, 8, 7, getBit(bits, 6));
  setFunctionModule(matrix, 8, 8, getBit(bits, 7));
  setFunctionModule(matrix, 7, 8, getBit(bits, 8));
  for (let i = 9; i < 15; i += 1) {
    setFunctionModule(matrix, 14 - i, 8, getBit(bits, i));
  }
  for (let i = 0; i < 8; i += 1) {
    setFunctionModule(matrix, QR_SIZE - 1 - i, 8, getBit(bits, i));
  }
  for (let i = 8; i < 15; i += 1) {
    setFunctionModule(matrix, 8, QR_SIZE - 15 + i, getBit(bits, i));
  }
  setFunctionModule(matrix, 8, QR_SIZE - 8, true);
};

const drawVersionBits = (matrix: QrMatrix) => {
  let remainder = QR_VERSION;
  for (let i = 0; i < 12; i += 1) {
    remainder = (remainder << 1) ^ (((remainder >>> 11) & 1) * 0x1f25);
  }

  const bits = (QR_VERSION << 12) | remainder;
  for (let i = 0; i < 18; i += 1) {
    const bit = getBit(bits, i);
    const a = QR_SIZE - 11 + (i % 3);
    const b = Math.floor(i / 3);
    setFunctionModule(matrix, a, b, bit);
    setFunctionModule(matrix, b, a, bit);
  }
};

const drawFunctionPatterns = (matrix: QrMatrix) => {
  drawFinderPattern(matrix, 3, 3);
  drawFinderPattern(matrix, QR_SIZE - 4, 3);
  drawFinderPattern(matrix, 3, QR_SIZE - 4);

  for (let i = 0; i < QR_SIZE; i += 1) {
    if (!matrix.isFunction[6][i]) {
      setFunctionModule(matrix, i, 6, i % 2 === 0);
    }
    if (!matrix.isFunction[i][6]) {
      setFunctionModule(matrix, 6, i, i % 2 === 0);
    }
  }

  QR_ALIGNMENT_POSITIONS.forEach((y, rowIndex) => {
    QR_ALIGNMENT_POSITIONS.forEach((x, columnIndex) => {
      const overlapsTopLeftFinder = rowIndex === 0 && columnIndex === 0;
      const overlapsTopRightFinder =
        rowIndex === 0 && columnIndex === QR_ALIGNMENT_POSITIONS.length - 1;
      const overlapsBottomLeftFinder =
        rowIndex === QR_ALIGNMENT_POSITIONS.length - 1 && columnIndex === 0;
      if (!overlapsTopLeftFinder && !overlapsTopRightFinder && !overlapsBottomLeftFinder) {
        drawAlignmentPattern(matrix, x, y);
      }
    });
  });

  reserveFormatBits(matrix);
  drawVersionBits(matrix);
};

const shouldMask = (x: number, y: number) => {
  return (x + y) % 2 === 0;
};

const drawCodewords = (matrix: QrMatrix, codewords: number[]) => {
  let bitIndex = 0;

  for (let right = QR_SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) {
      right -= 1;
    }

    for (let vertical = 0; vertical < QR_SIZE; vertical += 1) {
      const upward = ((right + 1) & 2) === 0;
      const y = upward ? QR_SIZE - 1 - vertical : vertical;

      for (let column = 0; column < 2; column += 1) {
        const x = right - column;
        if (matrix.isFunction[y][x]) {
          continue;
        }

        const codeword = codewords[bitIndex >>> 3] || 0;
        let isBlack = ((codeword >>> (7 - (bitIndex & 7))) & 1) !== 0;
        if (shouldMask(x, y)) {
          isBlack = !isBlack;
        }
        matrix.modules[y][x] = isBlack;
        bitIndex += 1;
      }
    }
  }
};

const buildQrMatrix = (text: string) => {
  const dataCodewords = encodePayload(text);
  if (!dataCodewords) {
    return null;
  }

  const matrix = createMatrix();
  drawFunctionPatterns(matrix);
  drawCodewords(matrix, addErrorCorrection(dataCodewords));
  drawFormatBits(matrix, QR_MASK_PATTERN);
  return matrix.modules;
};

export const buildQrSvgDataUri = (text: string) => {
  const modules = buildQrMatrix(text);
  if (!modules) {
    return null;
  }

  const dimension = QR_SIZE + QR_QUIET_ZONE * 2;
  const pathParts: string[] = [];

  modules.forEach((row, y) => {
    let x = 0;
    while (x < QR_SIZE) {
      if (!row[x]) {
        x += 1;
        continue;
      }

      const start = x;
      while (x < QR_SIZE && row[x]) {
        x += 1;
      }
      pathParts.push(
        `M${start + QR_QUIET_ZONE} ${y + QR_QUIET_ZONE}h${x - start}v1H${start + QR_QUIET_ZONE}z`,
      );
    }
  });

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}" shape-rendering="crispEdges">`,
    '<rect width="100%" height="100%" fill="#ffffff"/>',
    `<path fill="#061411" d="${pathParts.join(' ')}"/>`,
    '</svg>',
  ].join('');

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
