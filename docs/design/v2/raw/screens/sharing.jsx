// PuppyPlan — Sharing screens (DESIGN.md §3.1 Family, §3.2 Sitter, §3.3 Trainer, §3.3.6 Revoked)
//
// Navbar actions are real <button>s via <NavbarAction> — 44pt tap target +
// keyboard focus + VoiceOver role. Audit commit 4 (review pass 3, P0).

function SimpleHeader({ title, left = 'Cancel', right }) {
  // String values map to text actions; an Icon node renders as-is inside the
  // tap target. Both paths go through NavbarAction so the geometry is identical.
  const renderSide = (val, side) => {
    if (val === '' || val == null) return <span style={{ width: 44, minHeight: 44 }} />;
    if (typeof val === 'string') {
      const bold = val === 'Save' || val === 'Send' || val === 'Done' || val === 'Continue' || val === 'Preview';
      return <NavbarAction align={side} bold={bold} ariaLabel={val}>{val}</NavbarAction>;
    }
    // Already a node (icon)
    return <NavbarAction align={side}>{val}</NavbarAction>;
  };
  return (
    <div className="pp-navbar" style={{ borderBottom: '1px solid var(--pp-stroke-hair)' }}>
      {renderSide(left, 'left')}
      <span className="pp-nav-title">{title}</span>
      {renderSide(right, 'right')}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// 6.1 Family list — owner view
// ──────────────────────────────────────────────────────────
function ScreenFamilyList() {
  return (
    <Phone>
      <SimpleHeader title="Family and access" left="Back" right="" />
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 32px' }}>
        <SectionHeader action="Invite">Members</SectionHeader>
        <List>
          <ListRow
            leading={<Avatar initial="Y" size="lg" tone="primary" />}
            title="You"
            subtitle="Owner · all access"
            trailing={<Pill tone="info" icon="person.solo">Owner</Pill>}
          />
          <ListRow
            leading={<Avatar initial="O" size="lg" tone="sunken" />}
            title="Caregiver A"
            subtitle="Active 4 min ago"
            trailing={<Pill tone="info" icon="person.cluster">Caregiver</Pill>}
            chevron
          />
        </List>

        <div style={{ height: 20 }} />
        <SectionHeader>Invites</SectionHeader>
        <List>
          <ListRow
            leading={<Avatar initial="D" size="lg" tone="sunken" />}
            title="caregiver-b@example.test"
            subtitle="Active through May 21"
            trailing={<Pill tone="warning">Pending</Pill>}
            chevron
          />
        </List>

        <div style={{ height: 24 }} />
        <Banner tone="info">You can close access at any time.</Banner>
      </div>
    </Phone>
  );
}

// ──────────────────────────────────────────────────────────
// 6.2 Family invite — role pick / scope confirm
// ──────────────────────────────────────────────────────────
function ScreenFamilyInvite() {
  return (
    <Phone>
      <SimpleHeader title="Invite" right="Send" />
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 24px' }}>
        <SectionHeader>Who you're inviting</SectionHeader>
        <Field value="caregiver-b@example.test" />

        <div style={{ height: 20 }} />
        <SectionHeader>Role</SectionHeader>
        <List>
          <ListRow
            leading={
              <div style={{ width: 22, height: 22, borderRadius: 999, border: '6px solid var(--pp-primary-600)', background: '#fff' }} />
            }
            title="Caregiver"
            subtitle="Can log events and add notes"
          />
          <ListRow
            leading={<div style={{ width: 22, height: 22, borderRadius: 999, border: '1.5px solid var(--pp-stroke-strong)', background: '#fff' }} />}
            title="Viewer"
            subtitle="View only"
          />
        </List>

        <div style={{ height: 20 }} />
        <SectionHeader>What the caregiver will see</SectionHeader>
        <Card>
          <div className="pp-callout" style={{ marginBottom: 8, color: 'var(--pp-text-secondary)' }}>This access includes:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Today and Puppy A\'s timeline', 'Log feedings, walks, potty breaks', 'Create reminders'].map(b => (
              <div key={b} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Icon name="check" size={16} color="var(--pp-success)" stroke={2.5} />
                <span className="pp-callout">{b}</span>
              </div>
            ))}
          </div>
          <div className="pp-divider" style={{ margin: '14px 0' }} />
          <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)' }}>
            Won't see: subscription billing, private notes
          </div>
        </Card>

        <div style={{ height: 16 }} />
        <Banner tone="info" icon="lock.shield">You can close access at any time.</Banner>
      </div>
    </Phone>
  );
}

