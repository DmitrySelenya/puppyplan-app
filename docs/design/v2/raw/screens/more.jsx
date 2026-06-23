// PuppyPlan — Reminders, More tab, Paywall (DESIGN.md §4.2, 4.4)

// ─── Reminders ────────────────────────────────────────────
function ScreenReminders() {
  return (
    <Phone>
      <SimpleHeader title="Reminders" left="More" right={<Icon name="action.add" size={26} color="var(--pp-text-link)" stroke={2} />} />
      <div className="pp-large-title">Reminders</div>
      <div style={{ padding: '4px 16px 12px' }}>
        <Segment options={['Active', 'Off']} value="Active" />
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px var(--pp-bottom-inset-fab)' }}>
        <SectionHeader>Feeding</SectionHeader>
        <List>
          <ListRow leading={<Icon name="feeding.bowl" size={22} />} title="Morning · 7:30 am" subtitle="Every day · sound on" trailing={<Toggle on={true} />} />
          <ListRow leading={<Icon name="feeding.bowl" size={22} />} title="Evening · 7:00 pm" subtitle="Every day · sound on" trailing={<Toggle on={true} />} />
        </List>
        <div style={{ height: 16 }} />
        <SectionHeader>Health</SectionHeader>
        <List>
          <ListRow leading={<Icon name="med.vaccine" size={22} />} title="DHPP booster · Jun 12" subtitle="One-time · 9:00 am" trailing={<Toggle on={true} />} />
        </List>
        <div style={{ height: 16 }} />
        <SectionHeader>Trusted sitter</SectionHeader>
        <List>
          <ListRow
            leading={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 36, borderRadius: 2, background: 'var(--pp-primary-500)' }} />
                <Icon name="ui.checkmark.seal" size={22} />
              </div>
            }
            title="Evening checklist · 7:00 pm"
            subtitle="3 items · sitter: Anya"
            trailing={<Toggle on={true} />}
          />
        </List>
        <div style={{ height: 16 }} />
        <SectionHeader>Not logged today</SectionHeader>
        <List>
          <ListRow
            leading={<Icon name="feeding.bowl" size={22} color="var(--pp-text-tertiary)" />}
            title="Feeding 12:30 pm · not logged"
            subtitle="You can move the time or turn the reminder off"
            trailing={<PillButton2>Mark done</PillButton2>}
          />
        </List>

        <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', textAlign: 'center', marginTop: 20 }}>
          Quiet hours — in Notification settings.
        </div>
      </div>
      <TabBar active="more" />
      {/* No FAB on Reminders — not a log surface (FAB policy, review pass 3 P0). */}
    </Phone>
  );
}

function PillButton2({ children }) {
  return (
    <span style={{
      padding: '8px 14px', borderRadius: 8,
      background: 'var(--pp-primary-600)', color: '#fff',
      fontSize: 13, fontWeight: 600,
    }}>{children}</span>
  );
}

