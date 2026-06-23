// PuppyPlan — Timeline screens (DESIGN.md §2.4)
//
// Filter chips follow the canonical tracker taxonomy (review pass 3, P0):
// All · Potty · Feeding · Sleep · Walk · Weight (+ Play / Training / Biting when enabled).
// Earlier draft used «Food» and «Zoomies» which appeared nowhere else — dropped.

function TimelineHeader({ filter = 'All' }) {
  // Canonical: matches Quick Log tiles + Settings 14.3 + onboarding 2.4 exactly.
  const chips = ['All', 'Potty', 'Feeding', 'Sleep', 'Walk', 'Weight'];
  return (
    <>
      <div className="pp-navbar">
        <span style={{ color: 'var(--pp-text-link)', fontSize: 17 }}>Today</span>
        <span className="pp-nav-title">Events</span>
        <Icon name="action.search" size={22} />
      </div>
      <div className="pp-large-title">Events</div>
      <div style={{ padding: '4px 16px 12px', display: 'flex', gap: 8, overflowX: 'auto' }}>
        {chips.map(c => (
          <span key={c} style={{
            padding: '7px 14px', borderRadius: 999,
            background: c === filter ? 'var(--pp-primary-600)' : 'var(--pp-surface-raised)',
            color: c === filter ? '#fff' : 'var(--pp-text-secondary)',
            border: c === filter ? 'none' : '1px solid var(--pp-stroke)',
            fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', flex: '0 0 auto',
          }}>{c}</span>
        ))}
      </div>
    </>
  );
}

function TimelineEvent({ time, icon, title, meta, actor, pill }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 16px' }}>
      <div style={{ minWidth: 48, paddingTop: 2 }}>
        <div className="pp-footnote pp-mono" style={{ color: 'var(--pp-text-tertiary)' }}>{time}</div>
      </div>
      <div style={{ flex: '0 0 auto' }}>
        <Icon name={icon} size={22} color="var(--pp-text-primary)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="pp-body-emph" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{title}</span>
          {pill && pill}
        </div>
        {meta && <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginTop: 2 }}>{meta}</div>}
        {actor && <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginTop: 2 }}>Logged by: {actor}</div>}
      </div>
    </div>
  );
}

// 5.1 Timeline — synced default
function ScreenTimeline({ state = 'default' }) {
  return (
    <Phone>
      <TimelineHeader />
      <div style={{ flex: 1, overflow: 'auto', padding: '0 0 var(--pp-bottom-inset-fab)' }}>
        <div style={{ padding: '4px 16px 8px' }}>
          <div className="pp-caption" style={{ color: 'var(--pp-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>
            Today · Thursday
          </div>
        </div>
        <Card padding={0} style={{ margin: '0 16px' }}>
          <TimelineEvent time="09:42" icon="potty.outside" title="Pee outside" meta="After sleep" actor="You"
            pill={state === 'pending' ? <Pill tone="pending">Saving</Pill> : null} />
          <div className="pp-divider" />
          <TimelineEvent time="09:31" icon="feeding.bowl" title="Feeding · 60 g" meta="Usual portion" actor="Caregiver A" />
          <div className="pp-divider" />
          <TimelineEvent time="07:14" icon="sleep.moon" title="Sleep · 47 min" actor="You" />
        </Card>

        <div style={{ padding: '20px 16px 8px' }}>
          <div className="pp-caption" style={{ color: 'var(--pp-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>
            Yesterday · Wednesday
          </div>
        </div>
        <Card padding={0} style={{ margin: '0 16px' }}>
          <TimelineEvent time="20:10" icon="feeding.walk" title="Walk · 22 min" actor="Dmitry"
            pill={state === 'failed' ? <Pill tone="failed">Not saved</Pill> : null} />
          <div className="pp-divider" />
          <TimelineEvent time="18:00" icon="feeding.bowl" title="Feeding · 60 g" actor="Caregiver A" />
          <div className="pp-divider" />
          <TimelineEvent time="12:30" icon="potty.outside" title="Pee outside" actor="You" />
          <div className="pp-divider" />
          <TimelineEvent time="08:00" icon="med.weight" title="Weight: 4.2 kg" meta="0.3 kg more than last week" actor="You" />
        </Card>
      </div>
      <TabBar active="today" />
      <FAB />
    </Phone>
  );
}

// 5.4 Timeline filtered — only feeding
function ScreenTimelineFiltered() {
  return (
    <Phone>
      <TimelineHeader filter="Feeding" />
      <div style={{ flex: 1, overflow: 'auto', padding: '0 0 var(--pp-bottom-inset-fab)' }}>
        <div style={{ padding: '4px 16px 8px' }}>
          <div className="pp-caption" style={{ color: 'var(--pp-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>Today · Thursday</div>
        </div>
        <Card padding={0} style={{ margin: '0 16px' }}>
          <TimelineEvent time="09:31" icon="feeding.bowl" title="Feeding · 60 g" meta="Usual portion" actor="Caregiver A" />
        </Card>
        <div style={{ padding: '20px 16px 8px' }}>
          <div className="pp-caption" style={{ color: 'var(--pp-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>Yesterday · Wednesday</div>
        </div>
        <Card padding={0} style={{ margin: '0 16px' }}>
          <TimelineEvent time="18:00" icon="feeding.bowl" title="Feeding · 60 g" actor="Caregiver A" />
          <div className="pp-divider" />
          <TimelineEvent time="12:00" icon="feeding.bowl" title="Feeding · 55 g" actor="You" />
          <div className="pp-divider" />
          <TimelineEvent time="07:30" icon="feeding.bowl" title="Feeding · 60 g" actor="You" />
        </Card>
      </div>
      <TabBar active="today" />
      <FAB />
    </Phone>
  );
}

// 5.5 Timeline empty — filtered nothing found
function ScreenTimelineEmpty() {
  return (
    <Phone>
      <TimelineHeader filter="Health" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px 96px', textAlign: 'center' }}>
        <div style={{
          width: 80, height: 80, borderRadius: 999,
          background: 'var(--pp-surface-sunken)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          <Icon name="action.search" size={36} stroke={1.5} color="var(--pp-text-tertiary)" />
        </div>
        <div className="pp-title-3" style={{ marginBottom: 8 }}>Nothing here</div>
        <div className="pp-body" style={{ color: 'var(--pp-text-secondary)', marginBottom: 24 }}>
          Try a different range or clear the filters.
        </div>
        <Button variant="primary">Clear filters</Button>
      </div>
      <TabBar active="today" />
      <FAB />
    </Phone>
  );
}

Object.assign(window, { ScreenTimeline, ScreenTimelineFiltered, ScreenTimelineEmpty });