// ──────────────────────────────────────────────────────────
// 6.3 Family invite — sent / pending
// ──────────────────────────────────────────────────────────
function ScreenFamilyInviteSent() {
  return (
    <Phone>
      <SimpleHeader title="Invite" left="Done" right="" />
      <div style={{ flex: 1, padding: '8px 16px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: 80, height: 80, borderRadius: 999,
          background: 'var(--pp-success-tint)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '32px 0 20px',
        }}>
          <Icon name="check" size={36} stroke={2.5} color="var(--pp-success)" />
        </div>
        <div className="pp-title-2" style={{ marginBottom: 6 }}>Invite sent</div>
        <div className="pp-body" style={{ color: 'var(--pp-text-secondary)', textAlign: 'center', marginBottom: 28 }}>
          caregiver-b@example.test · Caregiver · expires May 21
        </div>

        <div style={{ width: '100%' }}>
          <List>
            <ListRow leading={<Icon name="action.share" size={22} />} title="Copy link" chevron />
            <ListRow leading={<Icon name="undo" size={22} />} title="Send again" chevron />
            <ListRow leading={<Icon name="action.delete" size={22} color="var(--pp-danger)" />} title="Revoke invite" danger chevron />
          </List>
        </div>
      </div>
    </Phone>
  );
}

// ──────────────────────────────────────────────────────────
// 8.1 Trainer invite — scope selector (toggle rows w/ ScopeStripe)
// ──────────────────────────────────────────────────────────
function ScreenTrainerScope() {
  const scopes = [
    { title: 'Puppy profile', incl: 'name, age, selected photo', excl: 'weight, microchip, owner contact', on: true },
    { title: 'Daily routine summary', incl: 'feeding / walk / potty counts for the week, general time ranges', excl: 'exact times, notes', on: true },
    { title: 'Timeline for a range', incl: 'events of the selected types on the selected days', excl: 'free-text notes you didn\'t mark as shareable', on: false },
    { title: 'Training notes', incl: 'training session topic and duration, notes you marked as shareable', excl: 'private notes', on: true },
    { title: 'Health — brief summary', incl: 'entry name, status, date', excl: 'notes, vet contact, photos', on: false, defaultOff: true },
  ];
  return (
    <Phone>
      <SimpleHeader title="Trainer access" right="Continue" />
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 24px' }}>
        <div className="pp-body" style={{ color: 'var(--pp-text-secondary)', marginBottom: 20 }}>
          Choose what the trainer will see. Each item can be turned on and off separately.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {scopes.map(s => (
            <Card key={s.title} padding={0} style={{ overflow: 'hidden' }}>
              {/* ScopeStripe: 4pt accent stripe on left */}
              <div style={{ display: 'flex' }}>
                <div style={{ width: 4, background: s.on ? 'var(--pp-primary-500)' : 'var(--pp-stroke-strong)' }} />
                <div style={{ flex: 1, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div className="pp-headline">{s.title}</div>
                      {s.defaultOff && <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginTop: 2 }}>This item is off by default.</div>}
                    </div>
                    <Toggle on={s.on} />
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="pp-footnote"><span style={{ color: 'var(--pp-success)' }}>Includes: </span>{s.incl}</div>
                    <div className="pp-footnote"><span style={{ color: 'var(--pp-text-tertiary)' }}>Not included: </span>{s.excl}</div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Phone>
  );
}

// ──────────────────────────────────────────────────────────
// 8.2 Trainer preview — included / excluded
// ──────────────────────────────────────────────────────────
function ScreenTrainerPreview() {
  return (
    <Phone>
      <SimpleHeader title="Preview" right="Send" />
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 24px' }}>
        <div className="pp-title-2" style={{ marginBottom: 16 }}>Check what the trainer will see</div>

        <Card>
          <div className="pp-subheadline" style={{ color: 'var(--pp-success)', marginBottom: 10, fontWeight: 600 }}>This access includes:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <BulletRow icon="check" tone="success" title="Puppy profile" subtitle="Name, age, photo" />
            <BulletRow icon="check" tone="success" title="Daily routine summary" subtitle="7-day counts, general time ranges" />
            <BulletRow icon="check" tone="success" title="Training notes" subtitle="Topic, duration, shareable notes" />
          </div>
        </Card>

        <div style={{ height: 12 }} />
        <Card>
          <div className="pp-subheadline" style={{ color: 'var(--pp-text-secondary)', marginBottom: 10, fontWeight: 600 }}>Not included:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <BulletRow icon="close.x" tone="muted" title="Exact event times" />
            <BulletRow icon="close.x" tone="muted" title="Health" />
            <BulletRow icon="close.x" tone="muted" title="Owner and vet contacts" />
            <BulletRow icon="close.x" tone="muted" title="Private notes" />
          </div>
        </Card>

        <div style={{ height: 16 }} />
        <Field label="Send to" value="trainer@example.test" />
        <div style={{ height: 12 }} />
        <Field label="Expiry" value="30 days" trailing={<Icon name="chevron.down" size={18} color="var(--pp-text-tertiary)" />} />
        <div style={{ height: 12 }} />
        <Banner tone="info" icon="lock.shield">You can close access at any time.</Banner>
      </div>
    </Phone>
  );
}

function BulletRow({ icon, tone, title, subtitle }) {
  const colorMap = {
    success: 'var(--pp-success)',
    muted: 'var(--pp-text-tertiary)',
  };
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{
        width: 22, height: 22, borderRadius: 999,
        background: tone === 'success' ? 'var(--pp-success-tint)' : 'var(--pp-surface-sunken)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
      }}>
        <Icon name={icon} size={14} stroke={2.25} color={colorMap[tone]} />
      </div>
      <div style={{ flex: 1 }}>
        <div className="pp-callout" style={{ color: 'var(--pp-text-primary)' }}>{title}</div>
        {subtitle && <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginTop: 1 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// 8.3 Trainer accepted view (read-only)
// ──────────────────────────────────────────────────────────
function ScreenTrainerAccepted() {
  return (
    <Phone>
      <div className="pp-navbar" style={{ borderBottom: '1px solid var(--pp-stroke-hair)' }}>
        <span style={{ width: 28 }} />
        <span className="pp-nav-title">Puppy A</span>
        <span style={{ width: 28 }} />
      </div>
      <div style={{ padding: '4px 16px 12px' }}>
        <div className="pp-large-title" style={{ padding: 0 }}>Puppy A</div>
        <div className="pp-callout" style={{ color: 'var(--pp-text-tertiary)' }}>
          9 weeks · access from Anna
        </div>
        <div style={{
          marginTop: 12, padding: 12,
          background: 'var(--pp-info-tint)', borderRadius: 12,
        }}>
          <div className="pp-footnote" style={{ color: 'var(--pp-info)', lineHeight: '18px' }}>
            <Icon name="lock.shield" size={14} stroke={2} color="var(--pp-info)" style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
            This access includes: profile, routine summary, training notes. Active through Jun 14.
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 24px' }}>
        <SectionHeader>Routine summary (last 7 days)</SectionHeader>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SummaryRow label="Feedings" value="14" sub="2/day" />
            <SummaryRow label="Walks" value="21" sub="≈3/day" />
            <SummaryRow label="Potty" value="38" sub="breaks" />
          </div>
        </Card>

        <div style={{ height: 20 }} />
        <SectionHeader>Training notes</SectionHeader>
        <Card padding={0}>
          <div style={{ padding: 14 }}>
            <div className="pp-headline">May 13 · "Recall on long line"</div>
            <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginTop: 2 }}>15 min · indoor</div>
          </div>
          <div className="pp-divider" />
          <div style={{ padding: 14 }}>
            <div className="pp-headline">May 11 · "Loose-leash walking"</div>
            <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginTop: 2 }}>10 min · garden</div>
          </div>
        </Card>

        <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', textAlign: 'center', marginTop: 20 }}>
          View only. Only the owner can close access.
        </div>
      </div>
    </Phone>
  );
}

