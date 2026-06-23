// PuppyPlan — Sitter Mode (DESIGN.md §3.2)

// ──────────────────────────────────────────────────────────
// 7.1 Enable Sitter Mode — owner picks caregiver + window
// ──────────────────────────────────────────────────────────
function ScreenSitterEnable({ state = 'ready' }) {
  const noCaregiver  = state === 'no-caregiver';
  const pendingInvite = state === 'pending-invite';
  const ready = state === 'ready';
  return (
    <Phone>
      <SimpleHeader title="Sitter mode" left="Back" right="" />
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 24px' }}>
        <div className="pp-title-2" style={{ marginBottom: 6 }}>Hand off to a sitter for a window of time</div>
        <div className="pp-callout" style={{ color: 'var(--pp-text-secondary)', marginBottom: 20 }}>
          Caregiver A will see a checklist and get reminders.
        </div>

        {noCaregiver && (
          <Card style={{ background: 'var(--pp-surface-sunken)', borderColor: 'transparent', padding: 18 }}>
            <div className="pp-headline" style={{ marginBottom: 4 }}>First invite a caregiver</div>
            <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', marginBottom: 12 }}>
              Sitter mode extends an existing caregiver.
            </div>
            <Button variant="primary">Invite a caregiver</Button>
          </Card>
        )}

        {!noCaregiver && (
          <>
            <SectionHeader>Who</SectionHeader>
            <List>
              <ListRow
                leading={<Avatar initial="O" size="lg" tone="primary" />}
                title="Caregiver A"
                subtitle={pendingInvite ? "Waiting to accept the invite" : "Caregiver"}
                trailing={
                  pendingInvite
                    ? <Pill tone="warning">Pending</Pill>
                    : <div style={{ width: 22, height: 22, borderRadius: 999, border: '6px solid var(--pp-primary-600)', background: '#fff' }} />
                }
              />
              <ListRow
                leading={<Avatar initial="D" size="lg" tone="sunken" />}
                title="Dmitry"
                subtitle="Caregiver"
                trailing={<div style={{ width: 22, height: 22, borderRadius: 999, border: '1.5px solid var(--pp-stroke-strong)', background: '#fff' }} />}
              />
            </List>

            <div style={{ height: 20 }} />
            <SectionHeader>From → through</SectionHeader>
            <Card padding={0}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
                <span className="pp-callout" style={{ color: 'var(--pp-text-secondary)' }}>Start</span>
                <span className="pp-callout">May 17 · 18:00</span>
              </div>
              <div className="pp-divider" />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
                <span className="pp-callout" style={{ color: 'var(--pp-text-secondary)' }}>End</span>
                <span className="pp-callout">May 19 · 09:00</span>
              </div>
            </Card>
            <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginTop: 6, paddingLeft: 4 }}>
              Up to 14 days · sitter mode ends automatically.
            </div>

            <div style={{ height: 20 }} />
            <SectionHeader>Checklist</SectionHeader>
            <List>
              {[
                { label: 'Feedings (3/day)',  on: true },
                { label: 'Walks (3/day)',     on: true },
                { label: 'Potty — mark outings', on: true },
                { label: 'Medication',        on: false },
                { label: 'Training',          on: false },
              ].map(c => (
                <ListRow
                  key={c.label}
                  leading={
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: c.on ? 'var(--pp-primary-600)' : 'transparent',
                      border: c.on ? 'none' : '1.5px solid var(--pp-stroke-strong)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {c.on && <Icon name="check" size={14} stroke={3} color="#fff" />}
                    </div>
                  }
                  title={c.label}
                />
              ))}
            </List>

            <div style={{ height: 20 }} />
            <SectionHeader>What the sitter will see</SectionHeader>
            <Card>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <BulletRow icon="check" tone="success" title="Today and the timeline" />
                <BulletRow icon="check" tone="success" title="Checklist and reminders on their device" />
              </div>
              <div className="pp-divider" style={{ margin: '12px 0' }} />
              <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)' }}>
                Won't see: subscription, personal settings, other shared scopes (trainer, cards)
              </div>
            </Card>

            <div style={{ height: 16 }} />
            <Banner tone="info" icon="lock.shield">You can end sitter mode at any time.</Banner>
          </>
        )}
      </div>

      {!noCaregiver && (
        <div style={{ padding: '12px 16px 24px', background: 'var(--pp-surface-base)', borderTop: '1px solid var(--pp-stroke-hair)' }}>
          {pendingInvite && (
            <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', textAlign: 'center', marginBottom: 8 }}>
              Waiting for Caregiver A to accept the invite.
            </div>
          )}
          <Button variant="primary" block disabled={pendingInvite}>Turn on sitter mode</Button>
        </div>
      )}
    </Phone>
  );
}

