// PuppyPlan — Quick Log sheet (DESIGN.md §2.3)
// The sheet sits on top of a dimmed Today.

function QuickLogShell({ children, height = 460 }) {
  return (
    <Phone>
      {/* Faded today behind */}
      <TodayHeader />
      <div style={{ flex: 1, overflow: 'hidden', padding: '0 16px' }}>
        <Card style={{ opacity: 0.6 }}>
          <div className="pp-title-3">Looks like it's time for a break.</div>
          <div className="pp-body" style={{ color: 'var(--pp-text-secondary)' }}>Last break was 1 hr 40 min ago.</div>
        </Card>
      </div>
      <div style={{ position: 'absolute', inset: '47px 0 0 0', background: 'rgba(26,26,24,0.32)', pointerEvents: 'none' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'var(--pp-surface-raised)',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -4px 16px rgba(28,31,27,0.10)',
        height,
        display: 'flex', flexDirection: 'column',
        zIndex: 30,
      }}>
        <div className="pp-sheet-handle" />
        {children}
      </div>
    </Phone>
  );
}

const QL_TRACKERS = [
  { id: 'potty-out', icon: 'potty.outside',  label: 'Pee outside' },
  { id: 'potty-in',  icon: 'potty.inside',   label: 'Pee inside' },
  { id: 'poop',      icon: 'potty.poop',     label: 'Poop' },
  { id: 'feeding',   icon: 'feeding.bowl',   label: 'Feeding' },
  { id: 'sleep',     icon: 'sleep.moon',     label: 'Sleep' },
];

// ──────────────────────────────────────────────────────────
// 4.1 Quick Log — default (5 trackers, 3-col grid)
// ──────────────────────────────────────────────────────────
function ScreenQLDefault() {
  return (
    <QuickLogShell>
      <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className="pp-title-2">What happened?</div>
        <span style={{ color: 'var(--pp-text-link)', fontSize: 15 }}>Edit trackers</span>
      </div>
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {QL_TRACKERS.map(t => (
            <TrackerTile key={t.id} icon={t.icon} label={t.label} />
          ))}
        </div>
      </div>
    </QuickLogShell>
  );
}

// ──────────────────────────────────────────────────────────
// 4.2 Quick Log — after tap (pending + snackbar Undo)
// ──────────────────────────────────────────────────────────
function ScreenQLPending() {
  return (
    <Phone>
      <TodayHeader />
      <div style={{ flex: 1, padding: '0 16px' }}>
        <HeroCard
          eyebrow="NOW"
          title="Looks like it's time for a break."
          body="Last break was 1 hr 40 min ago."
          primary="Log it"
          tertiary="Later"
        />
        <div style={{ height: 20 }} />
        <SectionHeader>Now</SectionHeader>
        <List>
          <ListRow
            leading={<Icon name="potty.outside" size={22} />}
            title="Pee outside · 9:42"
            subtitle="just now"
            trailing={<Pill tone="pending">Saving</Pill>}
          />
        </List>
      </div>
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 49 + 34 + 16, zIndex: 25 }}>
        <Snackbar action="Undo" secondary="Add details">Logged · Pee outside</Snackbar>
      </div>
      <TabBar active="today" />
      <FAB />
    </Phone>
  );
}

// ──────────────────────────────────────────────────────────
// 4.4 Quick Log — duplicate warning (muted secondary sheet)
// ──────────────────────────────────────────────────────────
function ScreenQLDuplicate() {
  return (
    <Phone>
      <TodayHeader />
      <div style={{ flex: 1, padding: '0 16px' }}>
        <Card>
          <div className="pp-title-3">Looks like it's time for a break.</div>
          <div className="pp-body" style={{ color: 'var(--pp-text-secondary)' }}>Last break was 1 hr 40 min ago.</div>
        </Card>
      </div>
      <div style={{ position: 'absolute', inset: '47px 0 0 0', background: 'rgba(26,26,24,0.32)', pointerEvents: 'none', zIndex: 25 }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'var(--pp-surface-raised)',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -4px 16px rgba(28,31,27,0.10)',
        padding: '0 16px 24px',
        zIndex: 30,
      }}>
        <div className="pp-sheet-handle" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Icon name="info.circle" size={22} color="var(--pp-warning)" stroke={2} />
          <span className="pp-title-2">Looks like this is already logged</span>
        </div>
        <div className="pp-body" style={{ color: 'var(--pp-text-secondary)', marginBottom: 20 }}>
          Caregiver A logged a feeding 42 seconds ago.
        </div>
        <Button variant="primary" block>This is a different event — add it</Button>
        <div style={{ textAlign: 'center', padding: '14px 0 4px' }}>
          <TextLink>Cancel</TextLink>
        </div>
      </div>
    </Phone>
  );
}

