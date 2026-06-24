import { buildQrSvgDataUri } from '../lib/qrCode';
import { theme } from '../theme';

type PollShareQrSectionProps = Readonly<{
  shareUrl: string;
  qrUrl?: string;
  onCopyLink?: () => void;
}>;

/**
 * Extracted, self-contained QR share block for verifiability.
 * Renders the "QR 태그" label + large scannable img using the shipped buildQrSvgDataUri,
 * plus optional link copy button. Used by PollDetailPage.
 */
export function PollShareQrSection({ shareUrl, qrUrl, onCopyLink }: PollShareQrSectionProps) {
  const qrDataUri = buildQrSvgDataUri(qrUrl || shareUrl);
  if (!qrDataUri) {
    return null;
  }

  return (
    <div
      style={{
        marginTop: 8,
        paddingTop: 10,
        borderTop: `1px solid ${theme.border}`,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 13.5,
          fontWeight: 700,
          color: theme.textMuted,
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        QR 태그 📱
        {onCopyLink ? (
          <button
            type="button"
            className="pressable"
            onClick={onCopyLink}
            style={{
              fontSize: 13,
              padding: '0 16px',
              borderRadius: 12,
              border: `1px solid ${theme.border}`,
              background: 'rgba(255,255,255,0.04)',
              color: theme.accent,
              cursor: 'pointer',
              minHeight: 44,
              fontWeight: 700,
            }}
          >
            링크 복사
          </button>
        ) : null}
      </div>
      <img
        src={qrDataUri}
        alt="투표 QR 코드"
        style={{
          width: 240,
          height: 240,
          background: '#fff',
          borderRadius: 18,
          padding: 12,
          border: `1px solid ${theme.border}`,
          boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
          imageRendering: 'pixelated',
        }}
      />
      <div style={{ fontSize: 12.5, color: theme.textMuted, marginTop: 8, lineHeight: 1.5 }}>
        카메라로 스캔하면 웹에서 열리고, Toss 앱이 있으면 앱으로 이동할 수 있어요
      </div>
      {/* Fallback visible link for mobile tap/long-press when camera scan is tricky */}
      <div
        style={{
          fontSize: 12,
          color: theme.textFaint,
          marginTop: 6,
          wordBreak: 'break-all',
          opacity: 0.8,
        }}
      >
        {shareUrl}
      </div>
    </div>
  );
}