// ──────────────────────────────────────────────────────────
// 7.2 Sitter checklist — sitter-side view
// ──────────────────────────────────────────────────────────
function ScreenSitterChecklist() {
  return (
    <Phone>
      <div className="pp-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar initial="L" size="md" tone="accent" />
          <div>
            <div className="pp-headline" style={{ lineHeight: '20px' }}>Puppy A</div>
            <div className="pp-caption" style={{ color: 'var(--pp-text-tertiary)' }}>9 weeks</div>
          </div>
        </div>
        <Pill tone="warning" icon="ui.checkmark.seal" style={{ background: '#F6ECD8', color: '#7A4F12' }}>Sitter</Pill>
      </div>

      {/* Deadline strip — amber */}
      <div style={{
        margin: '0 16px 8px',
        background: 'var(--pp-warning-tint)',
        borderRadius: 12,
        padding: '10px 12px',
        display: 'flex', alignItems: 'center', gap: 10,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'var(--pp-warning)' }} />
        <Icon name="status.template" size={18} color="var(--pp-warning)" stroke={2} />
        <span className="pp-callout" style={{ color: 'var(--pp-warning)', flex: 1, paddingLeft: 4 }}>
          Sitter mode through May 19, 09:00
        </span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 24px' }}>
        <SectionHeader>Now</SectionHeader>
        <Card style={{ background: 'var(--pp-primary-50)', borderColor: 'var(--pp-primary-200)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="feeding.walk" size={26} color="var(--pp-primary-700)" />
            <div style={{ flex: 1 }}>
              <div className="pp-headline" style={{ color: 'var(--pp-primary-800)' }}>Walk in 20 minutes</div>
              <div className="pp-footnote" style={{ color: 'var(--pp-primary-700)', marginTop: 2 }}>Scheduled · 18:30</div>
            </div>
          </div>
        </Card>

        <div style={{ height: 20 }} />
        <SectionHeader>Still today</SectionHeader>
        <List>
          {[
            { icon: 'feeding.bowl',  label: 'Feeding · 18:00',  done: false },
            { icon: 'feeding.walk',  label: 'Walk · 18:30',     done: false },
            { icon: 'feeding.bowl',  label: 'Feeding · 22:00',  done: false },
          ].map(c => (
            <ListRow
              key={c.label}
              leading={
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  border: '1.75px solid var(--pp-stroke-strong)',
                  background: '#fff',
                }} />
              }
              title={c.label}
              trailing={<Icon name={c.icon} size={20} color="var(--pp-text-tertiary)" />}
            />
          ))}
        </List>

        <div style={{ height: 20 }} />
        <SectionHeader>Done</SectionHeader>
        <List>
          {[
            { icon: 'feeding.walk', label: 'Walk 13:00 — Caregiver A' },
            { icon: 'feeding.bowl', label: 'Feeding 12:00 — Caregiver A' },
          ].map(c => (
            <ListRow
              key={c.label}
              leading={
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: 'var(--pp-primary-600)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="check" size={15} stroke={3} color="#fff" />
                </div>
              }
              title={<span style={{ color: 'var(--pp-text-tertiary)', textDecoration: 'line-through' }}>{c.label}</span>}
              trailing={<Icon name={c.icon} size={20} color="var(--pp-text-tertiary)" />}
            />
          ))}
        </List>

        <div style={{ height: 12 }} />
        <div style={{ textAlign: 'center', padding: 8 }}>
          <TextLink>Open the timeline</TextLink>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 28 }}>
        <Snackbar>Done. Dmitry has been notified.</Snackbar>
      </div>
    </Phone>
  );
}

// ──────────────────────────────────────────────────────────
// 7.3 Owner status card — sitter mode running
// ──────────────────────────────────────────────────────────
function ScreenSitterOwnerStatus() {
  return (
    <Phone>
      <div className="pp-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar initial="L" size="md" tone="accent" />
          <div>
            <div className="pp-headline" style={{ lineHeight: '20px' }}>Puppy A</div>
            <div className="pp-caption" style={{ color: 'var(--pp-text-tertiary)' }}>9 weeks</div>
          </div>
        </div>
        <Icon name="ui.bell" size={24} />
      </div>
      <div className="pp-large-title">Today</div>
      <div className="pp-callout" style={{ padding: '0 16px 12px', color: 'var(--pp-text-tertiary)' }}>
        Saturday · May 18
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 96px' }}>
        {/* Sitter status card */}
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex' }}>
            <div style={{ width: 4, background: 'var(--pp-warning)' }} />
            <div style={{ flex: 1, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Pill tone="warning" icon="ui.checkmark.seal">Sitter mode</Pill>
                <span className="pp-caption" style={{ color: 'var(--pp-text-tertiary)' }}>active</span>
              </div>
              <div className="pp-title-3" style={{ marginBottom: 4 }}>Caregiver A · through May 19, 09:00</div>
              <div className="pp-callout" style={{ color: 'var(--pp-text-secondary)', marginBottom: 14 }}>
                Latest: Caregiver A fed Puppy A — 6 min ago
              </div>

              {/* Progress */}
              <div className="pp-footnote pp-tabular-num" style={{ color: 'var(--pp-text-secondary)', marginBottom: 6 }}>
                <b>3 of 6</b> · today
              </div>
              <div
                role="progressbar"
                aria-valuenow={3}
                aria-valuemin={0}
                aria-valuemax={6}
                aria-label="3 of 6, 50 percent"
                style={{
                  width: '100%', height: 6, borderRadius: 999,
                  background: 'var(--pp-stroke)', overflow: 'hidden',
                }}
              >
                <div style={{ width: '50%', height: '100%', background: 'var(--pp-warning)' }} />
              </div>

              <div style={{ height: 14 }} />
              <Button variant="secondary" block>Open details</Button>
            </div>
          </div>
        </Card>

        <div style={{ height: 20 }} />
        <SectionHeader>Today's plan</SectionHeader>
        <List>
          <ListRow leading={<Icon name="feeding.bowl" size={22} />} title="Feeding · 18:00" subtitle="Coming up" chevron />
          <ListRow leading={<Icon name="feeding.walk" size={22} />} title="Walk · 18:30" subtitle="Coming up" chevron />
        </List>

        <div style={{ height: 12 }} />
        <ActivityStrip pulse>Caregiver A · 3 events in the last hour</ActivityStrip>
      </div>

      <TabBar active="today" />
      <FAB />
    </Phone>
  );
}

// ──────────────────────────────────────────────────────────
// 7.4 Exit sitter mode — confirm sheet
// ──────────────────────────────────────────────────────────
function ScreenSitterExit() {
  return (
    <Phone>
      <div style={{ flex: 1, background: 'rgba(26,26,24,0.32)' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'var(--pp-surface-raised)',
        borderRadius: '16px 16px 0 0',
        padding: '0 16px 28px',
        boxShadow: 'var(--pp-elev-2)',
      }}>
        <div className="pp-sheet-handle" />
        <div className="pp-title-2" style={{ marginBottom: 8 }}>End sitter mode?</div>
        <div className="pp-body" style={{ color: 'var(--pp-text-secondary)', marginBottom: 20 }}>
          Caregiver A will stay on as a caregiver and can still log events, but without the checklist
          and without sending you completion updates.
        </div>
        <Button variant="destructive-filled" block>End sitter mode</Button>
        <div style={{ textAlign: 'center', padding: '14px 0 4px' }}>
          <TextLink>Cancel</TextLink>
        </div>
      </div>
    </Phone>
  );
}

Object.assign(window, {
  ScreenSitterEnable, ScreenSitterChecklist, ScreenSitterOwnerStatus, ScreenSitterExit,
});