function SummaryRow({ label, value, sub }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span className="pp-callout" style={{ color: 'var(--pp-text-secondary)' }}>{label}</span>
      <span>
        <span className="pp-title-3 pp-mono">{value}</span>
        <span className="pp-footnote pp-mono" style={{ color: 'var(--pp-text-tertiary)', marginLeft: 6 }}>{sub}</span>
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// 10.1 Revoked / Expired — neutral
// ──────────────────────────────────────────────────────────
function ScreenRevokedExpired() {
  return (
    <Phone>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center' }}>
        <div style={{
          width: 96, height: 96, borderRadius: 999,
          background: 'var(--pp-surface-sunken)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 28,
        }}>
          <Icon name="lock.shield" size={42} stroke={1.5} color="var(--pp-text-tertiary)" />
        </div>
        <div className="pp-title-2" style={{ marginBottom: 10 }}>This access is no longer available</div>
        <div className="pp-body" style={{ color: 'var(--pp-text-secondary)', marginBottom: 32 }}>
          Contact the owner if you need new access.
        </div>
        <Button variant="primary">Got it</Button>
      </div>
    </Phone>
  );
}

Object.assign(window, {
  SimpleHeader, BulletRow,
  ScreenFamilyList, ScreenFamilyInvite, ScreenFamilyInviteSent,
  ScreenTrainerScope, ScreenTrainerPreview, ScreenTrainerAccepted,
  ScreenRevokedExpired,
});
