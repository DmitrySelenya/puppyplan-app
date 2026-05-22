// PuppyPlan — Onboarding screens (DESIGN.md §2.1)
// All strings verbatim from STRINGS.en.json.

// 2.1 Welcome
function ScreenOnbWelcome() {
  return (
    <Phone>
      <div style={{ flex: 1, padding: '24px 24px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginTop: 32 }}>
          {/* Subtle illustration placeholder — striped square */}
          <div style={{
            width: '100%', height: 220, borderRadius: 16,
            background: `repeating-linear-gradient(135deg, var(--pp-surface-sunken) 0 14px, var(--pp-surface-base) 14px 28px)`,
            border: '1px solid var(--pp-stroke)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--pp-text-tertiary)', fontFamily: 'var(--pp-font-mono)', fontSize: 11,
          }}>
            calm-companion illustration · 160pt
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div className="pp-title-1" style={{ marginBottom: 12 }}>The first days with a puppy can be messy.</div>
        <div className="pp-body" style={{ color: 'var(--pp-text-secondary)', marginBottom: 28 }}>
          Start with one clear plan.
        </div>
        <Button variant="primary" block size="lg">Get started</Button>
        <div style={{ textAlign: 'center', padding: '16px 0 32px' }}>
          <TextLink>I already have an account</TextLink>
        </div>
      </div>
    </Phone>
  );
}

// 2.2 Puppy Profile — default
function ScreenOnbProfile({ state = 'default' }) {
  const focused = state === 'focused';
  const error = state === 'error';
  const filled = state === 'filled' || state === 'focused' || state === 'error';
  return (
    <Phone>
      <div className="pp-navbar">
        <span><Icon name="chevron.left" size={28} color="var(--pp-text-link)" stroke={2} /></span>
        <span className="pp-caption" style={{ color: 'var(--pp-text-tertiary)' }}>Step 2 of 5</span>
        <span style={{ width: 28 }} />
      </div>
      <div style={{ padding: '16px 16px 0', flex: 1 }}>
        <div className="pp-title-2" style={{ marginBottom: 8 }}>What's your puppy's name?</div>
        <div className="pp-callout" style={{ color: 'var(--pp-text-secondary)', marginBottom: 24 }}>You can change this later.</div>

        <Field
          label="Name"
          value={filled ? 'Puppy A' : ''}
          placeholder="Puppy's name"
          focused={focused || error}
          style={{ marginBottom: 20 }}
        />

        <div className="pp-subheadline" style={{ color: 'var(--pp-text-secondary)', marginBottom: 8 }}>Age</div>
        <Segment options={['Age', 'Or date of birth']} value="Age" style={{ marginBottom: 12 }} />

        {/* Age stepper */}
        <Field
          value={filled ? '8 weeks' : '—'}
          trailing={
            <div style={{ display: 'flex', gap: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--pp-surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</div>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--pp-surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</div>
            </div>
          }
          error={error ? 'That date is in the future — please double-check' : null}
        />

        {filled && !error && (
          <div style={{ marginTop: 20 }}>
            <div style={{
              background: 'var(--pp-info-tint)', borderRadius: 12, padding: 14,
              color: 'var(--pp-info)', fontSize: 14, lineHeight: '20px',
              display: 'flex', gap: 10,
            }}>
              <Icon name="info.circle" size={18} stroke={2} />
              <span>At 8 weeks, puppies often sleep 18–20 hours a day.</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '12px 16px 24px' }}>
        <Button variant="primary" block disabled={!filled}>Continue</Button>
      </div>
    </Phone>
  );
}

// 2.4 Tracker Picker
function ScreenOnbTrackers() {
  const all = [
    { id: 'potty-out', icon: 'potty.outside', label: 'Pee outside', selected: true },
    { id: 'potty-in',  icon: 'potty.inside',  label: 'Pee inside',  selected: true },
    { id: 'poop',      icon: 'potty.poop',    label: 'Poop',        selected: true },
    { id: 'feeding',   icon: 'feeding.bowl',  label: 'Feeding',     selected: true },
    { id: 'sleep',     icon: 'sleep.moon',    label: 'Sleep',       selected: true },
    { id: 'zoomies',   icon: 'zoomies.spark', label: 'Zoomies',     selected: false },
    { id: 'training',  icon: 'training.paw',  label: 'Training',    selected: false },
  ];
  return (
    <Phone>
      <div className="pp-navbar">
        <span><Icon name="chevron.left" size={28} color="var(--pp-text-link)" stroke={2} /></span>
        <span className="pp-caption" style={{ color: 'var(--pp-text-tertiary)' }}>Step 4 of 5</span>
        <span style={{ width: 28 }} />
      </div>
      <div style={{ padding: '16px 16px 0', flex: 1 }}>
        <div className="pp-title-2" style={{ marginBottom: 8 }}>What to track</div>
        <div className="pp-callout" style={{ color: 'var(--pp-text-secondary)', marginBottom: 24 }}>
          Up to 5 actions. You can change them later.
        </div>

        <div className="pp-subheadline" style={{ color: 'var(--pp-text-secondary)', marginBottom: 12 }}>
          5 of 5 selected
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {all.map(t => (
            <TrackerTile key={t.id} icon={t.icon} label={t.label} selected={t.selected} size="two-col" />
          ))}
        </div>
      </div>
      <div style={{ padding: '12px 16px 24px' }}>
        <Button variant="primary" block>Continue</Button>
      </div>
    </Phone>
  );
}

// 2.5 Plan Reveal
function ScreenOnbPlanReveal() {
  return (
    <Phone>
      <div className="pp-navbar">
        <span style={{ width: 28 }} />
        <span className="pp-caption" style={{ color: 'var(--pp-text-tertiary)' }}>Step 5 of 5</span>
        <span style={{ width: 28 }} />
      </div>
      <div style={{ padding: '8px 16px 0', flex: 1, overflow: 'hidden' }}>
        <div className="pp-title-1" style={{ padding: '0 4px 4px' }}>Your plan for today</div>
        <div className="pp-callout" style={{ color: 'var(--pp-text-secondary)', padding: '0 4px 16px' }}>
          You can start with the first item.
        </div>

        <HeroCard
          eyebrow="START HERE"
          title="Log your first event — it takes about five seconds."
          primary="Start your first log"
        />

        <div style={{ height: 12 }} />

        <List>
          <ListRow leading={<Icon name="feeding.bowl" size={22} />} title="Watch the feeding pattern" chevron />
          <ListRow leading={<Icon name="potty.outside" size={22} />} title="Short potty breaks every 1–2 hours" chevron />
          <ListRow leading={<Icon name="sleep.moon" size={22} />} title="A quiet spot for sleep" chevron />
        </List>
      </div>
      <TabBar active="today" />
      <FAB />
    </Phone>
  );
}

// 2.6 First Log — after tap (pending)
function ScreenOnbFirstLogPending() {
  return (
    <Phone>
      <div className="pp-navbar">
        <span style={{ width: 28 }} />
        <span className="pp-caption" style={{ color: 'var(--pp-text-tertiary)' }}>Step 5 of 5</span>
        <span style={{ width: 28 }} />
      </div>
      <div style={{ padding: '8px 16px 0', flex: 1 }}>
        <div className="pp-title-1" style={{ padding: '0 4px 4px' }}>Your plan for today</div>
        <div className="pp-callout" style={{ color: 'var(--pp-text-secondary)', padding: '0 4px 16px' }}>
          You can start with the first item.
        </div>

        <Card style={{ background: 'var(--pp-accent-100)', borderColor: 'transparent', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Icon name="ui.checkmark.seal" size={22} color="var(--pp-accent-500)" stroke={2} />
            <span className="pp-caption" style={{ color: 'var(--pp-accent-700)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>First event</span>
          </div>
          <div className="pp-title-3" style={{ color: 'var(--pp-accent-700)', marginBottom: 4 }}>First event saved.</div>
          <div className="pp-body" style={{ color: 'var(--pp-accent-700)' }}>From here, a calm rhythm.</div>
        </Card>

        <div style={{ height: 12 }} />

        <List>
          <ListRow
            leading={<Icon name="potty.outside" size={22} />}
            title="Pee outside · 9:42"
            subtitle="Just now"
            trailing={<Pill tone="pending">Saving</Pill>}
          />
          <ListRow leading={<Icon name="feeding.bowl" size={22} />} title="Watch the feeding pattern" chevron />
          <ListRow leading={<Icon name="sleep.moon" size={22} />} title="A quiet spot for sleep" chevron />
        </List>
      </div>
      <div style={{ padding: '8px 16px 8px', position: 'relative' }}>
        <Snackbar action="Undo">Done. You can keep going.</Snackbar>
      </div>
      <TabBar active="today" />
      <FAB />
    </Phone>
  );
}

Object.assign(window, {
  ScreenOnbWelcome, ScreenOnbProfile, ScreenOnbTrackers, ScreenOnbPlanReveal, ScreenOnbFirstLogPending,
});
