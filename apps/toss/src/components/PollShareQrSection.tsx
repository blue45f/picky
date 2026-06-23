import { buildQrSvgDataUri } from '../lib/qrCode';
import { theme } from '../theme';

interface PollShareQrSectionProps {
  shareUrl: string;
  onCopyLink?: () => void;
}

/**
 * Extracted, self-contained QR share block for verifiability.
 * Renders the "QR 태그" label + large scannable img using the shipped buildQrSvgDataUri,
 * plus optional link copy button. Used by PollDetailPage.
 */
export function PollShareQrSection({ shareUrl, onCopyLink }: PollShareQrSectionProps) {
  const qrDataUri = buildQrSvgDataUri(shareUrl);
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
          fontSize: 12,
          fontWeight: 700,
          color: theme.textMuted,
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        QR 태그 📱
        {onCopyLink ? (
          <button
            type="button"
            onClick={onCopyLink}
            style={{
              fontSize: 12,
              padding: '4px 10px',
              borderRadius: 8,
              border: `1px solid ${theme.border}`,
              background: 'rgba(255,255,255,0.04)',
              color: theme.accent,
              cursor: 'pointer',
              minHeight: 28,
              fontWeight: 600,
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
          width: 176,
          height: 176,
          background: '#fff',
          borderRadius: 12,
          padding: 10,
          border: `1px solid ${theme.border}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }}
      />
      <div style={{ fontSize: 11, color: theme.textFaint, marginTop: 6 }}>
        카메라로 스캔하면 바로 참여할 수 있어요
      </div>
    </div>
  );
}
