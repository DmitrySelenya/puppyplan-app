// PuppyPlan — Shareable Puppy Cards (DESIGN.md §3.4)

// ──────────────────────────────────────────────────────────
// 9.1 Card builder — choose what to include
// ──────────────────────────────────────────────────────────
function ScreenCardBuilder({ state = 'default' }) {
  const empty = state === 'empty';
  const healthOn = state === 'health-on';
  const items = [
    { id: 'name',     label: 'Name and age',        on: !empty,    sub: 'Puppy A · 9 weeks' },
    { id: 'photo',    label: 'Photo',               on: !empty,    sub: 'Tap to choose' },
    { id: 'breed',    label: 'Breed',               on: !empty,    sub: 'Border Collie mix' },
    { id: 'weight',   label: 'Weight',              on: false,     sub: 'Not added yet' },
    { id: 'birth',    label: 'Date of birth',       on: false },
    { id: 'chip',     label: 'Microchip (number)',  on: false },
    { id: 'vaccines', label: 'Vaccines — latest',   on: healthOn,  health: true },
    { id: 'owner',    label: 'Owner contact',       on: false },
  ];

  return (
    <Phone>
      <SimpleHeader title="Puppy A's card" left="Back" right="Preview" />
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px 24px' }}>
        <div className="pp-title-2" style={{ marginBottom: 6 }}>Choose what to include</div>
        <div className="pp-callout" style={{ color: 'var(--pp-text-secondary)', marginBottom: 20 }}>
          Private notes are never included.
        </div>

        <List>
          {items.map(it => (
            <ListRow
              key={it.id}
              leading={
                <div style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: it.on ? 'var(--pp-primary-600)' : 'transparent',
                  border: it.on ? 'none' : '1.5px solid var(--pp-stroke-strong)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {it.on && <Icon name="check" size={14} stroke={3} color="#fff" />}
                </div>
              }
              title={it.label}
              subtitle={it.sub}
              trailing={it.health && it.on ? <Pill tone="warning" icon="info.circle">Statuses + dates only</Pill> : null}
            />
          ))}
        </List>

        {healthOn && (
          <>
            <div style={{ height: 12 }} />
            <Banner tone="warning" icon="info.circle">
              Only statuses and dates will be included. No notes, no clinic contacts.
            </Banner>
          </>
        )}

        <div style={{ height: 16 }} />
        <Banner tone="info" icon="lock.shield">Private notes are never included in a card.</Banner>
      </div>
      <div style={{ padding: '12px 16px 24px', background: 'var(--pp-surface-base)', borderTop: '1px solid var(--pp-stroke-hair)' }}>
        {empty && (
          <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', textAlign: 'center', marginBottom: 8 }}>
            Choose at least one field.
          </div>
        )}
        <Button variant="primary" block disabled={empty}>Preview</Button>
      </div>
    </Phone>
  );
}

