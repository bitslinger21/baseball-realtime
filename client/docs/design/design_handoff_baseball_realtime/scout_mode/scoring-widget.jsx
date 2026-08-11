/* global React, T */

function ScoringWidget({ away, awayScore, home, homeScore, inning, half, count, bases, pitcher, batter }) {
  return (
    <div style={{ display: 'inline-block' }}>
      <div style={{ border: `1px solid ${T.borderStrong}`, background: T.surface, overflow: 'hidden', boxShadow: T.sh.sm, borderRadius: 10 }}>
        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border}`, background: T.surface }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '17px', gap: '4px', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, color: T.ink }}>{pitcher.name}</span>
            <span style={{ color: T.textMuted, fontSize: '16px' }}>{pitcher.era}</span>
            <span style={{ color: T.textMuted, fontSize: '16px', marginLeft: 'auto' }}>{pitcher.pc} PC</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '17px', gap: '4px' }}>
            <span style={{ fontWeight: 700, color: T.ink }}>{batter.name}</span>
            <span style={{ color: T.textMuted, fontSize: '16px' }}>{batter.avg}</span>
            <span style={{ color: T.textMuted, fontSize: '16px', marginLeft: 'auto' }}>{batter.ab}</span>
          </div>
        </div>
        <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '90px 1px 130px 1px 160px 1px 90px', gap: 0, alignItems: 'stretch' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '0 4px' }}>
            <img src={`https://www.mlbstatic.com/team-logos/${away.id}.svg`} alt={away.abbr} onerror="this.style.display='none'" style={{ width: '42px', height: '42px', objectFit: 'contain' }} />
            <div style={{ fontSize: '22px', fontWeight: 700, color: T.ink, letterSpacing: '0.5px' }}>{away.abbr}</div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: T.ink, lineHeight: 1 }}>{awayScore}</div>
          </div>
          <div style={{ background: T.borderStrong, width: '1px' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '0 12px' }}>
            <div style={{ fontWeight: 700, fontSize: '20px', color: T.ink }}>
              {inning}
              <span style={{ fontSize: '18px', marginLeft: '6px' }}>{half === 'top' ? '▲' : '▼'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '20px 20px 20px', gridTemplateRows: '20px 20px 20px', gap: 0, width: '60px' }}>
              {bases.second && <div style={{ gridRow: 1, gridColumn: 2, fontSize: '36px', color: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>◆</div>}
              {!bases.second && <div style={{ gridRow: 1, gridColumn: 2, fontSize: '36px', color: T.ink, fontWeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>◇</div>}
              {bases.first && <div style={{ gridRow: 2, gridColumn: 3, fontSize: '36px', color: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>◆</div>}
              {!bases.first && <div style={{ gridRow: 2, gridColumn: 3, fontSize: '36px', color: T.ink, fontWeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>◇</div>}
              {bases.third && <div style={{ gridRow: 2, gridColumn: 1, fontSize: '36px', color: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>◆</div>}
              {!bases.third && <div style={{ gridRow: 2, gridColumn: 1, fontSize: '36px', color: T.ink, fontWeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>◇</div>}
            </div>
          </div>
          <div style={{ background: T.borderStrong, width: '1px' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center', alignItems: 'center', padding: '0 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[['balls', count[0], 3],['strikes', count[1], 2],['outs', count[2], 2]].map(([l,c,t])=>(
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '40px', fontSize: '18px' }}>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', width: '56px', textAlign: 'left' }}>{l}</div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {Array.from({length:t}).map((_,i)=>(
                      <div key={i} style={{ width: '12px', height: '12px', border: `1px solid ${T.ink}`, borderRadius: '50%', background: i < c ? T.ink : 'white' }}></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: T.borderStrong, width: '1px' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '0 4px' }}>
            <img src={`https://www.mlbstatic.com/team-logos/${home.id}.svg`} alt={home.abbr} onerror="this.style.display='none'" style={{ width: '42px', height: '42px', objectFit: 'contain' }} />
            <div style={{ fontSize: '22px', fontWeight: 700, color: T.ink, letterSpacing: '0.5px' }}>{home.abbr}</div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: T.ink, lineHeight: 1 }}>{homeScore}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScoringWidget });
