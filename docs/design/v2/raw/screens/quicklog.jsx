// PuppyPlan — Quick Log sheet (DESIGN.md §2.3)
// The sheet sits on top of a dimmed Today.
//
// CANONICAL TRACKER TAXONOMY (review pass 3, P0 — one vocabulary everywhere):
//   trackers: Potty · Feeding · Sleep · Walk · Weight (+ optional: Play, Training, Biting)
//   Potty subtypes: outside / inside / poop — chosen in the details form, never
//   as separate top-level trackers. Same list drives Quick Log tiles, settings
//   14.3, Timeline filters, onboarding 2.4, and sharing scopes. Logged events
//   may display their subtype (“Pee outside · 9:42”) — that's data, not taxonomy.

function QuickLogShell({ children, height = 460, onClose }) {
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
      {/* Scrim closes the sheet on tap — iOS HIG (audit 4.5) */}
      <div role="button" aria-label="Close" tabIndex={0} onClick={onClose} style={{ position: 'absolute', inset: '47px 0 0 0', background: 'rgba(40,30,22,0.34)', cursor: 'pointer' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'var(--pp-surface-raised)',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -4px 16px rgba(70,50,30,0.10)',
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
  { id: 'potty',   icon: 'potty.outside', label: 'Potty' },
  { id: 'feeding', icon: 'feeding.bowl',  label: 'Feeding' },
  { id: 'sleep',   icon: 'sleep.moon',    label: 'Sleep' },
  { id: 'walk',    icon: 'feeding.walk',  label: 'Walk' },
  { id: 'weight',  icon: 'weight',        label: 'Weight' },
];

// ──────────────────────────────────────────────────────────
// 4.1 Quick Log — default (5 trackers, 3-col grid)
// ──────────────────────────────────────────────────────────
function ScreenQLDefault() {
  return (
    <QuickLogShell>
      <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="pp-title-2">What happened?</div>
        <NavbarAction align="right" style={{ fontSize: 15, margin: '-10px -8px' }}>Edit trackers</NavbarAction>
      </div>
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {QL_TRACKERS.map(t => (
            <TrackerTile key={t.id} icon={t.icon} label={t.label} role="button" />
          ))}
        </div>
      </div>
    </QuickLogShell>
  );
}

// ──────────────────────────────────────────────────────────
// 4.2 Quick Log — after tap (pending + snackbar Undo)
// FAB policy: FAB is HIDDEN while the snackbar is visible (P0 — Undo sat under it).
// ──────────────────────────────────────────────────────────
function ScreenQLPending() {
  return (
    <Phone>
      <TodayHeader />
      <div style={{ flex: 1, padding: '0 16px 120px' }}>
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
      {/* FAB intentionally absent: hidden while snackbar is visible (FAB policy) */}
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
      {/* Scrim closes the sheet on tap — iOS HIG (audit 4.5) */}
      <div role="button" aria-label="Close" tabIndex={0} style={{ position: 'absolute', inset: '47px 0 0 0', background: 'rgba(40,30,22,0.34)', cursor: 'pointer', zIndex: 25 }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'var(--pp-surface-raised)',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -4px 16px rgba(70,50,30,0.10)',
        padding: '0 16px 24px',
        zIndex: 30,
      }}>
        <div className="pp-sheet-handle" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Icon name="info.circle" size={22} color="var(--pp-warning)" stroke={2} />
          <span className="pp-title-2">Looks like this is already logged</span>
        </div>
        <div className="pp-body" style={{ color: 'var(--pp-text-secondary)', marginBottom: 20 }}>
          Caregiver A logged a feeding 40 seconds ago.
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
      <div style={{ flex: 1, padding: '0 16px 120px', overflow: 'auto' }}>
        <SectionHeader>Now</SectionHeader>
        <Card padding={0}>
          <div style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Icon name="potty.outside" size={22} />
            <div style={{ flex: 1 }}>
              <div className="pp-headline">Pee outside · 9:42</div>
              <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginTop: 2 }}>Couldn't save. Try again?</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" className="pp-chip" style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--pp-primary-600)', color: '#fff', fontSize: 13, fontWeight: 600 }}>Try again</button>
                <button type="button" className="pp-chip" style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--pp-surface-sunken)', color: 'var(--pp-text-secondary)', fontSize: 13, fontWeight: 600 }}>Discard</button>
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
        <NavbarAction align="left">Cancel</NavbarAction>
        <span className="pp-nav-title">Potty</span>
        <NavbarAction align="right" bold>Save</NavbarAction>
      </div>
      <div style={{ flex: 1, padding: '8px 16px 16px', overflow: 'auto' }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Icon name="potty.outside" size={26} />
            <div className="pp-title-3">Potty</div>
          </div>
          <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginBottom: 12 }}>Logged at 9:42 · today</div>
          {/* Potty subtype lives here — not as separate top-level trackers (canonical taxonomy) */}
          <Segment options={['Outside', 'Inside', 'Poop']} value="Outside" ariaLabel="Potty type" />
        </Card>

        <div style={{ height: 20 }} />
        <SectionHeader>Add details (optional)</SectionHeader>

        <Card padding={0}>
          <div style={{ padding: 14 }}>
            <div className="pp-subheadline" style={{ color: 'var(--pp-text-secondary)', marginBottom: 8 }}>Context</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['After sleep', 'After eating', 'Walk', 'Play', 'Not sure'].map((c, i) => (
                <button key={c} type="button" className="pp-chip" aria-pressed={i === 1} style={{
                  padding: '7px 12px', borderRadius: 8,
                  background: i === 1 ? 'var(--pp-primary-50)' : 'var(--pp-surface-sunken)',
                  color: i === 1 ? 'var(--pp-primary-700)' : 'var(--pp-text-secondary)',
                  border: i === 1 ? '1px solid var(--pp-primary-500)' : '1px solid transparent',
                  fontSize: 13, fontWeight: 500,
                }}>{c}</button>
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