// 12.4 Reminder push — iOS lock-screen style
function ScreenReminderPush() {
  return (
    <Phone>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', background: '#241D14', color: '#fff' }}>
        {/* Lock-screen time */}
        <div style={{ padding: '40px 16px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>Thursday, May 14</div>
          <div style={{ fontSize: 88, fontWeight: 300, letterSpacing: -2, lineHeight: 1, marginTop: 4 }}>7:30</div>
        </div>

        <div style={{ padding: '0 12px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            borderRadius: 18,
            padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 8,
                background: 'var(--pp-primary-600)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="ui.paw.filled" size={22} color="#fff" filled />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
                  <span style={{ textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: 600 }}>PUPPYPLAN</span>
                  <span>now</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>Feeding: 7:30 am</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                  A gentle start to Puppy A's day.
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  {['Done', 'Snooze 10', 'Skip'].map(a => (
                    <span key={a} style={{
                      padding: '7px 12px',
                      background: 'rgba(255,255,255,0.12)',
                      borderRadius: 999,
                      fontSize: 12, fontWeight: 600,
                    }}>{a}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Phone>
  );
}

// ─── More tab ─────────────────────────────────────────────
function ScreenMore() {
  return (
    <Phone>
      <div className="pp-navbar">
        <span style={{ width: 28 }} />
        <span className="pp-nav-title">More</span>
        <span style={{ width: 28 }} />
      </div>
      <div className="pp-large-title">More</div>
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px 96px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--pp-surface-raised)', border: '1px solid var(--pp-stroke)', borderRadius: 12, marginBottom: 20 }}>
          <Avatar initial="L" size="xl" tone="accent" />
          <div style={{ flex: 1 }}>
            <div className="pp-title-3">Puppy A</div>
            <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)' }}>9 weeks · Border Collie mix</div>
          </div>
          <Icon name="chevron.right" size={20} color="var(--pp-text-tertiary)" />
        </div>

        <SectionHeader>Puppy</SectionHeader>
        <List>
          <ListRow leading={<Icon name="person.solo" size={22} />} title="Puppy profile" chevron />
          <ListRow leading={<Icon name="action.add" size={22} />} title="Quick trackers" subtitle="5 of 5 selected" chevron />
        </List>

        <div style={{ height: 16 }} />
        <SectionHeader>Sharing</SectionHeader>
        <List>
          <ListRow leading={<Icon name="person.cluster" size={22} />} title="Family" subtitle="2 members" chevron />
          <ListRow leading={<Icon name="person.trainer" size={22} />} title="Trainer / sitter" subtitle="1 active link" chevron />
        </List>

        <div style={{ height: 16 }} />
        <SectionHeader>Records and notifications</SectionHeader>
        <List>
          <ListRow leading={<Icon name="ui.doc.text" size={22} />} title="Timeline" chevron />
          <ListRow leading={<Icon name="ui.bell" size={22} />} title="Reminders" chevron />
          <ListRow leading={<Icon name="ui.gear" size={22} />} title="Notifications" chevron />
        </List>

        <div style={{ height: 16 }} />
        <SectionHeader>Privacy</SectionHeader>
        <List>
          <ListRow leading={<Icon name="lock.shield" size={22} />} title="Data and account" chevron />
        </List>

        <div style={{ height: 16 }} />
        <SectionHeader>Support</SectionHeader>
        <List>
          <ListRow leading={<Icon name="ui.book" size={22} />} title="Help" chevron />
          <ListRow leading={<Icon name="info.circle" size={22} />} title="About" subtitle="Version 1.0.0" chevron />
        </List>

        <div style={{ height: 16 }} />
        <List>
          <ListRow
            leading={<Icon name="ui.checkmark.seal" size={22} color="var(--pp-primary-600)" />}
            title="PuppyPlan Plus"
            subtitle="Extra features for the puppy stage"
            chevron
          />
        </List>
      </div>
      <TabBar active="more" />
      {/* No FAB on More — read-only nav surface (FAB policy, review pass 3 P0). */}
    </Phone>
  );
}

// 14.5 Delete confirm — two states (review pass 3, P2):
//   default — input EMPTY, Delete button disabled. This is the protective state
//   that the user lands on first and that the dev builds first.
//   typed   — input has «DELETE», button enabled. Confirms the unlock pattern.
// The artboard set in PuppyPlan.html shows both.
function ScreenDeleteConfirm({ state = 'default' }) {
  const typed = state === 'typed';
  return (
    <Phone>
      <div style={{ flex: 1, background: 'rgba(40,30,22,0.34)' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'var(--pp-surface-raised)',
        borderRadius: '16px 16px 0 0',
        padding: '0 16px 28px',
        boxShadow: '0 -4px 16px rgba(70,50,30,0.10)',
      }}>
        <div className="pp-sheet-handle" />
        <div className="pp-title-2" style={{ marginBottom: 8 }}>Delete account</div>
        <div className="pp-body" style={{ color: 'var(--pp-text-secondary)', marginBottom: 20 }}>
          This will delete your profile, your puppy's records, and the links you've shared. This cannot be undone.
        </div>
        <div className="pp-subheadline" style={{ color: 'var(--pp-text-secondary)', marginBottom: 6 }}>type the word "DELETE"</div>
        <Field value={typed ? 'DELETE' : ''} placeholder="DELETE" focused={typed} />
        <div style={{ height: 16 }} />
        <Button variant="destructive-filled" block disabled={!typed}>Delete</Button>
        <div style={{ textAlign: 'center', padding: '14px 0 4px' }}>
          <TextLink>Cancel</TextLink>
        </div>
      </div>
    </Phone>
  );
}

// ─── Paywall (§4.4.7) ─────────────────────────────────────
function ScreenPaywall() {
  return (
    <Phone>
      <SimpleHeader title="" left="Close" right="" />
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 24px 24px' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'var(--pp-primary-50)',
          border: '1px solid var(--pp-primary-200)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '8px 0 16px',
        }}>
          <Icon name="ui.checkmark.seal" size={32} color="var(--pp-primary-600)" stroke={2} />
        </div>
        <div className="pp-display" style={{ fontSize: 32, lineHeight: '38px', marginBottom: 8 }}>PuppyPlan Plus</div>
        <div className="pp-body" style={{ color: 'var(--pp-text-secondary)', marginBottom: 24 }}>
          Extra features for your puppy's first 90 days at home.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {[
            'Unlimited shared links',
            'Extended health export',
            'Multiple puppies in one account',
          ].map(f => (
            <div key={f} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Icon name="check" size={20} color="var(--pp-success)" stroke={2.5} />
              <span className="pp-callout">{f}</span>
            </div>
          ))}
        </div>

        {/* Single visual language for both plans (review pass 3, P1):
            radio control on both, selected = filled radio + accent border + «Best value» pill.
            Previous draft mixed radio (Monthly) with framed badge (Yearly) — read as
            two different controls. */}
        <div role="radiogroup" aria-label="Choose a plan" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <PlanCard label="Yearly" sub="€49.99 · save 53%" selected badge="Best value" />
          <PlanCard label="Monthly" sub="€8.99" />
        </div>

        <Button variant="primary" block>Subscribe</Button>
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <TextLink>Restore purchases</TextLink>
        </div>
        <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', textAlign: 'center' }}>
          Auto-renews. You can cancel in the App Store.
        </div>
      </div>
    </Phone>
  );
}

function PlanCard({ label, sub, selected, badge, recommended }) {
  // Unified single visual language for both plans (review pass 3, P1).
  // `selected` is the canonical prop; `recommended` kept for back-compat.
  const isSel = selected || recommended;
  return (
    <div
      role="radio"
      aria-checked={isSel}
      tabIndex={0}
      style={{
        padding: 16,
        borderRadius: 12,
        background: isSel ? 'var(--pp-primary-50)' : 'var(--pp-surface-raised)',
        border: isSel ? '2px solid var(--pp-primary-500)' : '1px solid var(--pp-stroke)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'relative', cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Radio control — same control on both rows */}
        <div style={{
          width: 22, height: 22, borderRadius: 999,
          border: isSel ? '6px solid var(--pp-primary-600)' : '1.5px solid var(--pp-stroke-strong)',
          background: '#fff', flex: '0 0 auto',
        }} />
        <div>
          <div className="pp-headline" style={{ color: isSel ? 'var(--pp-primary-800)' : 'var(--pp-text-primary)' }}>{label}</div>
          <div className="pp-footnote" style={{ color: isSel ? 'var(--pp-primary-700)' : 'var(--pp-text-tertiary)', marginTop: 2 }}>{sub}</div>
        </div>
      </div>
      {badge && (
        <div style={{
          padding: '4px 10px', borderRadius: 999,
          background: 'var(--pp-primary-600)', color: '#fff',
          fontSize: 11, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase',
        }}>{badge}</div>
      )}
    </div>
  );
}

Object.assign(window, {
  ScreenReminders, ScreenReminderPush, ScreenMore, ScreenDeleteConfirm, ScreenPaywall,
});
