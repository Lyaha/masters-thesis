import { useState } from 'react';
import { genderDistribution, type GenderId } from '../gender-distribution';
import { useTranslation } from '../i18n';
import type { Totals } from '../metrics';

type Props = {
  totals: Totals;
};

type Slice = {
  id: GenderId;
  path: string;
};

const center = 50;
const radius = 47;

export function GenderOrb({ totals }: Props) {
  const [activeId, setActiveId] = useState<GenderId>('men');
  const { language, t } = useTranslation();
  const segments = genderDistribution(totals);
  const activeSegment = segments.find((segment) => segment.id === activeId) ?? segments[0];
  const slices = createSlices(
    segments.map((segment) => ({ id: segment.id, value: segment.value })),
  );

  return (
    <div className="orb" aria-label={t('genderDistribution')}>
      <div className="orb-chart">
        <svg viewBox="0 0 100 100" role="img" aria-label={t('interactiveDistribution')}>
          {slices.map((slice) => {
            const segment = segments.find((item) => item.id === slice.id)!;
            const isActive = slice.id === activeId;

            return (
              <path
                key={slice.id}
                className={`orb-sector${isActive ? ' orb-sector-active' : ''}`}
                d={slice.path}
                fill={segment.color}
                onClick={() => setActiveId(slice.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setActiveId(slice.id);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`${genderLabel(segment.id, t)}: ${segment.percentage}%`}
                aria-pressed={isActive}
              />
            );
          })}
          <circle className="orb-center-disc" cx={center} cy={center} r="27" />
        </svg>
        <div className="orb-center" aria-live="polite">
          <b>{activeSegment.percentage}%</b>
          <small>
            {t('shareOf')}: {genderLabel(activeSegment.id, t).toLowerCase()}
          </small>
        </div>
      </div>

      <div className="orb-legend">
        {segments.map((segment) => {
          const isActive = segment.id === activeId;

          return (
            <button
              key={segment.id}
              type="button"
              className={`orb-key${isActive ? ' orb-key-active' : ''}`}
              onClick={() => setActiveId(segment.id)}
              aria-pressed={isActive}
            >
              <i style={{ backgroundColor: segment.color }} />
              <span>{genderLabel(segment.id, t)}</span>
              <b>{segment.percentage}%</b>
              <small>{segment.value.toLocaleString(language)}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function genderLabel(id: GenderId, t: ReturnType<typeof useTranslation>['t']) {
  return t(id === 'men' ? 'men' : id === 'women' ? 'women' : 'other');
}

function createSlices(segments: Array<{ id: GenderId; value: number }>): Slice[] {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let startAngle = -90;

  return segments.flatMap((segment) => {
    const angle = total ? (segment.value / total) * 360 : 0;
    const endAngle = startAngle + angle;
    const slice = angle ? { id: segment.id, path: sectorPath(startAngle, endAngle) } : null;
    startAngle = endAngle;

    return slice ? [slice] : [];
  });
}

function sectorPath(startAngle: number, endAngle: number) {
  const angle = endAngle - startAngle;

  if (angle >= 359.999) {
    return `M ${center} ${center - radius} A ${radius} ${radius} 0 1 1 ${center - 0.01} ${center - radius} Z`;
  }

  const start = pointAt(startAngle);
  const end = pointAt(endAngle);
  const largeArc = angle > 180 ? 1 : 0;

  return `M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function pointAt(angle: number) {
  const radians = (angle * Math.PI) / 180;

  return {
    x: center + radius * Math.cos(radians),
    y: center + radius * Math.sin(radians),
  };
}
