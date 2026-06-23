// PuppyPlan — Onboarding screens (DESIGN.md §2.1)
// All strings verbatim from STRINGS.en.json.

// 2.1 Welcome — centered hero composition (layout per onboarding ref).
// Illustration + copy centered; large pill CTA in Sage (design-system green).
function ScreenOnbWelcome() {
  return (
    <Phone>
      <div style={{
        flex: 1, padding: '24px 28px 0', display: 'flex', flexDirection: 'column',
        alignItems: 'center', textAlign: 'center',
      }}>
        {/* Centered illustration on a soft sage blob */}
        <div style={{
          marginTop: 56, position: 'relative',
          width: 248, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            position: 'absolute', width: 210, height: 184,
            background: 'var(--pp-sage-300)', opacity: 0.5,
            borderRadius: '46% 54% 50% 50% / 58% 56% 44% 42%',
          }} />
          {/* Illustration placeholder — drop the calm-companion art here */}
          <div style={{
            position: 'relative', width: 188, height: 188, borderRadius: 32,
            background: 'repeating-linear-gradient(135deg, var(--pp-surface-sunken) 0 14px, var(--pp-surface-raised) 14px 28px)',
            border: '1px solid var(--pp-stroke)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            color: 'var(--pp-text-tertiary)', fontFamily: 'var(--pp-font-mono)', fontSize: 11, padding: 12,
          }}>
            calm-companion<br />illustration · 160pt
          </div>
        </div>

        {/* Centered copy, vertically balanced */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <div className="pp-title-1" style={{ maxWidth: 280 }}>The first days with a puppy can be messy.</div>
          <div className="pp-body" style={{ color: 'var(--pp-text-secondary)', maxWidth: 260 }}>
            Start with one clear plan.
          </div>
        </div>

        {/* Large pill CTA — Sage green */}
        <div style={{ width: '100%', maxWidth: 340 }}>
          <button type="button" style={{
            width: '100%', minHeight: 60, border: 0, cursor: 'pointer',
            borderRadius: 'var(--pp-r-full)',
            background: 'var(--pp-sage-300)', color: '#2C3A1E',
            fontFamily: 'var(--pp-font-display)', fontWeight: 700, fontSize: 18,
            boxShadow: '0 8px 20px rgba(94, 122, 62, 0.24)',
          }}>Get started</button>
          <div style={{ textAlign: 'center', padding: '16px 0 32px' }}>
            <TextLink>I already have an account</TextLink>
          </div>
        </div>
      </div>
    </Phone>
  );
}

// 2.2 Puppy Profile — name → gender → age → gentle hint
function GenderOption({ icon, label, iconColor, tint, selected }) {
  return (
    <button type="button" style={{
      display: 'flex', alignItems: 'center', gap: 14, width: '100%',
      minHeight: 60, padding: '0 16px', cursor: 'pointer', textAlign: 'left',
      borderRadius: 'var(--pp-r-lg)',
      border: selected ? '2px solid var(--pp-primary-600)' : '1.5px solid var(--pp-stroke)',
      background: selected ? 'var(--pp-primary-50)' : 'var(--pp-surface-raised)',
      fontFamily: 'var(--pp-font)',
    }}>
      <span style={{
        width: 36, height: 36, borderRadius: 999, background: tint,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
      }}>
        <Icon name={icon} size={20} color={iconColor} stroke={2.25} />
      </span>
      <span className="pp-headline" style={{ flex: 1, fontSize: 17 }}>{label}</span>
      {selected && <Icon name="check" size={20} color="var(--pp-primary-600)" stroke={2.5} />}
    </button>
  );
}

function ScreenOnbProfile({ state = 'default' }) {
  const focused = state === 'focused';
  const error = state === 'error';
  // In error state the user is on «Or date of birth» mode with a future date —
  // matches the «date is in the future» copy.
  const filled = state === 'filled' || state === 'focused' || state === 'error';
  const gender = filled ? 'female' : null;
  return (
    <Phone>
      <div className="pp-navbar">
        <NavbarAction align="left" ariaLabel="Back"><Icon name="chevron.left" size={28} color="var(--pp-text-link)" stroke={2} /></NavbarAction>
        <span className="pp-caption" style={{ color: 'var(--pp-text-tertiary)' }}>Step 2 of 5</span>
        <span style={{ width: 44 }} />
      </div>
      <div style={{ padding: '16px 16px 0', flex: 1 }}>
        <div className="pp-title-2" style={{ marginBottom: 8 }}>Tell us about your pup</div>
        <div className="pp-callout" style={{ color: 'var(--pp-text-secondary)', marginBottom: 24 }}>You can change this later.</div>

        {/* 1 — Name */}
        <Field
          label="Name"
          value={filled ? 'Puppy A' : ''}
          placeholder="Puppy's name"
          focused={focused || error}
          style={{ marginBottom: 20 }}
        />

        {/* 2 — Gender */}
        <div className="pp-subheadline" style={{ color: 'var(--pp-text-secondary)', marginBottom: 8 }}>Gender</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <GenderOption icon="gender.female" label="Girl" iconColor="#C2718F" tint="#F7E3EA" selected={gender === 'female'} />
          <GenderOption icon="gender.male" label="Boy" iconColor="#6E78C0" tint="#E4E7F4" selected={gender === 'male'} />
        </div>

        {/* 3 — Age */}
        <div className="pp-subheadline" style={{ color: 'var(--pp-text-secondary)', marginBottom: 8 }}>Age</div>
        {error ? (
          <>
            <Segment options={['Age', 'Or date of birth']} value="Or date of birth" style={{ marginBottom: 12 }} />
            <Field
              value="Jul 4, 2026"
              trailing={<Icon name="chevron.down" size={18} color="var(--pp-text-tertiary)" />}
              error="That date is in the future — please double-check"
            />
          </>
        ) : (
          <Field
            value={filled ? '8 weeks' : ''}
            placeholder="e.g. 8 weeks, 1 year"
          />
        )}

        {/* 4 — Gentle hint */}
        <div style={{ marginTop: 20 }}>
          <div style={{
            background: 'var(--pp-info-tint)', borderRadius: 14, padding: 14,
            color: 'var(--pp-info)', fontSize: 14, lineHeight: '20px',
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <Icon name="ui.paw.filled" size={18} color="var(--pp-info)" stroke={2} style={{ marginTop: 1 }} />
            <span>{filled && !error
              ? 'At 8 weeks, puppies often sleep 18–20 hours a day — naps are normal.'
              : 'We\u2019ll use this to tailor gentle, age-appropriate tips just for your pup.'}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 16px 24px' }}>
        <Button variant="primary" block disabled={!filled}>Continue</Button>
      </div>
    </Phone>
  );
}

// 2.4 Tracker Picker
// Canonical taxonomy (review pass 3, P0): five primary trackers + three optional.
// Same list drives Quick Log tiles, Timeline filters, Settings 14.3 and sharing scopes.
// Potty subtypes (outside/inside/poop) live INSIDE the Potty tile / details form,
// not as separate top-level rows.
function ScreenOnbTrackers() {
  const all = [
    { id: 'potty',    icon: 'potty.outside', label: 'Potty',    selected: true },
    { id: 'feeding',  icon: 'feeding.bowl',  label: 'Feeding',  selected: true },
    { id: 'sleep',    icon: 'sleep.moon',    label: 'Sleep',    selected: true },
    { id: 'walk',     icon: 'feeding.walk',  label: 'Walk',     selected: true },
    { id: 'weight',   icon: 'med.weight',    label: 'Weight',   selected: true },
    // Optional (off by default — user can opt in, max 5 picked at once)
    { id: 'play',     icon: 'zoomies.spark', label: 'Play',     selected: false },
    { id: 'training', icon: 'training.paw',  label: 'Training', selected: false },
    { id: 'biting',   icon: 'ui.paw.filled', label: 'Biting',   selected: false },
  ];
  return (
    <Phone>
      <div className="pp-navbar">
        <NavbarAction align="left" ariaLabel="Back"><Icon name="chevron.left" size={28} color="var(--pp-text-link)" stroke={2} /></NavbarAction>
        <span className="pp-caption" style={{ color: 'var(--pp-text-tertiary)' }}>Step 4 of 5</span>
        <span style={{ width: 44 }} />
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

// 2.5 Plan Reveal — last step of the wizard.
// Chrome (review pass 3, P1): keep WIZARD chrome only — NO TabBar, NO FAB.
// First Today (2.6) is where the app chrome appears. Avoids "am I in onboarding
// or in the app" confusion at handoff.
function ScreenOnbPlanReveal() {
  return (
    <Phone>
      <div className="pp-navbar">
        <span style={{ width: 44 }} />
        <span className="pp-caption" style={{ color: 'var(--pp-text-tertiary)' }}>Step 5 of 5</span>
        <span style={{ width: 44 }} />
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
      <div style={{ padding: '12px 16px 24px' }}>
        <Button variant="primary" block>Start your first log</Button>
      </div>
    </Phone>
  );
}

// 2.6 First Log saved — first appearance of the app chrome.
// Celebration card IS the confirmation; the snackbar from earlier draft was a
// double-fire (review pass 3, P1). Snackbar Undo lives in steady-state Quick Log
// only, not in onboarding's celebration moment.
function ScreenOnbFirstLogPending() {
  return (
    <Phone>
      <TodayHeader date="Thursday · May 14" />
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px var(--pp-bottom-inset-fab)' }}>
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
      {/* No snackbar here — celebration card is the confirmation (review pass 3 P1) */}
      <TabBar active="today" />
      <FAB />
    </Phone>
  );
}

Object.assign(window, {
  ScreenOnbWelcome, ScreenOnbProfile, ScreenOnbTrackers, ScreenOnbPlanReveal, ScreenOnbFirstLogPending,
});