// ──────────────────────────────────────────────────────────
// 4.5 Quick Log — failed save (inline retry/delete on row)
// ──────────────────────────────────────────────────────────
function ScreenQLFailed() {
  return (
    <Phone>
      <TodayHeader />
      <div style={{ padding: '0 16px 12px' }}>
        <Banner tone="failed">A few events didn't save. Check your connection.</Banner>
      </div>
      <div style={{ flex: 1, padding: '0 16px 96px', overflow: 'auto' }}>
        <SectionHeader>Now</SectionHeader>
        <Card padding={0}>
          <div style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Icon name="potty.outside" size={22} />
            <div style={{ flex: 1 }}>
              <div className="pp-headline">Pee outside · 9:42</div>
              <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginTop: 2 }}>Couldn't save. Try again?</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <span style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--pp-primary-600)', color: '#fff', fontSize: 13, fontWeight: 600 }}>Try again</span>
                <span style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--pp-surface-sunken)', color: 'var(--pp-text-secondary)', fontSize: 13, fontWeight: 600 }}>Discard</span>
              </div>
            </div>
            <Pill tone="failed">Not saved</Pill>
          </div>
        </Card>
      </div>
      <TabBar active="today" />
      <FAB />
    </Phone>
  );
}

// ──────────────────────────────────────────────────────────
// 4.6 Quick Log — details form (potty)
// ──────────────────────────────────────────────────────────
function ScreenQLDetails() {
  return (
    <Phone>
      <div className="pp-navbar">
        <span style={{ color: 'var(--pp-text-link)', fontSize: 17 }}>Cancel</span>
        <span className="pp-nav-title">Potty</span>
        <span style={{ color: 'var(--pp-text-link)', fontSize: 17, fontWeight: 600 }}>Save</span>
      </div>
      <div style={{ flex: 1, padding: '8px 16px 16px', overflow: 'auto' }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Icon name="potty.outside" size={26} />
            <div className="pp-title-3">Pee outside</div>
          </div>
          <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)' }}>Logged at 9:42 · today</div>
        </Card>

        <div style={{ height: 20 }} />
        <SectionHeader>Add details (optional)</SectionHeader>

        <Card padding={0}>
          <div style={{ padding: 14 }}>
            <div className="pp-subheadline" style={{ color: 'var(--pp-text-secondary)', marginBottom: 8 }}>Context</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['After sleep', 'After eating', 'Walk', 'Play', 'Not sure'].map((c, i) => (
                <span key={c} style={{
                  padding: '7px 12px', borderRadius: 8,
                  background: i === 1 ? 'var(--pp-primary-50)' : 'var(--pp-surface-sunken)',
                  color: i === 1 ? 'var(--pp-primary-700)' : 'var(--pp-text-secondary)',
                  border: i === 1 ? '1px solid var(--pp-primary-500)' : '1px solid transparent',
                  fontSize: 13, fontWeight: 500,
                }}>{c}</span>
              ))}
            </div>
          </div>
          <div className="pp-divider" />
          <div style={{ padding: 14 }}>
            <div className="pp-subheadline" style={{ color: 'var(--pp-text-secondary)', marginBottom: 8 }}>Note</div>
            <div style={{
              minHeight: 60, padding: 12,
              background: 'var(--pp-surface-base)',
              border: '1px solid var(--pp-stroke)', borderRadius: 8,
              color: 'var(--pp-text-tertiary)', fontSize: 15,
            }}>Optional · 80 characters or so</div>
          </div>
          <div className="pp-divider" />
          <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 8,
              background: 'var(--pp-surface-sunken)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--pp-text-tertiary)',
            }}>
              <Icon name="action.add" size={24} stroke={2} />
            </div>
            <div className="pp-callout" style={{ color: 'var(--pp-text-secondary)' }}>Add photo</div>
          </div>
        </Card>
      </div>
    </Phone>
  );
}

Object.assign(window, {
  ScreenQLDefault, ScreenQLPending, ScreenQLDuplicate, ScreenQLFailed, ScreenQLDetails,
});