// ──────────────────────────────────────────────────────────
// 9.2 Card preview — rendered card (3:4)
// ──────────────────────────────────────────────────────────
function ScreenCardPreview() {
  return (
    <Phone>
      <SimpleHeader title="Preview" left="Back" right="" />
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 24px 24px', display: 'flex', flexDirection: 'column' }}>
        {/* Rendered card */}
        <div
          aria-label="Puppy A's shareable card. Border Collie mix. 9 weeks. Vaccines: DHPP April 12, Rabies May 5."
          style={{
            width: '100%',
            aspectRatio: '3 / 4',
            borderRadius: 20,
            background: 'var(--pp-surface-raised)',
            boxShadow: '0 12px 32px rgba(70,50,30,0.10), 0 0 0 1px var(--pp-stroke)',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Photo area */}
          <div style={{
            flex: '0 0 56%',
            background: `radial-gradient(ellipse at top, var(--pp-accent-100), var(--pp-surface-sunken))`,
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          {/* Photo placeholder (not a giant initial). Review pass 3, P2:
             the «L» avatar at 56px read as sketchy. Use the same paw-illustration
             treatment as in `states.jsx > empty-first-run`. Once user picks a
             photo, this whole block is replaced with the image. */}
          <div
            role="img"
            aria-label="Photo placeholder. Tap on the previous screen to choose."
            style={{
              width: 132, height: 132, borderRadius: 999,
              background: 'var(--pp-accent-100)',
              border: '1px dashed var(--pp-accent-300)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 6,
              color: 'var(--pp-accent-700)',
            }}
          >
            <Icon name="ui.paw.filled" size={40} color="var(--pp-accent-500)" filled />
            <span className="pp-caption" style={{ color: 'var(--pp-accent-700)', fontSize: 11, letterSpacing: 0.3, textTransform: 'uppercase', fontWeight: 600 }}>
              Add photo
            </span>
          </div>
          </div>

          {/* Info */}
          <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="pp-display" style={{ fontSize: 28, lineHeight: '32px', marginBottom: 2 }}>Puppy A</div>
            <div className="pp-callout" style={{ color: 'var(--pp-text-secondary)', marginBottom: 14 }}>
              Border Collie mix · 9 weeks
            </div>

            <div className="pp-caption" style={{ color: 'var(--pp-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Vaccines
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
              <div className="pp-footnote pp-tabular-num">• DHPP — Apr 12</div>
              <div className="pp-footnote pp-tabular-num">• Rabies — May 5</div>
            </div>

            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="ui.paw.filled" size={14} color="var(--pp-primary-600)" filled />
              <span className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', letterSpacing: 0.3 }}>PuppyPlan</span>
            </div>
          </div>
        </div>

        <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', textAlign: 'center', margin: '16px 0 12px' }}>
          This is everything the recipient will see.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button variant="primary" block>Share</Button>
          <Button variant="secondary" block>Edit</Button>
        </div>
      </div>
    </Phone>
  );
}

// ──────────────────────────────────────────────────────────
// 9.3 Share options — bottom sheet, two trade-offs
// ──────────────────────────────────────────────────────────
function ScreenCardShareSheet() {
  return (
    <Phone>
      <div style={{ flex: 1, background: 'rgba(40,30,22,0.34)' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'var(--pp-surface-raised)',
        borderRadius: '16px 16px 0 0',
        padding: '0 16px 28px',
        boxShadow: 'var(--pp-elev-2)',
      }}>
        <div className="pp-sheet-handle" />
        <div className="pp-title-2" style={{ marginBottom: 16 }}>How to share</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card style={{ padding: 16, border: '2px solid var(--pp-primary-500)', background: 'var(--pp-primary-50)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Icon name="lock.shield" size={20} color="var(--pp-primary-700)" stroke={2} />
              <div className="pp-headline" style={{ color: 'var(--pp-primary-800)' }}>Revocable link</div>
            </div>
            <div className="pp-footnote" style={{ color: 'var(--pp-primary-700)' }}>
              Recipient opens it online. You can close access at any time. Expiry is required.
            </div>
          </Card>
          <Card style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Icon name="ui.doc.text" size={20} color="var(--pp-text-primary)" stroke={2} />
              <div className="pp-headline">Image / file</div>
            </div>
            <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)' }}>
              A snapshot of the card. Once sent, it can't be revoked.
            </div>
          </Card>
        </div>

        <div style={{ height: 16 }} />
        <Button variant="primary" block>Create link</Button>
        <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
          <TextLink>Cancel</TextLink>
        </div>
      </div>
    </Phone>
  );
}

// ──────────────────────────────────────────────────────────
// 9.4 Shared cards list — active + history, with overflow
// ──────────────────────────────────────────────────────────
function ScreenCardsList() {
  return (
    <Phone>
      <SimpleHeader title="Shared cards" left="More" right={<Icon name="action.add" size={26} color="var(--pp-text-link)" />} />
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px 24px' }}>
        <SectionHeader>Active</SectionHeader>
        <List>
          <ListRow
            leading={<Icon name="ui.info.card" size={22} color="var(--pp-primary-700)" />}
            title="Card for the vet"
            subtitle="Active through May 24 · revocable"
            trailing={<Icon name="more.h" size={20} color="var(--pp-text-tertiary)" />}
          />
          <ListRow
            leading={<Icon name="ui.info.card" size={22} color="var(--pp-primary-700)" />}
            title="Card for the school"
            subtitle="Expires in 2 days · revocable"
            trailing={<Pill tone="warning" icon="info.circle">Soon</Pill>}
            chevron
          />
        </List>

        <div style={{ height: 20 }} />
        <SectionHeader>History</SectionHeader>
        <List>
          <ListRow
            leading={<Icon name="ui.info.card" size={22} color="var(--pp-text-tertiary)" />}
            title="Card for grooming"
            subtitle="Access closed May 12"
            chevron
          />
          <ListRow
            leading={<Icon name="ui.info.card" size={22} color="var(--pp-text-tertiary)" />}
            title="Snapshot · Caregiver A"
            subtitle="Sent May 9 · can't be revoked"
            chevron
          />
        </List>

        <div style={{ height: 16 }} />
        <Banner tone="info" icon="lock.shield">
          Anyone with the link sees the fields you chose. Expiry and revoke are always on.
        </Banner>
      </div>
      <TabBar active="more" />
    </Phone>
  );
}

Object.assign(window, {
  ScreenCardBuilder, ScreenCardPreview, ScreenCardShareSheet, ScreenCardsList,
});
